import { describe, expect, it } from 'vitest';
import { cn, formatCurrency, getInitials } from './utils';

describe('utils', () => {
  it('merges tailwind classes', () => {
    expect(cn('px-2', 'px-4', false && 'hidden')).toBe('px-4');
  });

  it('formats INR currency', () => {
    expect(formatCurrency(1500)).toContain('1,500');
  });

  it('builds initials', () => {
    expect(getInitials('Priya', 'Sharma')).toBe('PS');
    expect(getInitials('Admin')).toBe('A');
  });
});
