/**
 * Phone number formatting utilities
 */

export class PhoneUtils {
  /**
   * Format phone number to standard international format
   */
  static formatPhoneNumber(phone: string): string {
    if (!phone) return phone;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Handle Nigerian numbers
    if (cleaned.startsWith('234')) {
      // Already has country code
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      // Nigerian number starting with 0, replace with +234
      return `+234${cleaned.substring(1)}`;
    } else if (cleaned.length === 10 && /^[789]/.test(cleaned)) {
      // Nigerian number without leading 0
      return `+234${cleaned}`;
    } else if (cleaned.length >= 7 && cleaned.length <= 15) {
      // International number without country code
      return `+${cleaned}`;
    }

    // Return original if can't format
    return phone;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): {
    valid: boolean;
    message?: string;
  } {
    if (!phone || phone.trim().length === 0) {
      return { valid: true }; // Optional field
    }

    const formatted = this.formatPhoneNumber(phone);
    const cleanedPhone = formatted.replace(/\D/g, '');

    if (cleanedPhone.length < 7) {
      return {
        valid: false,
        message: "Phone number is too short"
      };
    }

    if (cleanedPhone.length > 15) {
      return {
        valid: false,
        message: "Phone number is too long"
      };
    }

    return { valid: true };
  }

  /**
   * Format phone number for display (with formatting)
   */
  static formatForDisplay(phone: string): string {
    const formatted = this.formatPhoneNumber(phone);

    // Add formatting for Nigerian numbers
    if (formatted.startsWith('+234')) {
      const number = formatted.substring(4);
      if (number.length === 10) {
        return `+234 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
      }
    }

    return formatted;
  }

  /**
   * Clean phone number for storage (remove formatting)
   */
  static cleanForStorage(phone: string): string {
    return this.formatPhoneNumber(phone);
  }

  /**
   * Check if phone number is Nigerian
   */
  static isNigerianNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('234') ||
      (cleaned.startsWith('0') && cleaned.length === 11) ||
      (cleaned.length === 10 && /^[789]/.test(cleaned));
  }

  /**
   * Get country code from phone number
   */
  static getCountryCode(phone: string): string {
    const formatted = this.formatPhoneNumber(phone);
    if (formatted.startsWith('+')) {
      const match = formatted.match(/^\+(\d{1,4})/);
      return match ? match[1] : '';
    }
    return '';
  }
}