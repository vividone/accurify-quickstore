import type { ProductCategory } from './enums';

export interface Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    sku?: string;
    barcode?: string;
    category: ProductCategory;
    categoryDisplayName: string;
    unitPrice: number;
    costPrice?: number;
    priceWithVat: number;
    unit: string;
    stockQuantity: number;
    reorderLevel: number;
    taxable: boolean;
    vatRate: number;
    active: boolean;
    imageUrl?: string;
    lowStock: boolean;
    outOfStock: boolean;
    profitMargin?: number;
    createdAt: string;
    updatedAt: string;
    // Inventory 2.0 fields
    lowStockThreshold?: number;
    isPublicVisible?: boolean;
    enableBatchTracking?: boolean;
    totalBatchQuantity?: number;
    activeBatchCount?: number;
    expiringBatchCount?: number;
}

export interface ProductRequest {
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    category: ProductCategory;
    unitPrice: number;
    costPrice?: number;
    unit?: string;
    stockQuantity?: number;
    reorderLevel?: number;
    taxable?: boolean;
    vatRate?: number;
    imageUrl?: string;
    // Inventory 2.0 fields
    lowStockThreshold?: number;
    isPublicVisible?: boolean;
    enableBatchTracking?: boolean;
}

export interface ProductSummary {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalInventoryValue: number;
    totalRetailValue: number;
}

export interface ProductFilters {
    active?: boolean;
    category?: ProductCategory;
    search?: string;
}

// ==================== Batch Tracking (Inventory 2.0) ====================

export interface ProductBatch {
    id: string;
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    expiryDate?: string;
    manufactureDate?: string;
    costPriceKobo?: number;
    costPrice?: number;  // In naira
    supplierName?: string;
    receivedDate: string;
    notes?: string;
    isActive: boolean;
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysUntilExpiry?: number;
    createdAt: string;
    updatedAt: string;
}

export interface BatchRequest {
    batchNumber: string;
    quantity: number;
    expiryDate?: string;
    manufactureDate?: string;
    costPrice?: number;  // In naira
    supplierName?: string;
    receivedDate?: string;
    notes?: string;
}

export interface FefoSuggestion {
    batchId: string;
    batchNumber: string;
    expiryDate?: string;
    availableQuantity: number;
    suggestedQuantity: number;
    daysUntilExpiry?: number;
}

export interface ExpiryAlertResponse {
    expiredCount: number;
    expiringCount: number;
    expiredBatches: ProductBatch[];
    expiringBatches: ProductBatch[];
}
