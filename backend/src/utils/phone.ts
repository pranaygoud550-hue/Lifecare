/** Normalize phone to 10-digit Indian mobile (strips country code and non-digits). */
export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const isValidIndianMobile = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone);

export const phoneFromEmail = (email: string): string | null => {
  const match = email.match(/^(\d{10})@phone\.lifecare\.local$/i);
  return match ? match[1] : null;
};
