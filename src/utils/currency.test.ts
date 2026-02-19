import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, parseCurrencyInput, formatNumber } from './currency';

describe('formatCurrency', () => {
  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats whole numbers', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500');
  });

  it('formats decimal amounts', () => {
    const result = formatCurrency(1500.5);
    expect(result).toContain('1,500.5');
  });

  it('formats large amounts with commas', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1,000,000');
  });
});

describe('formatCurrencyCompact', () => {
  it('returns billions format for >= 1B', () => {
    expect(formatCurrencyCompact(1_500_000_000)).toBe('1.5B');
  });

  it('returns millions format for >= 1M', () => {
    expect(formatCurrencyCompact(2_500_000)).toBe('2.5M');
  });

  it('returns thousands format for >= 1K', () => {
    expect(formatCurrencyCompact(5_000)).toBe('5.0K');
  });

  it('falls back to formatCurrency for small amounts', () => {
    const result = formatCurrencyCompact(500);
    expect(result).toContain('500');
  });
});

describe('parseCurrencyInput', () => {
  it('parses clean number string', () => {
    expect(parseCurrencyInput('1500')).toBe(1500);
  });

  it('parses string with commas', () => {
    expect(parseCurrencyInput('1,500,000')).toBe(1500000);
  });

  it('parses string with spaces', () => {
    expect(parseCurrencyInput('1 500')).toBe(1500);
  });

  it('returns 0 for invalid input', () => {
    expect(parseCurrencyInput('abc')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseCurrencyInput('')).toBe(0);
  });

  it('parses decimal values', () => {
    expect(parseCurrencyInput('1500.75')).toBe(1500.75);
  });
});

describe('formatNumber', () => {
  it('formats with thousands separator', () => {
    expect(formatNumber(1000000)).toContain('1,000,000');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
