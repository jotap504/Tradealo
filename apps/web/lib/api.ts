import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_URL } from './constants';
import type {
  User,
  Listing,
  ListingImage,
  Category,
  TokenPack,
  WalletBalance,
  WalletTransaction,
  Notification,
  KycStatus,
  Review,
  Conversation,
  Message,
  Bid,
  ListingQuestion,
  LiveChatMessage,
  PaginatedResponse,
  SystemConfig,
  AdminStats,
} from '@/types';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let pendingRequests: Array<(token: boolean) => void> = [];

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    // Unwrap standardized { success: true, data: T } response
    if (res.data && res.data.success === true && res.data.data !== undefined) {
      const unwrapped = res.data.data;

      // Persist tokens as soon as they arrive from any auth endpoint
      if (typeof window !== 'undefined' && unwrapped) {
        if (unwrapped.accessToken) {
          localStorage.setItem('accessToken', unwrapped.accessToken);
        }
        if (unwrapped.refreshToken) {
          localStorage.setItem('refreshToken', unwrapped.refreshToken);
        }
        if (unwrapped.user) {
          localStorage.setItem('authUser', JSON.stringify(unwrapped.user));
        }
      }

      return { ...res, data: unwrapped };
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const errorData = error.response?.data as {
      success?: boolean;
      error?: { message?: string };
      message?: string;
    };

    // Normalize error message from { success: false, error: { message } }
    if (errorData?.success === false && errorData?.error?.message) {
      // Inject message into data for pages expecting err.response.data.message
      errorData.message = errorData.error.message;
    }

    if (
      status === 401 &&
      !original?._retry &&
      !original?.url?.includes('/auth/')
    ) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((ok) => {
            if (ok) resolve(apiClient(original));
            else reject(error);
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (!refreshToken) throw new Error('No refresh token');

        const res = await apiClient.post('/auth/refresh', { refreshToken });
        const newToken = res.data?.accessToken ?? res.data?.data?.accessToken;

        if (typeof window !== 'undefined' && newToken) {
          localStorage.setItem('accessToken', newToken);
        }

        pendingRequests.forEach((cb) => cb(true));
        pendingRequests = [];
        return apiClient(original);
      } catch (refreshErr) {
        pendingRequests.forEach((cb) => cb(false));
        pendingRequests = [];
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const path = window.location.pathname;
          if (
            !path.startsWith('/login') &&
            !path.startsWith('/register') &&
            !path.startsWith('/admin/login')
          ) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.get<T>(url, config);
  return r.data;
}
async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await apiClient.post<T>(url, body, config);
  return r.data;
}
async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await apiClient.patch<T>(url, body, config);
  return r.data;
}
async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const r = await apiClient.delete<T>(url, config);
  return r.data;
}

export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
}

export const auth = {
  login: async (payload: LoginPayload) => {
    const res = await post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', payload);
    if (typeof window !== 'undefined') {
      if (res.accessToken) localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    }
    return res;
  },
  register: async (payload: RegisterPayload) => {
    const res = await post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', payload);
    if (typeof window !== 'undefined') {
      if (res.accessToken) localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    }
    return res;
  },
  logout: async () => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      await post<{ ok: true }>('/auth/logout', { refreshToken });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  },
  refreshToken: async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    const res = await post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
    if (typeof window !== 'undefined') {
      if (res.accessToken) localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    }
    return res;
  },
  getMe: () => get<User>('/auth/me'),
};

export interface ListingsQuery {
  q?: string;
  categoryId?: string;
  province?: string;
  condition?: string;
  saleType?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  cursor?: string;
  limit?: number;
  isCollectible?: boolean;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'reputation';
}

export const listings = {
  getListings: (params: ListingsQuery = {}) =>
    get<PaginatedResponse<Listing>>('/listings', { params }),
  getListing: (id: string) => get<Listing>(`/listings/${id}`),
  createListing: (payload: Partial<Listing>) =>
    post<Listing>('/listings', payload),
  updateListing: (id: string, payload: Partial<Listing>) =>
    patch<Listing>(`/listings/${id}`, payload),
  deleteListing: (id: string) => del<{ ok: true }>(`/listings/${id}`),
  getMyListings: (params: { status?: string } = {}) =>
    get<PaginatedResponse<Listing>>('/listings/me', { params }),
  publishListing: (id: string, payload: { type: string; durationDays: number }) =>
    post<Listing>(`/listings/${id}/publish`, payload),
  renewListing: (id: string, durationDays: number) =>
    post<Listing>(`/listings/${id}/renew`, { durationDays }),
  contactSeller: (id: string, payload: { message: string }) =>
    post<{ conversationId: string }>(`/listings/${id}/contact`, payload),
  buyNow: (id: string) =>
    post<{ conversationId: string }>(`/listings/${id}/buy`),
  placeBid: (id: string, payload: { amount: number }) =>
    post<{ bid: Bid; instantBuy: boolean; conversationId?: string }>(`/listings/${id}/bids`, payload),
  getBids: (id: string) =>
    get<Bid[]>(`/listings/${id}/bids`),
  getQuestions: (id: string) =>
    get<ListingQuestion[]>(`/listings/${id}/questions`),
  askQuestion: (id: string, question: string) =>
    post<ListingQuestion>(`/listings/${id}/questions`, { question }),
  answerQuestion: (id: string, questionId: string, answer: string) =>
    post<ListingQuestion>(`/listings/${id}/questions/${questionId}/answer`, { answer }),
};

export const categories = {
  getCategories: () => get<Category[]>('/categories'),
  getCategory: (id: string) => get<Category>(`/categories/${id}`),
};

