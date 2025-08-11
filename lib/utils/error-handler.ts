import { NextResponse } from 'next/server';

export enum ErrorCode {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Payment Errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  INVALID_PAYMENT_REFERENCE = 'INVALID_PAYMENT_REFERENCE',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYSTACK_ERROR = 'PAYSTACK_ERROR',
  WASENDER_ERROR = 'WASENDER_ERROR',
  VERCEL_BLOB_ERROR = 'VERCEL_BLOB_ERROR',
  
  // Business Logic Errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: any;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly field?: string;
  public readonly value?: any;
  public readonly context?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    field?: string,
    value?: any,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.value = value;
    this.context = context;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, field, value);
  }
}

export class PaymentError extends AppError {
  constructor(code: ErrorCode, message: string, context?: Record<string, any>) {
    super(code, message, 400, undefined, undefined, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.DATABASE_ERROR, message, 500, undefined, undefined, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR, 
      `${service} service error: ${message}`, 
      503, 
      undefined, 
      undefined, 
      { service, ...context }
    );
  }
}

export class ErrorHandler {
  /**
   * Handle and format errors for API responses
   */
  static handleError(error: unknown): NextResponse {
    console.error('Error occurred:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          field: error.field,
          context: error.context
        },
        { status: error.statusCode }
      );
    }

    // Handle Mongoose validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationError = error as any;
      const errors = Object.values(validationError.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: ErrorCode.VALIDATION_ERROR,
          details: errors
        },
        { status: 400 }
      );
    }

    // Handle Mongoose duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate record found',
          code: ErrorCode.DUPLICATE_RECORD
        },
        { status: 409 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_SERVER_ERROR
      },
      { status: 500 }
    );
  }

  /**
   * Validate required fields
   */
  static validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        missingFields[0]
      );
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string, fieldName: string = 'email'): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', fieldName, email);
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhone(phone: string, fieldName: string = 'phone'): void {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      throw new ValidationError('Invalid phone number format', fieldName, phone);
    }
  }

  /**
   * Validate amount
   */
  static validateAmount(amount: number, minAmount: number = 0, fieldName: string = 'amount'): void {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ValidationError('Amount must be a valid number', fieldName, amount);
    }

    if (amount < minAmount) {
      throw new ValidationError(
        `Amount must be at least ${minAmount}`,
        fieldName,
        amount
      );
    }
  }

  /**
   * Validate date
   */
  static validateDate(date: string | Date, fieldName: string = 'date'): void {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format', fieldName, date);
    }
  }

  /**
   * Validate future date
   */
  static validateFutureDate(date: string | Date, fieldName: string = 'date'): void {
    this.validateDate(date, fieldName);
    
    const dateObj = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (dateObj < now) {
      throw new ValidationError('Date cannot be in the past', fieldName, date);
    }
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string, 
    minLength: number = 0, 
    maxLength: number = Infinity, 
    fieldName: string = 'field'
  ): void {
    if (typeof value !== 'string') {
      throw new ValidationError('Value must be a string', fieldName, value);
    }

    if (value.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} characters long`,
        fieldName,
        value
      );
    }

    if (value.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must be no more than ${maxLength} characters long`,
        fieldName,
        value
      );
    }
  }

  /**
   * Validate enum value
   */
  static validateEnum<T>(
    value: T, 
    allowedValues: T[], 
    fieldName: string = 'field'
  ): void {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        fieldName,
        value
      );
    }
  }

  /**
   * Validate array
   */
  static validateArray(
    value: any[], 
    minLength: number = 0, 
    maxLength: number = Infinity, 
    fieldName: string = 'field'
  ): void {
    if (!Array.isArray(value)) {
      throw new ValidationError('Value must be an array', fieldName, value);
    }

    if (value.length < minLength) {
      throw new ValidationError(
        `${fieldName} must contain at least ${minLength} items`,
        fieldName,
        value
      );
    }

    if (value.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must contain no more than ${maxLength} items`,
        fieldName,
        value
      );
    }
  }

  /**
   * Create user-friendly error messages
   */
  static createUserFriendlyMessage(error: AppError): string {
    const friendlyMessages: Record<ErrorCode, string> = {
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorCode.INVALID_INPUT]: 'The information provided is not valid.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
      [ErrorCode.INVALID_EMAIL]: 'Please enter a valid email address.',
      [ErrorCode.INVALID_PHONE]: 'Please enter a valid phone number.',
      [ErrorCode.INVALID_AMOUNT]: 'Please enter a valid amount.',
      [ErrorCode.UNAUTHORIZED]: 'You need to be logged in to perform this action.',
      [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
      [ErrorCode.INVALID_TOKEN]: 'Your session has expired. Please log in again.',
      [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed. Please try again.',
      [ErrorCode.PAYMENT_CANCELLED]: 'Payment was cancelled.',
      [ErrorCode.INVALID_PAYMENT_REFERENCE]: 'Invalid payment reference.',
      [ErrorCode.DUPLICATE_PAYMENT]: 'This payment has already been processed.',
      [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction.',
      [ErrorCode.DATABASE_ERROR]: 'A system error occurred. Please try again later.',
      [ErrorCode.RECORD_NOT_FOUND]: 'The requested information was not found.',
      [ErrorCode.DUPLICATE_RECORD]: 'This record already exists.',
      [ErrorCode.CONSTRAINT_VIOLATION]: 'The operation violates system constraints.',
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service is temporarily unavailable.',
      [ErrorCode.PAYSTACK_ERROR]: 'Payment service is temporarily unavailable.',
      [ErrorCode.WASENDER_ERROR]: 'Notification service is temporarily unavailable.',
      [ErrorCode.VERCEL_BLOB_ERROR]: 'File storage service is temporarily unavailable.',
      [ErrorCode.BUSINESS_RULE_VIOLATION]: 'This operation is not allowed.',
      [ErrorCode.INVALID_STATE]: 'The current state does not allow this operation.',
      [ErrorCode.OPERATION_NOT_ALLOWED]: 'This operation is not permitted.',
      [ErrorCode.QUOTA_EXCEEDED]: 'You have exceeded the allowed limit.',
      [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable.',
      [ErrorCode.TIMEOUT_ERROR]: 'The request timed out. Please try again.',
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait and try again.'
    };

    return friendlyMessages[error.code] || error.message;
  }

  /**
   * Log error for monitoring
   */
  static logError(error: AppError, context?: Record<string, any>): void {
    const logData = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      field: error.field,
      value: error.value,
      context: { ...error.context, ...context },
      stack: error.stack
    };

    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    console.error('Application Error:', JSON.stringify(logData, null, 2));
  }
}