import { Types } from "mongoose";

// PDF and WhatsApp Types
export interface UserDetails {
  name: string;
  email: string;
  phone: string;
  registrationId?: string;
}

export interface PDFData {
  userDetails: UserDetails;
  operationDetails: {
    type: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation';
    amount: number;
    paymentReference: string;
    date: Date;
    status: 'confirmed' | 'pending';
    description: string;
    additionalInfo?: string;
  };
  qrCodeData: string;
}

export interface ImageData extends PDFData { }

export interface WhatsAppImageData extends ImageData {
  userDetails: {
    name: string;
    email: string;
    phone: string;
    registrationId: string;
  };
}

// Database Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface Registration {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization?: string;
  jobTitle?: string;

  // Event Options
  dinnerTicket: boolean;
  accommodationNeeded: boolean;
  accommodationType?: "standard" | "premium" | "luxury";

  // Additional Services
  brochurePurchase: boolean;
  goodwillMessage: boolean;
  goodwillText?: string;
  goodwillAmount?: number;
  goodwillApproved?: boolean;

  // Donations
  donation: boolean;
  donationAmount?: number;
  donationAnonymous: boolean;

  // Payment
  totalAmount: number;
  paymentStatus: "pending" | "completed" | "failed";
  paymentId?: string;
  paymentProvider?: "paystack" | "flutterwave";

  // QR Code
  qrCode: string;
  qrCodeGenerated: boolean;

  // Check-in
  checkedIn: boolean;
  checkInTime?: Date;
  checkInBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInLog {
  id: string;
  registrationId: string;
  qrCode: string;
  checkedInBy: string;
  timestamp: Date;
  successful: boolean;
  reason?: string;
}

export interface GoodwillMessage {
  id: string;
  registrationId: string;
  message: string;
  amount: number;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface Donation {
  id: string;
  registrationId?: string;
  amount: number;
  anonymous: boolean;
  donorName?: string;
  donorEmail?: string;
  createdAt: Date;
}

// Form Types
export interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization?: string;
  jobTitle?: string;
  dinnerTicket: boolean;
  accommodationNeeded: boolean;
  accommodationType?: string;
  brochurePurchase: boolean;
  goodwillMessage: boolean;
  goodwillText?: string;
  goodwillAmount?: number;
  donation: boolean;
  donationAmount?: number;
  donationAnonymous: boolean;
  agreeToTerms: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface CheckInResult {
  success: boolean;
  attendee?: {
    id: string;
    name: string;
    email: string;
    ticketType: string;
    registrationDate: string;
  };
  message: string;
  timestamp?: string;
  alreadyCheckedIn?: boolean;
}

// Payment Types
export interface PaymentInitiation {
  amount: number;
  email: string;
  registrationId: string;
  callback_url: string;
}

export interface PaymentVerification {
  reference: string;
  status: "success" | "failed";
  amount: number;
  transaction_date: string;
}

export interface RegistrationType {
  email: string;
  fullName: string;
  phoneNumber: string;
  amount: number;
  quantity: number;
  persons: [];
}

// Generic interface for all payment-based collections
export interface PaymentRecord {
  userId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  quantity: number;
  confirm: boolean;
  collected: boolean;
  persons: [];
}

// WASender API Types
export interface WASenderMessage {
  to: string;
  text: string;
  [key: string]: any;
}

export interface WASenderDocument {
  to: string;
  text: string;
  documentUrl: string;
  fileName: string;
}

export interface WASenderResult {
  success: boolean;
  data?: {
    msgId?: string | number;
    jid?: string;
    status?: string;
    message?: string;
  };
  error?: string;
  message?: string;
}