export const wallet = {
  getBalance: () => get<WalletBalance>('/wallet/balance'),
  getTransactions: (params: { cursor?: string; limit?: number } = {}) =>
    get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', { params }),
  getPacks: () => get<TokenPack[]>('/wallet/token-packs'),
  createPayment: (packId: string) =>
    post<{ initPoint: string; preferenceId: string }>(
      '/payments/preferences',
      { packageId: packId }
    ),
};

export const notifications = {
  getNotifications: (params: { cursor?: string } = {}) =>
    get<PaginatedResponse<Notification>>('/notifications', { params }),
  markRead: (id: string) =>
    patch<{ ok: true }>(`/notifications/${id}/read`),
  markAllRead: () => patch<{ ok: true }>('/notifications/read-all'),
  unreadCount: () => get<{ count: number }>('/notifications/unread-count'),
};

export const kyc = {
  getKycStatus: () => get<KycStatus>('/kyc/status'),
  uploadSelfie: (data: FormData) =>
    post<{ ok: true }>('/kyc/selfie', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadId: (data: FormData) =>
    post<{ ok: true }>('/kyc/id', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadAddress: (data: FormData) =>
    post<{ ok: true }>('/kyc/address', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const reviews = {
  getReviews: (userId: string) =>
    get<PaginatedResponse<Review>>(`/reviews/user/${userId}`),
  createReview: (payload: {
    revieweeId: string;
    listingId?: string;
    rating: number;
    comment: string;
  }) => post<Review>('/reviews', payload),
};

export const ai = {
  generateText: (
    type: 'title' | 'description',
    context: Record<string, unknown>
  ) => post<{ text: string }>('/ai/generate', { type, context }),
};

export const images = {
  upload: (listingId: string, data: string, mimetype: string) =>
    post<ListingImage>(
      `/listings/${listingId}/images/upload`,
      { data, mimetype },
    ),
  getUploadUrl: (listingId: string, contentType: string) =>
    post<{ uploadUrl: string; key: string }>(
      `/listings/${listingId}/images/upload-url`,
      { contentType }
    ),
  confirmUpload: (
    listingId: string,
    payload: { key: string; sortOrder: number }
  ) =>
    post<{ id: string; url: string; sortOrder: number }>(
      `/listings/${listingId}/images/confirm`,
      payload
    ),
  deleteImage: (listingId: string, imageId: string) =>
    del<{ ok: true }>(`/listings/${listingId}/images/${imageId}`),
  reorder: (listingId: string, ids: string[]) =>
    post<{ ok: true }>(`/listings/${listingId}/images/reorder`, { imageIds: ids }),
};

export const users = {
  getPublicProfile: (username: string) =>
    get<User>(`/users/by-username/${username}`),
  updateProfile: (payload: Partial<User>) =>
    patch<User>('/users/me', payload),
  uploadAvatar: (data: FormData) =>
    post<{ avatarUrl: string }>('/users/me/avatar', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const conversations = {
  getConversations: (params: { cursor?: string; limit?: number } = {}) =>
    get<PaginatedResponse<Conversation>>('/conversations', { params }),
  getMessages: (conversationId: string, params: { cursor?: string; limit?: number } = {}) =>
    get<PaginatedResponse<Message>>(`/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId: string, payload: { content: string }) =>
    post<Message>(`/conversations/${conversationId}/messages`, payload),
  markRead: (conversationId: string) =>
    patch<{ ok: true }>(`/conversations/${conversationId}/read`),
  unreadCount: () => get<{ count: number }>('/conversations/unread-count'),
  startConversation: (listingId: string, payload: { message: string }) =>
    post<{ conversation: Conversation; message: Message }>(
      `/listings/${listingId}/conversations`,
      payload,
    ),
};

export const liveChat = {
  getMessages: (listingId: string, params: { cursor?: string; limit?: number } = {}) =>
    get<{ messages: LiveChatMessage[]; nextCursor?: string }>(
      `/listings/${listingId}/live-chat/messages`, { params }
    ),
  sendMessage: (listingId: string, payload: { content: string }) =>
    post<LiveChatMessage>(`/listings/${listingId}/live-chat/messages`, payload),
};

export const admin = {
  getStats: () => get<AdminStats>('/admin/stats'),
  getUsers: (params: { cursor?: string; role?: string; kycLevel?: number } = {}) =>
    get<PaginatedResponse<User>>('/admin/users', { params }),
  getUser: (id: string) => get<User>(`/admin/users/${id}`),
  adjustTokens: (userId: string, amount: number, reason: string) =>
    post<{ ok: true }>(`/admin/users/${userId}/tokens`, { amount, reason }),
  getModerationListings: (params: { cursor?: string } = {}) =>
    get<PaginatedResponse<Listing>>('/admin/listings/pending', { params }),
  approveListing: (id: string) =>
    post<{ ok: true }>(`/admin/listings/${id}/approve`),
  rejectListing: (id: string, reason: string) =>
    post<{ ok: true }>(`/admin/listings/${id}/reject`, { reason }),
  getKycPending: () => get<PaginatedResponse<User>>('/admin/kyc/pending'),
  approveKyc: (userId: string, level: number) =>
    post<{ ok: true }>(`/admin/kyc/${userId}/approve`, { level }),
  rejectKyc: (userId: string, reason: string) =>
    post<{ ok: true }>(`/admin/kyc/${userId}/reject`, { reason }),
  getConfigs: () => get<SystemConfig[]>('/admin/configs'),
  updateConfig: (key: string, value: string) =>
    patch<SystemConfig>(`/admin/configs/${key}`, { value }),
};

export default {
  auth,
  listings,
  categories,
  wallet,
  notifications,
  kyc,
  reviews,
  ai,
  images,
  users,
  conversations,
  liveChat,
  admin,
};
