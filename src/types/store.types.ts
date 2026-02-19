/**
 * QuickStore types for storefront and order management.
 */

// ==================== Enums ====================

export enum OrderSource {
    STOREFRONT = 'STOREFRONT',
    POS = 'POS',
    WHATSAPP = 'WHATSAPP',
    MANUAL = 'MANUAL',
}

export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum OrderPaymentStatus {
    UNPAID = 'UNPAID',
    PARTIAL = 'PARTIAL',
    PAID = 'PAID',
    REFUNDED = 'REFUNDED',
}

export enum FulfillmentType {
    PICKUP = 'PICKUP',
    DELIVERY = 'DELIVERY',
}

export enum StoreCategory {
    FOOD_AND_DRINKS = 'FOOD_AND_DRINKS',
    FASHION = 'FASHION',
    ELECTRONICS = 'ELECTRONICS',
    GROCERIES = 'GROCERIES',
    HEALTH_AND_BEAUTY = 'HEALTH_AND_BEAUTY',
    HOME_AND_LIVING = 'HOME_AND_LIVING',
    SPORTS_AND_FITNESS = 'SPORTS_AND_FITNESS',
    BOOKS_AND_STATIONERY = 'BOOKS_AND_STATIONERY',
    AUTOMOTIVE = 'AUTOMOTIVE',
    SERVICES = 'SERVICES',
    OTHER = 'OTHER',
}

export const StoreCategoryLabels: Record<StoreCategory, string> = {
    [StoreCategory.FOOD_AND_DRINKS]: 'Food & Drinks',
    [StoreCategory.FASHION]: 'Fashion & Apparel',
    [StoreCategory.ELECTRONICS]: 'Electronics & Gadgets',
    [StoreCategory.GROCERIES]: 'Groceries & Supermarket',
    [StoreCategory.HEALTH_AND_BEAUTY]: 'Health & Beauty',
    [StoreCategory.HOME_AND_LIVING]: 'Home & Living',
    [StoreCategory.SPORTS_AND_FITNESS]: 'Sports & Fitness',
    [StoreCategory.BOOKS_AND_STATIONERY]: 'Books & Stationery',
    [StoreCategory.AUTOMOTIVE]: 'Automotive',
    [StoreCategory.SERVICES]: 'Services',
    [StoreCategory.OTHER]: 'Other',
};

// ==================== Store Types ====================

export interface Store {
    id: string;
    storeName: string;
    storeSlug: string;
    description?: string;
    category?: StoreCategory;
    logoUrl?: string;
    bannerUrl?: string;
    phone?: string;
    email?: string;
    whatsappNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country: string;
    businessHours?: Record<string, { open: string; close: string }>;
    isActive: boolean;
    acceptOrders: boolean;
    minimumOrderKobo: number;
    deliveryFeeKobo: number;
    pickupAvailable: boolean;
    deliveryAvailable: boolean;
    acceptBankTransfer: boolean;
    acceptCash: boolean;
    acceptOnlinePayment: boolean;
    primaryColor: string;
    currency: string;
    publicUrl: string;
    // Accurify Pay fields
    paystackSubaccountCode?: string;
    settlementBankCode?: string;
    settlementAccountNumber?: string;
    settlementAccountName?: string;
    platformFeePercentage?: number;
    subaccountVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface StoreRequest {
    storeName: string;
    storeSlug: string;
    description?: string;
    phone?: string;
    email?: string;
    whatsappNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    businessHours?: Record<string, { open: string; close: string }>;
    minimumOrderKobo?: number;
    deliveryFeeKobo?: number;
    pickupAvailable?: boolean;
    deliveryAvailable?: boolean;
    acceptBankTransfer?: boolean;
    acceptCash?: boolean;
    acceptOnlinePayment?: boolean;
    primaryColor?: string;
}

// ==================== Order Types ====================

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productSku?: string;
    unitPriceKobo: number;
    quantity: number;
    totalKobo: number;
    notes?: string;
}

export interface OrderItemRequest {
    productId: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
}

export interface StoreOrder {
    id: string;
    storeId: string;
    orderNumber: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    source: OrderSource;
    status: OrderStatus;
    fulfillmentType: FulfillmentType;
    deliveryNotes?: string;
    subtotalKobo: number;
    discountKobo: number;
    taxKobo: number;
    deliveryFeeKobo: number;
    totalKobo: number;
    paymentStatus: OrderPaymentStatus;
    paymentMethod?: string;
    paymentReference?: string;
    paidAmountKobo: number;
    paidAt?: string;
    confirmedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    notes?: string;
    paymentProofUrl?: string;
    paymentProofSubmittedAt?: string;
    paymentProofNote?: string;
    items: OrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface OrderRequest {
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    source?: OrderSource;
    fulfillmentType?: FulfillmentType;
    deliveryNotes?: string;
    items: OrderItemRequest[];
    notes?: string;
}

// ==================== Payment Types ====================

export interface PaymentInitResponse {
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amountKobo: number;
    platformFeeKobo: number;
    merchantAmountKobo: number;
}
