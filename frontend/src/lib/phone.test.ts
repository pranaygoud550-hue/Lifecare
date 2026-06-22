import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay, isValidIndianMobile, normalizePhone } from './phone';

describe('phone', () => {
  it('normalizes +91 prefix', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
  });

  it('normalizes leading zero', () => {
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });

  it('validates Indian mobile numbers', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('5876543210')).toBe(false);
  });

  it('formats display number', () => {
    expect(formatPhoneDisplay('9876543210')).toBe('+91 98765 43210');
  });
});
