/**
 * Utility functions for formatting prices consistently across the application
 */

/**
 * Format a number as a price with proper comma separation
 * @param amount - The amount to format
 * @param currency - The currency symbol (default: ₦)
 * @param showCurrency - Whether to show the currency symbol (default: true)
 * @returns Formatted price string
 */
export function formatPrice(amount: number | string, currency: string = '₦', showCurrency: boolean = true): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return showCurrency ? `${currency}0` : '0';
  }

  const formatted = numAmount.toLocaleString('en-US');
  return showCurrency ? `${currency}${formatted}` : formatted;
}

/**
 * Format a price for display in forms and UI components
 * @param amount - The amount to format
 * @returns Formatted price string with ₦ symbol
 */
export function formatDisplayPrice(amount: number | string): string {
  return formatPrice(amount, '₦', true);
}

/**
 * Format a price for input fields (without currency symbol)
 * @param amount - The amount to format
 * @returns Formatted price string without currency symbol
 */
export function formatInputPrice(amount: number | string): string {
  return formatPrice(amount, '', false);
}

/**
 * Parse a formatted price string back to a number
 * @param priceString - The formatted price string
 * @returns The numeric value
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[₦,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format price for API responses and data display
 * @param amount - The amount to format
 * @returns Formatted price object with different formats
 */
export function formatPriceData(amount: number) {
  return {
    raw: amount,
    formatted: formatDisplayPrice(amount),
    display: formatDisplayPrice(amount),
    input: formatInputPrice(amount),
    api: amount
  };
}

/**
 * Validate if a price meets minimum requirements
 * @param amount - The amount to validate
 * @param minimum - The minimum allowed amount
 * @returns Validation result
 */
export function validatePrice(amount: number | string, minimum: number = 0): {
  isValid: boolean;
  error?: string;
} {
  const numAmount = typeof amount === 'string' ? parsePrice(amount) : amount;

  if (isNaN(numAmount) || numAmount < 0) {
    return {
      isValid: false,
      error: 'Please enter a valid amount'
    };
  }

  if (numAmount < minimum) {
    return {
      isValid: false,
      error: `Minimum amount is ${formatDisplayPrice(minimum)}`
    };
  }

  return { isValid: true };
}