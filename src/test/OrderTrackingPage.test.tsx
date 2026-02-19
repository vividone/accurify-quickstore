import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';
import type { StoreOrder } from '@/types/store.types';
import { OrderStatus, OrderPaymentStatus, FulfillmentType, OrderSource } from '@/types/store.types';
import type { ApiResponse } from '@/types/api.types';
import type { Store } from '@/types/store.types';

// ==================== Mocks ====================

// Mock react-router-dom useParams
const mockParams: Record<string, string> = {
  storeSlug: 'test-store',
  orderNumber: 'ORD-001',
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

// Mock the publicStoreApi module
const mockGetStore = vi.fn();
const mockTrackOrder = vi.fn();

vi.mock('@/services/api/public-store.api', () => ({
  publicStoreApi: {
    getStore: (...args: unknown[]) => mockGetStore(...args),
    trackOrder: (...args: unknown[]) => mockTrackOrder(...args),
    submitPaymentProof: vi.fn(),
  },
}));

// Mock SCSS import so vitest doesn't choke on it
vi.mock('@/pages/OrderTrackingPage.scss', () => ({}));

// ==================== Test Data ====================

function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    id: 'store-1',
    storeName: 'Test Store',
    storeSlug: 'test-store',
    description: 'A test store',
    phone: '08012345678',
    email: 'store@test.com',
    country: 'NG',
    isActive: true,
    acceptOrders: true,
    minimumOrderKobo: 0,
    deliveryFeeKobo: 50000,
    pickupAvailable: true,
    deliveryAvailable: true,
    acceptBankTransfer: true,
    acceptCash: true,
    acceptOnlinePayment: false,
    primaryColor: '#0f62fe',
    currency: 'NGN',
    publicUrl: 'https://store.accurify.ng/test-store',
    subaccountVerified: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeOrder(overrides: Partial<StoreOrder> = {}): StoreOrder {
  return {
    id: 'order-1',
    storeId: 'store-1',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    customerPhone: '08011112222',
    customerEmail: 'john@test.com',
    customerAddress: '123 Lagos Road',
    source: OrderSource.STOREFRONT,
    status: OrderStatus.PENDING,
    fulfillmentType: FulfillmentType.DELIVERY,
    subtotalKobo: 500000,
    discountKobo: 0,
    taxKobo: 37500,
    deliveryFeeKobo: 50000,
    totalKobo: 587500,
    paymentStatus: OrderPaymentStatus.UNPAID,
    paidAmountKobo: 0,
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Widget A',
        productSku: 'WGT-A',
        unitPriceKobo: 250000,
        quantity: 2,
        totalKobo: 500000,
      },
    ],
    createdAt: '2025-06-15T10:30:00Z',
    updatedAt: '2025-06-15T10:30:00Z',
    ...overrides,
  };
}

function storeApiResponse(store: Store): ApiResponse<Store> {
  return { success: true, data: store };
}

function orderApiResponse(order: StoreOrder): ApiResponse<StoreOrder> {
  return { success: true, data: order };
}

// ==================== Helpers ====================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter>
          <OrderTrackingPage />
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

// ==================== Tests ====================

