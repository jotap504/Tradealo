export type Currency = 'ARS' | 'USD';
export type ListingCondition = 'new' | 'used' | 'refurbished';
export type ListingType = 'standard' | 'premium';
export type Role = 'user' | 'super_admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: string;
  email: string;
  username?: string;
  role: Role;
  kycLevel: number;
  avatarUrl?: string;
  bio?: string;
  province?: string;
  city?: string;
  status?: UserStatus;
  createdAt?: string;
  reputation?: {
    average: number;
    count: number;
  };
  cbu?: string;
  alias?: string;
  bankName?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
}

export interface ListingImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  sortOrder: number;
}

export type SaleType = 'contact' | 'stock' | 'auction' | 'live';

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  condition: ListingCondition;
  type: ListingType;
  saleType: SaleType;
  status: string;
  province: string;
  city?: string;
  images: ListingImage[];
  seller: User;
  category: Category;
  isCollectible: boolean;
  negotiable: boolean;
  paymentMethods: string[];
  shippingOptions: string[];
  shippingDescription?: string;
  attributes?: Record<string, unknown>;
  viewCount: number;
  createdAt: string;
  expiresAt?: string;
  showPhone?: boolean;
  phone?: string;
  contactInfo?: {
    phone?: string;
    showWhatsApp?: boolean;
  };
  youtubeLiveId?: string;
  riskScore?: number;
  stock?: number;
  desiredPrice?: number;
  paymentInfo?: PaymentInfo;
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  status: 'active' | 'outbid' | 'won' | 'lost';
  bidder?: User;
  createdAt: string;
}

export interface CategoryAttribute {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string | null;
  isCollectible?: boolean;
  children?: Category[];
  attributes?: CategoryAttribute[];
}

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  priceArs: number;
  bonusTokens?: number;
  popular?: boolean;
  description?: string;
}

export interface WalletBalance {
  balance: number;
  monthlyQuota: number;
  monthlyUsed: number;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  description?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer: User;
  reviewee?: User;
  createdAt: string;
  replyText?: string;
  replyCreatedAt?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface KycStatus {
  id: boolean;
  selfie: boolean;
  address: boolean;
  level: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  total?: number;
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  listingTitle?: string;
  listingPrice?: string;
  listingCurrency?: string;
  listingImage?: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  createdAt: string;
  updatedAt: string;
  otherParticipant: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface LiveChatMessage {
  id: string;
  listingId: string;
  userId: string;
  content: string;
  createdAt: string;
  username: string | null;
  avatarUrl: string | null;
  isHost: boolean;
}

export interface ListingQuestion {
  id: string;
  listingId: string;
  userId: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  category: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeListings: number;
  tokensIssued: number;
  revenueArs: number;
}

export type OrderStatus = 'pending' | 'delivered' | 'completed' | 'cancelled';

export interface PaymentInfo {
  cbu?: string;
  alias?: string;
  bankName?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
}

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  conversationId: string;
  status: OrderStatus;
  paymentInfo?: PaymentInfo;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}
