import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before any imports that use it
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      interceptors: {
        response: { use: vi.fn() },
        request: { use: vi.fn() },
      },
    }),
  },
}));

// Import after mock is set up (vi.mock is hoisted automatically by vitest)
const { publicStoreApi } = await import('./public-store.api');

describe('publicStoreApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  describe('listStores', () => {
    it('calls correct endpoint with params', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { content: [], totalElements: 0 } },
      });

      const result = await publicStoreApi.listStores(0, 20, 'test', 'FASHION' as never);

      expect(mockGet).toHaveBeenCalledWith('/public/store', {
        params: { page: 0, size: 20, search: 'test', category: 'FASHION' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getStore', () => {
    it('calls correct endpoint', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { id: '1', storeName: 'Test Store' } },
      });

      const result = await publicStoreApi.getStore('test-store');

      expect(mockGet).toHaveBeenCalledWith('/public/store/test-store');
      expect(result.data?.storeName).toBe('Test Store');
    });
  });

  describe('getProducts', () => {
    it('calls correct endpoint with pagination', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { content: [], totalElements: 0 } },
      });

      await publicStoreApi.getProducts('test-store', 0, 24, 'GENERAL', 'search');

      expect(mockGet).toHaveBeenCalledWith('/public/store/test-store/products', {
        params: { page: 0, size: 24, category: 'GENERAL', search: 'search' },
      });
    });
  });

  describe('getProductBySlug', () => {
    it('calls correct endpoint', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { id: '1', name: 'Widget' } },
      });

      await publicStoreApi.getProductBySlug('test-store', 'widget-slug');

      expect(mockGet).toHaveBeenCalledWith('/public/store/test-store/product/widget-slug');
    });
  });

  describe('placeOrder', () => {
    it('posts order to correct endpoint', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { orderNumber: 'ORD-2026-0001' } },
      });

      const order = {
        customerName: 'John',
        customerEmail: 'john@test.com',
        items: [{ productId: 'p1', quantity: 2 }],
      };

      const result = await publicStoreApi.placeOrder('test-store', order as never);

      expect(mockPost).toHaveBeenCalledWith('/public/store/test-store/orders', order);
      expect(result.data?.orderNumber).toBe('ORD-2026-0001');
    });
  });

  describe('trackOrder', () => {
    it('calls correct endpoint', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { orderNumber: 'ORD-2026-0001', status: 'PENDING' } },
      });

      const result = await publicStoreApi.trackOrder('test-store', 'ORD-2026-0001');

      expect(mockGet).toHaveBeenCalledWith('/public/store/test-store/orders/ORD-2026-0001');
      expect(result.data?.status).toBe('PENDING');
    });
  });

  describe('initializePayment', () => {
    it('calls correct endpoint with params', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { authorizationUrl: 'https://paystack.co/pay/123' } },
      });

      await publicStoreApi.initializePayment(
        'test-store',
        'ORD-2026-0001',
        'test@email.com',
        'https://callback.url'
      );

      expect(mockPost).toHaveBeenCalledWith(
        '/public/store/test-store/orders/ORD-2026-0001/pay',
        null,
        { params: { email: 'test@email.com', callbackUrl: 'https://callback.url' } }
      );
    });
  });

  describe('verifyPayment', () => {
    it('calls correct endpoint with reference', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { paymentStatus: 'PAID' } },
      });

      await publicStoreApi.verifyPayment('test-store', 'ORD-2026-0001', 'ref_123');

      expect(mockGet).toHaveBeenCalledWith(
        '/public/store/test-store/orders/ORD-2026-0001/verify-payment',
        { params: { reference: 'ref_123' } }
      );
    });
  });
});