describe('OrderTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.storeSlug = 'test-store';
    mockParams.orderNumber = 'ORD-001';
  });

  // ---------- Loading state ----------

  describe('loading state', () => {
    it('shows a loading indicator while data is being fetched', () => {
      // Queries are enabled but the promises never resolve, so the component
      // stays in its isLoading branch.
      mockGetStore.mockReturnValue(new Promise(() => {}));
      mockTrackOrder.mockReturnValue(new Promise(() => {}));

      renderPage();

      expect(screen.getByText('Loading order...')).toBeInTheDocument();
    });
  });

  // ---------- Error / not-found state ----------

  describe('error state', () => {
    it('shows "Order Not Found" when the API call rejects', async () => {
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockRejectedValue(new Error('Network error'));

      renderPage();

      expect(await screen.findByText('Order Not Found')).toBeInTheDocument();
      expect(screen.getByText(/couldn.*find an order/i)).toBeInTheDocument();
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    it('shows "Order Not Found" when the API returns no data', async () => {
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue({ success: true, data: null });

      renderPage();

      expect(await screen.findByText('Order Not Found')).toBeInTheDocument();
    });

    it('renders a "Try Again" button', async () => {
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockRejectedValue(new Error('fail'));

      renderPage();

      expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('renders a "Back to Store" link when storeSlug is present', async () => {
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockRejectedValue(new Error('fail'));

      renderPage();

      expect(await screen.findByRole('button', { name: /back to store/i })).toBeInTheDocument();
    });
  });

  // ---------- Status display ----------

  describe('status display', () => {
    const statusCases: Array<{ status: OrderStatus; label: string }> = [
      { status: OrderStatus.PENDING, label: 'Pending' },
      { status: OrderStatus.CONFIRMED, label: 'Confirmed' },
      { status: OrderStatus.PROCESSING, label: 'Processing' },
      { status: OrderStatus.READY, label: 'Ready' },
      { status: OrderStatus.COMPLETED, label: 'Completed' },
    ];

    it.each(statusCases)(
      'renders "$label" tag when status is $status',
      async ({ status, label }) => {
        const order = makeOrder({ status });
        mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
        mockTrackOrder.mockResolvedValue(orderApiResponse(order));

        renderPage();

        // The status label appears as a Carbon Tag and possibly also in
        // the progress tracker step labels, so use findAllByText.
        const elements = await screen.findAllByText(label);
        expect(elements.length).toBeGreaterThanOrEqual(1);

        // Verify the status tag specifically: Carbon Tags render with
        // a title attribute matching the label text.
        const tagElement = elements.find(
          (el) => el.closest('[class*="cds--tag"]') !== null,
        );
        expect(tagElement).toBeDefined();
      },
    );

    it('renders the order number heading', async () => {
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(makeOrder()));

      renderPage();

      expect(await screen.findByText('Order ORD-001')).toBeInTheDocument();
    });

    it('renders order items with product name and quantity', async () => {
      const order = makeOrder();
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(order));

      renderPage();

      expect(await screen.findByText('Widget A')).toBeInTheDocument();
      expect(screen.getByText('x2')).toBeInTheDocument();
    });

    it('renders the payment status tag', async () => {
      const order = makeOrder({ paymentStatus: OrderPaymentStatus.PAID });
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(order));

      renderPage();

      expect(await screen.findByText('Paid')).toBeInTheDocument();
    });

    it('renders the progress tracker steps for non-cancelled orders', async () => {
      const order = makeOrder({ status: OrderStatus.PROCESSING });
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(order));

      renderPage();

      // Wait for content to load by finding order number heading
      expect(await screen.findByText('Order ORD-001')).toBeInTheDocument();

      // Step labels are rendered in the progress tracker. Some labels may
      // also appear as Carbon Tags (e.g. "Processing"), so use getAllByText.
      expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Processing').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ready').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    });

    it('shows cancellation banner for cancelled orders', async () => {
      const order = makeOrder({
        status: OrderStatus.CANCELLED,
        cancellationReason: 'Customer requested cancellation',
      });
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(order));

      renderPage();

      expect(await screen.findByText('Cancelled')).toBeInTheDocument();
      expect(screen.getByText(/this order has been cancelled/i)).toBeInTheDocument();
      expect(screen.getByText('Customer requested cancellation')).toBeInTheDocument();
    });

    it('renders customer delivery details', async () => {
      const order = makeOrder({
        fulfillmentType: FulfillmentType.DELIVERY,
        customerName: 'Jane Doe',
        customerPhone: '08099887766',
        customerAddress: '42 Lekki Phase 1',
      });
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(order));

      renderPage();

      expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('08099887766')).toBeInTheDocument();
      expect(screen.getByText('42 Lekki Phase 1')).toBeInTheDocument();
    });

    it('renders store contact information', async () => {
      const store = makeStore({ storeName: 'Naija Store', phone: '08033334444', email: 'info@naija.com' });
      mockGetStore.mockResolvedValue(storeApiResponse(store));
      mockTrackOrder.mockResolvedValue(orderApiResponse(makeOrder()));

      renderPage();

      // Store name appears in both the header brand and the contact card,
      // so use findAllByText and verify at least one occurrence.
      const storeNames = await screen.findAllByText('Naija Store');
      expect(storeNames.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('08033334444')).toBeInTheDocument();
      expect(screen.getByText('info@naija.com')).toBeInTheDocument();
    });

    it('renders the "Continue Shopping" link', async () => {
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(makeOrder()));

      renderPage();

      expect(await screen.findByText('Continue Shopping')).toBeInTheDocument();
    });

    it('renders subtotal, VAT, delivery fee, and total', async () => {
      const order = makeOrder({
        subtotalKobo: 1000000,
        taxKobo: 75000,
        deliveryFeeKobo: 50000,
        totalKobo: 1125000,
        discountKobo: 0,
      });
      mockGetStore.mockResolvedValue(storeApiResponse(makeStore()));
      mockTrackOrder.mockResolvedValue(orderApiResponse(order));

      renderPage();

      expect(await screen.findByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('VAT')).toBeInTheDocument();
      expect(screen.getByText('Delivery Fee')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });
});
