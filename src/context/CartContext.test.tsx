import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import { ProductCategory } from '@/types/enums';
import type { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const TEST_SLUG = 'test-store';

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider storeSlug={TEST_SLUG}>{children}</CartProvider>;
}

const mockProduct = {
  id: 'prod-1',
  name: 'Test Product',
  slug: 'test-product',
  category: ProductCategory.OTHER,
  categoryDisplayName: 'General',
  unitPrice: 1000,
  costPrice: 500,
  priceWithVat: 1075,
  unit: 'piece',
  stockQuantity: 50,
  reorderLevel: 5,
  taxable: true,
  vatRate: 7.5,
  active: true,
  lowStock: false,
  outOfStock: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.cart).toEqual([]);
    expect(result.current.getCartItemCount()).toBe(0);
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 1 });
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].productId).toBe('prod-1');
    expect(result.current.cart[0].quantity).toBe(1);
    expect(result.current.getCartItemCount()).toBe(1);
  });

  it('increments quantity when adding existing item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 1 });
    });
    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 2 });
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);
    expect(result.current.getCartItemCount()).toBe(3);
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 1 });
    });
    act(() => {
      result.current.removeFromCart('prod-1');
    });

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.getCartItemCount()).toBe(0);
  });

  it('updates item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 1 });
    });
    act(() => {
      result.current.updateQuantity('prod-1', 5);
    });

    expect(result.current.cart[0].quantity).toBe(5);
    expect(result.current.getCartItemCount()).toBe(5);
  });

  it('removes item when quantity updated to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 3 });
    });
    act(() => {
      result.current.updateQuantity('prod-1', 0);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it('clears entire cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 2 });
    });
    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.getCartItemCount()).toBe(0);
  });

  it('persists cart to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'prod-1', product: mockProduct, quantity: 1 });
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      `cart_${TEST_SLUG}`,
      expect.any(String)
    );
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within CartProvider');
  });
});
