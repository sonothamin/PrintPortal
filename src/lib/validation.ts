/**
 * Centralized validation and sanitization utilities for the PrintPortal platform.
 */

// --- Email Validation ---
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// --- Phone Number Validation ---
// Basic validation for common formats (e.g., +1234567890, 0123456789)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-]{10,15}$/;
  return phoneRegex.test(phone.trim());
};

// --- Price / Number Validation ---
export const isValidPrice = (price: string | number): boolean => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(num) && num >= 0;
};

// --- Sanitization Utilities ---
export const sanitizeString = (str: string): string => {
  return str.trim();
};

export const sanitizePrice = (price: string | number): number => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(num) ? 0 : Math.max(0, num);
};

// --- Error Messages ---
export const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number (10-15 digits).',
  INVALID_PRICE: 'Please enter a valid positive number.',
  REQUIRED: 'This field is required.',
};
