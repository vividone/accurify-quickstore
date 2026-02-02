// Business types
export enum BusinessType {
    SERVICE = 'SERVICE',
    GOODS = 'GOODS',
}

// Invoice status
export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
}

// Transaction types
export enum TransactionType {
    INFLOW = 'INFLOW',
    OUTFLOW = 'OUTFLOW',
}

// Transaction categories
export enum TransactionCategory {
    // Inflow categories
    SALES = 'SALES',
    LOAN = 'LOAN',
    CAPITAL = 'CAPITAL',
    REFUND = 'REFUND',
    TRANSFER_IN = 'TRANSFER_IN',
    OTHER_INFLOW = 'OTHER_INFLOW',
    // Outflow categories
    OPERATING_EXPENSE = 'OPERATING_EXPENSE',
    SALARY = 'SALARY',
    RENT = 'RENT',
    UTILITIES = 'UTILITIES',
    INVENTORY = 'INVENTORY',
    EQUIPMENT = 'EQUIPMENT',
    LOAN_REPAYMENT = 'LOAN_REPAYMENT',
    TAX_PAYMENT = 'TAX_PAYMENT',
    TRANSFER_OUT = 'TRANSFER_OUT',
    OTHER_OUTFLOW = 'OTHER_OUTFLOW',
    UNCATEGORIZED = 'UNCATEGORIZED',
}

// Product categories
export enum ProductCategory {
    ELECTRONICS = 'ELECTRONICS',
    CLOTHING = 'CLOTHING',
    FOOD_BEVERAGES = 'FOOD_BEVERAGES',
    HEALTH_BEAUTY = 'HEALTH_BEAUTY',
    HOME_GARDEN = 'HOME_GARDEN',
    AUTOMOTIVE = 'AUTOMOTIVE',
    OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
    BUILDING_MATERIALS = 'BUILDING_MATERIALS',
    AGRICULTURE = 'AGRICULTURE',
    RAW_MATERIALS = 'RAW_MATERIALS',
    TEXTILES = 'TEXTILES',
    MACHINERY = 'MACHINERY',
    FURNITURE = 'FURNITURE',
    SPORTS_LEISURE = 'SPORTS_LEISURE',
    OTHER = 'OTHER',
}

// Stock movement types
export enum StockMovementType {
    PURCHASE = 'PURCHASE',
    SALE = 'SALE',
    ADJUSTMENT_IN = 'ADJUSTMENT_IN',
    ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
    RETURN_FROM_CUSTOMER = 'RETURN_FROM_CUSTOMER',
    RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
    DAMAGED = 'DAMAGED',
    INITIAL = 'INITIAL',
}

// Subscription
export enum SubscriptionPlan {
    FREE = 'FREE',
    PREMIUM_MONTHLY = 'PREMIUM_MONTHLY',
    PREMIUM_YEARLY = 'PREMIUM_YEARLY',
}

export enum SubscriptionStatus {
    ACTIVE = 'ACTIVE',
    TRIALING = 'TRIALING',
    PAST_DUE = 'PAST_DUE',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
}
