import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatCurrency,
  formatDate,
  formatDateTime,
  toNum,
} from '@/utils/format';

describe('format utilities', () => {
  it('normalizes decimal values from the Go API', () => {
    expect(toNum('150000.50')).toBe(150000.5);
    expect(toNum(undefined)).toBe(0);
    expect(toNum('invalid')).toBe(0);
  });

  it('formats Indonesian Rupiah without decimals', () => {
    expect(formatCurrency('87120')).toContain('87.120');
    expect(formatCurrency('invalid')).toBe('Rp 0');
  });

  it('formats dates in the Jakarta timezone', () => {
    const source = '2026-06-12T17:00:00Z';
    expect(formatDate(source)).toContain('13 Juni 2026');
    expect(formatDateTime(source)).toContain('13 Jun 2026');
  });

  it('formats short and minute countdown values', () => {
    expect(formatCountdown(45)).toBe('45s');
    expect(formatCountdown(60)).toBe('1m');
    expect(formatCountdown(125)).toBe('2m 5s');
  });
});
