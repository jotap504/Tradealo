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
  TierProgress,
  Review,
  Conversation,
  Message,
  Bid,
  ListingQuestion,
  PendingQuestion,
  LiveChatMessage,
  PaginatedResponse,
  SystemConfig,
  AdminStats,
  AdminTokenPack,
  Order,
  Shop,
  PublicShop,
  ShopSubscription,
  ShopAnalytics,
  BcraCheckResult,
  KycPendingVerification,
  CategoryAttribute,
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
          // Notify the Android shell so it can register the FCM push token
          // against this session. No-op outside the native WebView.
          const bridge = (window as unknown as {
            AndroidBridge?: { reportReady?: (t: string) => void };
          }).AndroidBridge;
          try { bridge?.reportReady?.(unwrapped.accessToken); } catch {}
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
async function put<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await apiClient.put<T>(url, body, config);
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
  phoneLogin: async (idToken: string) => {
    const res = await post<{ user: User; accessToken: string; refreshToken: string }>('/auth/phone/login', { idToken });
    if (typeof window !== 'undefined') {
      if (res.accessToken) localStorage.setItem('accessToken', res.accessToken);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    }
    return res;
  },
  phoneLink: async (idToken: string) =>
    post<{ phone: string; phoneVerified: boolean }>('/auth/phone/link', { idToken }),
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
  getMyListings: (params: { cursor?: string; offset?: number; status?: string; search?: string; saleType?: string; categoryId?: string; limit?: number } = {}) =>
    get<PaginatedResponse<Listing> & { nextCursor?: string; hasMore?: boolean; total?: number }>('/listings/me', { params }),
  bulkUpdateStatus: (listingIds: string[], target: 'paused' | 'active') =>
    patch<{ updated: number; skipped: number; target: 'paused' | 'active' }>(
      '/listings/bulk-status',
      { listingIds, target },
    ),
  bulkAdjustPrice: (
    listingIds: string[],
    mode: 'percent' | 'absolute',
    value: number,
  ) =>
    patch<{
      updated: number;
      items: { id: string; title: string; oldPrice: number; newPrice: number; currency: string }[];
    }>('/listings/bulk-price', { listingIds, mode, value }),
  exportCsvUrl: '/listings/export.csv',
  publishListing: (id: string, payload: { type: string; durationDays: number }) =>
    post<Listing>(`/listings/${id}/publish`, payload),
  renewListing: (id: string, durationDays: number) =>
    post<Listing>(`/listings/${id}/renew`, { durationDays }),
  contactSeller: (id: string, payload: { message: string }) =>
    post<{ conversationId: string }>(`/listings/${id}/contact`, payload),
  buyNow: (id: string, variantId?: string) =>
    post<{ conversationId: string; orderId: string }>(`/listings/${id}/buy`, variantId ? { variantId } : {}),
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
  setQuestionPrivacy: (id: string, questionId: string, isPrivate: boolean) =>
    patch<ListingQuestion>(`/listings/${id}/questions/${questionId}/privacy`, { isPrivate }),
  getPendingQuestions: () =>
    get<PendingQuestion[]>('/listings/me/pending-questions'),
};

export interface CategoryNode extends Category {
  depth: number;
  pathSlugs: string[] | null;
  children: CategoryNode[];
}

export interface CategoryDetail extends Category {
  depth: number;
  pathSlugs: string[] | null;
  attributes: CategoryAttribute[];
}

export const categories = {
  getCategories: () => get<Category[]>('/categories'),
  getCategory: (idOrSlug: string) =>
    get<CategoryDetail>(`/categories/${idOrSlug}`),
  getTree: () => get<CategoryNode[]>('/categories/tree'),
  getAttributes: (idOrSlug: string) =>
    get<CategoryAttribute[]>(`/categories/${idOrSlug}/attributes`),
};

export interface ListingVariant {
  id: string;
  listingId: string;
  attributeValues: Record<string, string>;
  stock: number;
  sku: string | null;
  price: string | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  isActive: boolean;
}

export interface VariantInput {
  attributeValues: Record<string, string>;
  stock: number;
  sku?: string;
  price?: number;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  isActive?: boolean;
}

