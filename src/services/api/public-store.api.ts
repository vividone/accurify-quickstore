/**
 * Public Storefront API - No authentication required.
 * Used by customers browsing QuickStore storefronts.
 */
import axios from 'axios';
import type { Store, OrderRequest, PaymentInitResponse, StoreCategory } from '@/types/store.types';
import type { Product } from '@/types/product.types';
import type { ApiResponse, PageResponse } from '@/types/api.types';

// Create a separate axios instance for public endpoints (no auth)
const publicClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

const PUBLIC_STORE_BASE = '/public/store';

// ==================== Types ====================

export interface PublicStoreOrder {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalKobo: number;
    createdAt: string;
}

export interface CartItem {
    productId: string;
    product: Product;
    quantity: number;
}

// ==================== API ====================

export const publicStoreApi = {
    /**
     * List all active stores
     */
    listStores: async (
        page: number = 0,
        size: number = 20,
        search?: string,
        category?: StoreCategory
    ): Promise<ApiResponse<PageResponse<Store>>> => {
        const response = await publicClient.get<ApiResponse<PageResponse<Store>>>(
            PUBLIC_STORE_BASE,
            {
                params: { page, size, search, category },
            }
        );
        return response.data;
    },

    /**
     * Get all store categories
     */
    getCategories: async (): Promise<ApiResponse<StoreCategory[]>> => {
        const response = await publicClient.get<ApiResponse<StoreCategory[]>>(
            `${PUBLIC_STORE_BASE}/categories`
        );
        return response.data;
    },

    /**
     * Get store by slug
     */
    getStore: async (slug: string): Promise<ApiResponse<Store>> => {
        const response = await publicClient.get<ApiResponse<Store>>(`${PUBLIC_STORE_BASE}/${slug}`);
        return response.data;
    },

    /**
     * Get store products
     */
    getProducts: async (
        slug: string,
        page: number = 0,
        size: number = 20,
        category?: string,
        search?: string
    ): Promise<ApiResponse<PageResponse<Product>>> => {
        const response = await publicClient.get<ApiResponse<PageResponse<Product>>>(
            `${PUBLIC_STORE_BASE}/${slug}/products`,
            {
                params: { page, size, category, search },
            }
        );
        return response.data;
    },

    /**
     * Get single product by ID
     */
    getProduct: async (slug: string, productId: string): Promise<ApiResponse<Product>> => {
        const response = await publicClient.get<ApiResponse<Product>>(
            `${PUBLIC_STORE_BASE}/${slug}/products/${productId}`
        );
        return response.data;
    },

    /**
     * Get product by slug (for shareable links)
     */
    getProductBySlug: async (storeSlug: string, productSlug: string): Promise<ApiResponse<Product>> => {
        const response = await publicClient.get<ApiResponse<Product>>(
            `${PUBLIC_STORE_BASE}/${storeSlug}/product/${productSlug}`
        );
        return response.data;
    },

    /**
     * Place an order
     */
    placeOrder: async (slug: string, order: OrderRequest): Promise<ApiResponse<PublicStoreOrder>> => {
        const response = await publicClient.post<ApiResponse<PublicStoreOrder>>(
            `${PUBLIC_STORE_BASE}/${slug}/orders`,
            order
        );
        return response.data;
    },

    /**
     * Track an order
     */
    trackOrder: async (slug: string, orderNumber: string): Promise<ApiResponse<PublicStoreOrder>> => {
        const response = await publicClient.get<ApiResponse<PublicStoreOrder>>(
            `${PUBLIC_STORE_BASE}/${slug}/orders/${orderNumber}`
        );
        return response.data;
    },

    /**
     * Initialize payment for an order
     */
    initializePayment: async (
        slug: string,
        orderNumber: string,
        email: string,
        callbackUrl: string
    ): Promise<ApiResponse<PaymentInitResponse>> => {
        const response = await publicClient.post<ApiResponse<PaymentInitResponse>>(
            `${PUBLIC_STORE_BASE}/${slug}/orders/${orderNumber}/pay`,
            null,
            {
                params: { email, callbackUrl },
            }
        );
        return response.data;
    },

    /**
     * Verify payment
     */
    verifyPayment: async (
        slug: string,
        orderNumber: string,
        reference: string
    ): Promise<ApiResponse<PublicStoreOrder>> => {
        const response = await publicClient.get<ApiResponse<PublicStoreOrder>>(
            `${PUBLIC_STORE_BASE}/${slug}/orders/${orderNumber}/verify-payment`,
            {
                params: { reference },
            }
        );
        return response.data;
    },
};

export default publicStoreApi;
