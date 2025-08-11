import { ErrorHandler, ValidationError } from './error-handler';

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'date' | 'array' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class ValidationUtils {
  /**
   * Validate data against schema
   */
  static validate(data: Record<string, any>, schema: ValidationSchema): void {
    const errors: Array<{ field: string; message: string; value: any }> = [];

    for (const [field, rule] of Object.entries(schema)) {
      try {
        this.validateField(data[field], field, rule);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push({
            field: error.field || field,
            message: error.message,
            value: error.value
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Validation failed: ${errors.map(e => e.message).join(', ')}`,
        errors[0].field,
        errors[0].value
      );
    }
  }

  /**
   * Validate individual field
   */
  private static validateField(value: any, fieldName: string, rule: ValidationRule): void {
    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }

    // Skip further validation if value is empty and not required
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Type validation
    if (rule.type) {
      this.validateType(value, rule.type, fieldName);
    }

    // Length validation for strings
    if (rule.minLength !== undefined || rule.maxLength !== undefined) {
      if (typeof value === 'string') {
        ErrorHandler.validateStringLength(
          value,
          rule.minLength || 0,
          rule.maxLength || Infinity,
          fieldName
        );
      }
    }

    // Numeric range validation
    if (rule.min !== undefined || rule.max !== undefined) {
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          throw new ValidationError(
            `${fieldName} must be at least ${rule.min}`,
            fieldName,
            value
          );
        }
        if (rule.max !== undefined && value > rule.max) {
          throw new ValidationError(
            `${fieldName} must be no more than ${rule.max}`,
            fieldName,
            value
          );
        }
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        throw new ValidationError(
          `${fieldName} format is invalid`,
          fieldName,
          value
        );
      }
    }

    // Enum validation
    if (rule.enum) {
      ErrorHandler.validateEnum(value, rule.enum, fieldName);
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        const message = typeof result === 'string' ? result : `${fieldName} is invalid`;
        throw new ValidationError(message, fieldName, value);
      }
    }
  }

  /**
   * Validate type
   */
  private static validateType(value: any, type: string, fieldName: string): void {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value);
        }
        break;
      case 'email':
        ErrorHandler.validateEmail(value, fieldName);
        break;
      case 'phone':
        ErrorHandler.validatePhone(value, fieldName);
        break;
      case 'date':
        ErrorHandler.validateDate(value, fieldName);
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new ValidationError(`${fieldName} must be a boolean`, fieldName, value);
        }
        break;
    }
  }

  /**
   * Common validation schemas
   */
  static readonly schemas = {
    // User validation
    user: {
      name: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email' as const },
      phone: { required: true, type: 'phone' as const }
    },

    // Dinner reservation validation
    dinnerReservation: {
      userId: { required: true, type: 'string' as const },
      numberOfGuests: { required: true, type: 'number' as const, min: 1, max: 10 },
      guestDetails: { required: true, type: 'array' as const, minLength: 1, maxLength: 10 },
      totalAmount: { required: true, type: 'number' as const, min: 75 }
    },

    // Accommodation booking validation
    accommodationBooking: {
      userId: { required: true, type: 'string' as const },
      accommodationType: { 
        required: true, 
        type: 'string' as const, 
        enum: ['standard', 'premium', 'luxury'] 
      },
      checkInDate: { required: true, type: 'date' as const },
      checkOutDate: { required: true, type: 'date' as const },
      numberOfGuests: { required: true, type: 'number' as const, min: 1, max: 6 },
      totalAmount: { required: true, type: 'number' as const, min: 100 }
    },

    // Brochure order validation
    brochureOrder: {
      userId: { required: true, type: 'string' as const },
      quantity: { required: true, type: 'number' as const, min: 1, max: 10 },
      brochureType: { 
        required: true, 
        type: 'string' as const, 
        enum: ['digital', 'physical'] 
      },
      recipientDetails: { required: true, type: 'array' as const, minLength: 1, maxLength: 10 },
      totalAmount: { required: true, type: 'number' as const, min: 25 }
    },

    // Goodwill message validation
    goodwillMessage: {
      userId: { required: true, type: 'string' as const },
      message: { required: false, type: 'string' as const, maxLength: 500 },
      donationAmount: { required: true, type: 'number' as const, min: 10 },
      anonymous: { required: true, type: 'boolean' as const }
    },

    // Donation validation
    donation: {
      userId: { required: true, type: 'string' as const },
      amount: { required: true, type: 'number' as const, min: 5 },
      anonymous: { required: true, type: 'boolean' as const }
    },

    // Badge generation validation
    badgeGeneration: {
      userId: { required: true, type: 'string' as const },
      attendeeName: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
      attendeeTitle: { required: false, type: 'string' as const, maxLength: 100 },
      organization: { required: false, type: 'string' as const, maxLength: 150 }
    }
  };

  /**
   * Validate guest details array
   */
  static validateGuestDetails(guestDetails: any[], fieldName: string = 'guestDetails'): void {
    if (!Array.isArray(guestDetails)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, guestDetails);
    }

    guestDetails.forEach((guest, index) => {
      if (!guest.name || typeof guest.name !== 'string' || guest.name.trim().length === 0) {
        throw new ValidationError(
          `Guest ${index + 1} name is required`,
          `${fieldName}[${index}].name`,
          guest.name
        );
      }

      if (guest.email && typeof guest.email === 'string' && guest.email.trim()) {
        ErrorHandler.validateEmail(guest.email, `${fieldName}[${index}].email`);
      }

      if (guest.phone && typeof guest.phone === 'string' && guest.phone.trim()) {
        ErrorHandler.validatePhone(guest.phone, `${fieldName}[${index}].phone`);
      }
    });
  }

  /**
   * Validate recipient details array
   */
  static validateRecipientDetails(
    recipientDetails: any[], 
    brochureType: string,
    fieldName: string = 'recipientDetails'
  ): void {
    if (!Array.isArray(recipientDetails)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, recipientDetails);
    }

    recipientDetails.forEach((recipient, index) => {
      if (!recipient.name || typeof recipient.name !== 'string' || recipient.name.trim().length === 0) {
        throw new ValidationError(
          `Recipient ${index + 1} name is required`,
          `${fieldName}[${index}].name`,
          recipient.name
        );
      }

      // Email is required for digital brochures
      if (brochureType === 'digital') {
        if (!recipient.email || typeof recipient.email !== 'string' || recipient.email.trim().length === 0) {
          throw new ValidationError(
            `Recipient ${index + 1} email is required for digital brochures`,
            `${fieldName}[${index}].email`,
            recipient.email
          );
        }
        ErrorHandler.validateEmail(recipient.email, `${fieldName}[${index}].email`);
      }

      // Validate email if provided
      if (recipient.email && typeof recipient.email === 'string' && recipient.email.trim()) {
        ErrorHandler.validateEmail(recipient.email, `${fieldName}[${index}].email`);
      }

      // Validate phone if provided
      if (recipient.phone && typeof recipient.phone === 'string' && recipient.phone.trim()) {
        ErrorHandler.validatePhone(recipient.phone, `${fieldName}[${index}].phone`);
      }
    });
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    checkInDate: string | Date,
    checkOutDate: string | Date,
    fieldNames: { checkIn: string; checkOut: string } = { checkIn: 'checkInDate', checkOut: 'checkOutDate' }
  ): void {
    ErrorHandler.validateFutureDate(checkInDate, fieldNames.checkIn);
    ErrorHandler.validateDate(checkOutDate, fieldNames.checkOut);

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      throw new ValidationError(
        'Check-out date must be after check-in date',
        fieldNames.checkOut,
        checkOutDate
      );
    }
  }

  /**
   * Sanitize input data
   */
  static sanitize(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Trim whitespace and remove potentially harmful characters
        sanitized[key] = value.trim().replace(/[<>]/g, '');
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? item.trim().replace(/[<>]/g, '') : item
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}