export const listingVariants = {
  listPublic: (listingId: string) =>
    get<ListingVariant[]>(`/listings/${listingId}/variants/public`),
  list: (listingId: string) =>
    get<ListingVariant[]>(`/listings/${listingId}/variants`),
  createOne: (listingId: string, input: VariantInput) =>
    post<ListingVariant>(`/listings/${listingId}/variants`, input),
  replaceAll: (listingId: string, variants: VariantInput[]) =>
    put<ListingVariant[]>(`/listings/${listingId}/variants`, { variants }),
  update: (
    listingId: string,
    variantId: string,
    input: Partial<VariantInput>,
  ) =>
    patch<ListingVariant>(
      `/listings/${listingId}/variants/${variantId}`,
      input,
    ),
  remove: (listingId: string, variantId: string) =>
    del<void>(`/listings/${listingId}/variants/${variantId}`),
};

export interface FreeQuota {
  quota: number;
  used: number;
  remaining: number;
}

export const wallet = {
  getBalance: () => get<WalletBalance>('/wallet/balance'),
  getTransactions: (params: { cursor?: string; limit?: number } = {}) =>
    get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', { params }),
  getPacks: () => get<TokenPack[]>('/wallet/token-packs'),
  getFreeQuota: () => get<FreeQuota>('/wallet/free-quota'),
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
  getTierProgress: () => get<TierProgress>('/kyc/tiers'),
  uploadSelfie: (data: string, mimetype: string) =>
    post<{ ok: true }>('/kyc/selfie', { data, mimetype }),
  uploadId: (data: string, mimetype: string) =>
    post<{ ok: true }>('/kyc/id', { data, mimetype }),
  uploadAddress: (data: string, mimetype: string) =>
    post<{ ok: true }>('/kyc/address', { data, mimetype }),
  uploadPhoneCamera: (frontData: string, frontMimetype: string, backData: string, backMimetype: string) =>
    post<{ ok: true }>('/kyc/silver/phone-camera', { frontData, frontMimetype, backData, backMimetype }),
  recordBcraConsent: (consent: string) =>
    post<{ ok: true }>('/kyc/silver/bcra-consent', { consent }),
  getGoldEligibility: () => get<TierProgress['gold']['progress']>('/kyc/gold/eligibility'),
  recalculateTier: () => post<{ tier: number; downgraded?: boolean }>('/kyc/recalculate'),
  getBcraResult: () => get<BcraCheckResult | null>('/kyc/bcra-result'),
  getDebugInfo: () => get<{
    verifications: { type: string; status: string; rejectionReason: string | null; verificationData: unknown; createdAt: string; verifiedAt: string | null }[];
    visionProvider: { mode: string; model: string; apiUrl: string; hasKey: boolean };
  }>('/kyc/debug'),
};

export interface FavoriteListing extends Listing {
  favoritedAt: string;
}

export const favorites = {
  list: () => get<FavoriteListing[]>('/favorites'),
  listIds: () => get<string[]>('/favorites/ids'),
  add: (listingId: string) => post<{ ok: true }>(`/favorites/${listingId}`),
  remove: (listingId: string) => del<{ ok: true }>(`/favorites/${listingId}`),
};

export const reviews = {
  getReviews: (userId: string) =>
    get<PaginatedResponse<Review>>(`/reviews/user/${userId}`),
  createReview: (payload: {
    reviewedId: string;
    listingId: string;
    direction: 'buyer_to_seller' | 'seller_to_buyer';
    overallRating: number;
    comment?: string;
  }) => post<Review>('/reviews', payload),
  replyToReview: (reviewId: string, replyText: string) =>
    patch<Review>(`/reviews/${reviewId}/reply`, { replyText }),
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
    patch<{ ok: true }>(`/listings/${listingId}/images/reorder`, { imageIds: ids }),
  assignVariant: (listingId: string, imageId: string, variantId: string | null) =>
    patch<ListingImage>(`/listings/${listingId}/images/${imageId}/variant`, { variantId }),
};

export const users = {
  getMe: () =>
    get<{ reputation: { average: number; count: number } }>('/users/me'),
  getPublicProfile: (username: string) =>
    get<User>(`/users/by-username/${username}`),
  updateProfile: (payload: Partial<User>) =>
    patch<User>('/users/me', payload),
  uploadAvatar: (data: string, mimetype: string) =>
    post<{ avatarUrl: string }>('/users/me/avatar/upload', { data, mimetype }),
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

export interface SaleOrder extends Order {
  listing: {
    id: string;
    title: string;
    price: string;
    currency: 'ARS' | 'USD';
    status: string;
    primaryImageUrl: string | null;
  };
  buyer: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
  buyerReview: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    replyText: string | null;
    replyCreatedAt: string | null;
  } | null;
  sellerReview: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
}

