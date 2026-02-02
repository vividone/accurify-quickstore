const NGN_FORMATTER = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
    return NGN_FORMATTER.format(amount);
}

export function formatCurrencyCompact(amount: number): string {
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
}

export function parseCurrencyInput(value: string): number {
    // Remove currency symbol and commas
    const cleaned = value.replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-NG').format(num);
}