export interface PurchaseOrder extends Order {
  listing: {
    id: string;
    title: string;
    price: string;
    currency: 'ARS' | 'USD';
    status: string;
    primaryImageUrl: string | null;
  };
  seller: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export const orders = {
  getByConversation: (conversationId: string) =>
    get<Order>(`/orders/by-conversation/${conversationId}`),
  getMine: () => get<{ asBuyer: Order[]; asSeller: Order[] }>('/orders/mine'),
  getMyPurchases: () => get<PurchaseOrder[]>('/orders/my-purchases'),
  getMySales: () => get<SaleOrder[]>('/orders/my-sales'),
  markDelivered: (id: string) =>
    patch<Order>(`/orders/${id}/deliver`),
  cancel: (id: string) =>
    patch<Order>(`/orders/${id}/cancel`),
  sendPaymentInfo: (id: string) =>
    post<{ sent: boolean }>(`/orders/${id}/send-payment-info`),
  sendContact: (id: string) =>
    post<{ sent: boolean }>(`/orders/${id}/send-contact`),
  complete: (id: string) =>
    patch<Order>(`/orders/${id}/complete`),
};

export const admin = {
  getStats: () => get<AdminStats>('/admin/stats'),
  getUsers: (params: { cursor?: string; role?: string; kycLevel?: number; status?: string; search?: string; limit?: number } = {}) =>
    get<PaginatedResponse<User>>('/admin/users', { params }),
  getUser: (id: string) => get<User>(`/admin/users/${id}`),
  updateUserRole: (id: string, role: string) =>
    patch<{ ok: true }>(`/admin/users/${id}/role`, { role }),
  suspendUser: (id: string, days?: number) =>
    patch<{ ok: true }>(`/admin/users/${id}/suspend`, days ? { days } : {}),
  banUser: (id: string) =>
    patch<{ ok: true }>(`/admin/users/${id}/ban`),
  restoreUser: (id: string) =>
    patch<{ ok: true }>(`/admin/users/${id}/restore`),
  deleteUser: (id: string) =>
    del<{ ok: true }>(`/admin/users/${id}`),
  setKycLevel: (id: string, level: 0 | 1 | 2) =>
    patch<{ ok: true }>(`/admin/users/${id}/kyc-level`, { level }),
  adjustTokens: (userId: string, amount: number, reason: string) =>
    post<{ ok: true }>(`/admin/users/${userId}/tokens`, { amount, reason }),
  getModerationListings: (params: { cursor?: string } = {}) =>
    get<PaginatedResponse<Listing>>('/admin/listings/pending', { params }),
  approveListing: (id: string) =>
    post<{ ok: true }>(`/admin/listings/${id}/approve`),
  rejectListing: (id: string, reason: string) =>
    post<{ ok: true }>(`/admin/listings/${id}/reject`, { reason }),
  getKycPending: () => get<PaginatedResponse<KycPendingVerification>>('/admin/kyc/pending'),
  approveKyc: (userId: string, level: number) =>
    post<{ ok: true }>(`/admin/kyc/${userId}/approve`, { level }),
  rejectKyc: (userId: string, reason: string) =>
    post<{ ok: true }>(`/admin/kyc/${userId}/reject`, { reason }),
  getConfigs: () => get<SystemConfig[]>('/admin/configs'),
  updateConfig: (key: string, value: unknown, reason: string) =>
    patch<SystemConfig>(`/admin/configs/${key}`, { value, reason }),
  getTokenPacks: () => get<AdminTokenPack[]>('/admin/token-packs'),
  createTokenPack: (data: { key: string; label: string; tokens: number; bonusPct?: number; isFeatured?: boolean; sortOrder?: number; priceArs: string }) =>
    post<AdminTokenPack>('/admin/token-packs', data),
  updateTokenPack: (id: string, updates: { label?: string; tokens?: number; bonusPct?: number; isFeatured?: boolean; isActive?: boolean; sortOrder?: number }) =>
    patch<AdminTokenPack>(`/admin/token-packs/${id}`, updates),
  updateTokenPackPrice: (priceId: string, price: string) =>
    patch<{ ok: true }>(`/admin/token-packs/prices/${priceId}`, { price }),
  getAuditLog: (params: { entityType?: string; adminId?: string; from?: string; to?: string; cursor?: string; limit?: number } = {}) =>
    get<{ data: AdminAuditEntry[]; nextCursor?: string }>('/admin/audit-log', { params }),
  getReports: (params: { status?: string; targetType?: string; cursor?: string; limit?: number } = {}) =>
    get<{ data: AdminReport[]; nextCursor?: string }>('/admin/reports', { params }),
  getReport: (id: string) =>
    get<AdminReport>(`/admin/reports/${id}`),
  assignReport: (id: string) =>
    patch<{ ok: true }>(`/admin/reports/${id}/assign`, {}),
  resolveReport: (id: string, resolution: string) =>
    patch<{ ok: true }>(`/admin/reports/${id}/resolve`, { resolution }),
  dismissReport: (id: string, resolution: string) =>
    patch<{ ok: true }>(`/admin/reports/${id}/dismiss`, { resolution }),
  getDisputes: (params: { status?: string; cursor?: string; limit?: number } = {}) =>
    get<{ data: AdminDispute[]; nextCursor?: string }>('/admin/disputes', { params }),
  getDispute: (id: string) =>
    get<AdminDispute>(`/admin/disputes/${id}`),
  addDisputeMessage: (id: string, message: string) =>
    post<{ ok: true }>(`/admin/disputes/${id}/messages`, { message }),
  assignDispute: (id: string) =>
    patch<{ ok: true }>(`/admin/disputes/${id}/assign`, {}),
  resolveDispute: (id: string, resolution: string) =>
    patch<{ ok: true }>(`/admin/disputes/${id}/resolve`, { resolution }),
  closeDispute: (id: string, resolution: string) =>
    patch<{ ok: true }>(`/admin/disputes/${id}/close`, { resolution }),
  getTickets: (params: { status?: string; priority?: string; category?: string; cursor?: string; limit?: number } = {}) =>
    get<{ data: AdminTicket[]; nextCursor?: string }>('/admin/tickets', { params }),
  getTicket: (id: string) =>
    get<AdminTicket>(`/admin/tickets/${id}`),
  addTicketMessage: (id: string, message: string) =>
    post<{ ok: true }>(`/admin/tickets/${id}/messages`, { message }),
  updateTicket: (id: string, updates: { status?: string; priority?: string; assignedTo?: string }) =>
    patch<{ ok: true }>(`/admin/tickets/${id}`, updates),
  grantShop: (userId: string) =>
    patch<{ ok: true; shopId: string }>(`/admin/users/${userId}/shop/grant`, {}),
  revokeShop: (userId: string) =>
    patch<{ ok: true }>(`/admin/users/${userId}/shop/revoke`, {}),
};

export interface AdminAuditEntry {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterEmail?: string;
  targetType: 'listing' | 'user';
  targetId: string;
  reason: string;
  description?: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface DisputeMessage {
  id: string;
  authorId: string;
  authorType: 'user' | 'admin';
  message: string;
  imageUrl?: string;
  createdAt: string;
}

export interface AdminDispute {
  id: string;
  initiatorId: string;
  initiatorEmail?: string;
  respondentId: string;
  listingId?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: DisputeMessage[];
}

export interface TicketMessage {
  id: string;
  authorId: string;
  authorType: 'user' | 'admin';
  message: string;
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export const reports = {
  create: (dto: { targetType: 'listing' | 'user'; targetId: string; reason: string; description?: string }) =>
    post<{ ok: true }>('/reports', dto),
};

export const disputes = {
  create: (dto: { respondentId: string; listingId?: string; subject: string; description: string }) =>
    post<{ id: string }>('/disputes', dto),
  listMine: () => get<AdminDispute[]>('/disputes/me'),
  get: (id: string) => get<AdminDispute>(`/disputes/${id}`),
  addMessage: (id: string, message: string, imageUrl?: string) =>
    post<DisputeMessage>(`/disputes/${id}/messages`, { message, imageUrl }),
  uploadImage: (id: string, data: string, mimetype: string) =>
    post<{ imageUrl: string }>(`/disputes/${id}/image`, { data, mimetype }),
  close: (id: string) =>
    patch<AdminDispute>(`/disputes/${id}/close`, {}),
};

export const support = {
  createTicket: (dto: { subject: string; category: string; message: string }) =>
    post<{ id: string }>('/support/tickets', dto),
  listMine: () => get<AdminTicket[]>('/support/tickets'),
  getTicket: (id: string) => get<AdminTicket>(`/support/tickets/${id}`),
  addMessage: (id: string, message: string) =>
    post<{ ok: true }>(`/support/tickets/${id}/messages`, { message }),
};

export interface UpdateShopProfileDto {
  slug?: string;
  shopName?: string;
  tagline?: string;
  about?: string;
  theme?: string;
  whatsappBusiness?: string;
  socialLinks?: Partial<Record<string, string>>;
  businessHours?: Record<string, string>;
  locationText?: string;
  metaTitle?: string;
  metaDescription?: string;
  autoPublishViaAgent?: boolean;
}

export const shop = {
  getPublic: (username: string) =>
    get<PublicShop>(`/shops/by-username/${username}`),
  trackEvent: (shopId: string, dto: { eventType: string; listingId?: string; sessionId?: string; referrer?: string }) =>
    post<{ ok: true }>(`/shops/${shopId}/analytics`, dto),
  getMyShop: () => get<Shop>('/shops/me'),
  initShop: () => post<Shop>('/shops/me'),
  updateProfile: (dto: UpdateShopProfileDto) =>
    patch<Shop>('/shops/me', dto),
  uploadLogo: (data: string, mimetype: string) =>
    post<{ logoUrl: string }>('/shops/me/logo', { data, mimetype }),
  uploadBanner: (data: string, mimetype: string) =>
    post<{ bannerUrl: string }>('/shops/me/banner', { data, mimetype }),
  addGalleryImage: (data: string, mimetype: string, caption?: string) =>
    post<{ id: string; url: string }>('/shops/me/gallery', { data, mimetype, caption }),
  removeGalleryImage: (imageId: string) =>
    del<{ ok: true }>(`/shops/me/gallery/${imageId}`),
  reorderGallery: (imageIds: string[]) =>
    patch<{ ok: true }>('/shops/me/gallery/reorder', { imageIds }),
  pinListing: (listingId: string) =>
    post<{ ok: true }>('/shops/me/pinned-listings', { listingId }),
  unpinListing: (listingId: string) =>
    del<{ ok: true }>(`/shops/me/pinned-listings/${listingId}`),
  reorderPinned: (listingIds: string[]) =>
    patch<{ ok: true }>('/shops/me/pinned-listings/reorder', { listingIds }),
  updateCategoryOrder: (categories: string[]) =>
    patch<{ ok: true }>('/shops/me/category-order', { categories }),
  updateHeroTemplate: (heroTemplate: string, heroConfig: Record<string, unknown>) =>
    patch<{ ok: true }>('/shops/me', { heroTemplate, heroConfig }),
  updateFooterTemplate: (footerTemplate: string, footerConfig: Record<string, unknown>) =>
    patch<{ ok: true }>('/shops/me', { footerTemplate, footerConfig }),
  updatePrimaryColor: (primaryColor: string | null) =>
    patch<{ ok: true }>('/shops/me', { primaryColor }),
  setAnnouncement: (dto: { text: string | null; expiresAt?: string | null }) =>
    patch<{ ok: true }>('/shops/me/announcement', dto),
  publish: () => post<{ ok: true }>('/shops/me/publish'),
  unpublish: () => post<{ ok: true }>('/shops/me/unpublish'),
  setAgentPurchasable: (enabled: boolean) =>
    patch<{ ok: true; updated: number; enabled: boolean }>(
      '/shops/me/agent-purchase',
      { enabled },
    ),
  getAnalytics: (days?: number) =>
    get<ShopAnalytics>('/shops/me/analytics', { params: { days } }),
};

export const shopSubscription = {
  subscribe: () => post<{ initPoint: string }>('/shop-subscriptions/subscribe'),
  getMine: () => get<ShopSubscription | null>('/shop-subscriptions/me'),
  cancel: () => del<{ ok: true }>('/shop-subscriptions/me'),
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const shopChatbot = {
  sendMessage: (shopId: string, message: string, history: ChatMessage[] = []) =>
    post<{ answer: string; suggestWhatsapp: boolean; whatsappUrl?: string }>(
      `/shop-chatbot/${shopId}/message`,
      { message, history },
    ),
};

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreatedApiToken extends ApiTokenSummary {
  /** Plaintext token, only returned once at creation. */
  token: string;
}

export const apiTokens = {
  list: () => get<ApiTokenSummary[]>('/me/api-tokens'),
  create: (name: string, scopes: string[] = []) =>
    post<CreatedApiToken>('/me/api-tokens', { name, scopes }),
  revoke: (id: string) => del<{ ok: true }>(`/me/api-tokens/${id}`),
};

export interface PaymentCredentialSummary {
  hasCredential: boolean;
  provider?: string;
  mpUserId?: string | null;
  tokenKind?: string;
  lastValidatedAt?: string | null;
  createdAt?: string | null;
  tokenPreview?: string | null;
}

export const paymentCredentials = {
  get: () => get<PaymentCredentialSummary>('/me/payment-credentials'),
  upsert: (accessToken: string) =>
    post<PaymentCredentialSummary>('/me/payment-credentials', { accessToken }),
  remove: () => del<{ ok: true }>('/me/payment-credentials'),
};

export interface MlConnection {
  connected: boolean;
  nickname?: string | null;
  siteId?: string | null;
  externalUserId?: string | null;
  lastValidatedAt?: string | null;
  expiresAt?: string | null;
}

export interface MlItemRow {
  id: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  thumbnail: string | null;
  alreadyImported: boolean;
}

export interface MlImportJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  totalItems: number;
  succeeded: number;
  failed: number;
  skippedDuplicate: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface MlImportJobItem {
  id: string;
  externalProductId: string;
  status: 'pending' | 'created' | 'skipped' | 'failed';
  listingId: string | null;
  errorMessage: string | null;
}

export type ExcelTrocaliaField =
  | 'title'
  | 'description'
  | 'price'
  | 'currency'
  | 'condition'
  | 'categoryHint'
  | 'imagesUrls'
  | 'sku'
  | 'stock'
  | 'ignore';

export interface ExcelColumnMapping {
  index: number;
  header: string;
  field: ExcelTrocaliaField;
  confidence: number;
  reason?: string;
}

export interface ExcelPreview {
  jobId: string;
  headers: string[];
  sampleRows: (string | number | null)[][];
  totalRows: number;
  mapping: ExcelColumnMapping[];
}

export const excelImport = {
  preview: (filename: string, base64: string) =>
    post<ExcelPreview>('/excel-import/preview', { filename, base64 }),
  confirm: (jobId: string, mapping: ExcelColumnMapping[]) =>
    post<{ jobId: string; totalItems: number }>(
      `/excel-import/${jobId}/confirm`,
      { mapping },
    ),
  getJob: (jobId: string) =>
    get<{ job: MlImportJob; items: MlImportJobItem[] }>(
      `/excel-import/${jobId}`,
    ),
};

export const mercadolibre = {
  getConnection: () => get<MlConnection>('/mercadolibre/connection'),
  getAuthorizeUrl: () => get<{ url: string }>('/mercadolibre/connect'),
  disconnect: () => del<void>('/mercadolibre/connection'),
  listItems: (scrollId?: string) =>
    get<{ scrollId: string | null; items: MlItemRow[] }>(
      `/mercadolibre/items${scrollId ? `?scrollId=${encodeURIComponent(scrollId)}` : ''}`,
    ),
  startImport: (itemIds: string[] | 'all') =>
    post<{ jobId: string; totalItems: number }>('/mercadolibre/imports', {
      itemIds,
    }),
  listJobs: () => get<{ data: MlImportJob[] }>('/mercadolibre/imports'),
  getJob: (id: string) =>
    get<{ job: MlImportJob; items: MlImportJobItem[] }>(
      `/mercadolibre/imports/${id}`,
    ),
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
  orders,
  admin,
  reports,
  disputes,
  support,
  shop,
  shopSubscription,
  shopChatbot,
  apiTokens,
  paymentCredentials,
  mercadolibre,
  excelImport,
};
