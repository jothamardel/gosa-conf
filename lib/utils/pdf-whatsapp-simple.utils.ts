// Temporary simple version without blob dependencies
// This file provides the basic PDF functionality without Vercel Blob integration

import connectDB from "../mongodb";
import { Types } from "mongoose";
import { QRCodeService } from "../services/qr-code.service";
import { WhatsAppPDFService, DeliveryResult } from "../services/whatsapp-pdf.service";
import { Wasender } from "../wasender-api";
import {
  User,
  ConventionRegistration,
  DinnerReservation,
  Accommodation,
  ConventionBrochure,
  GoodwillMessage,
  Donation,
} from "../schema";

export interface PDFUserDetails {
  name: string;
  email: string;
  phone: string;
  registrationId: string;
}

export interface PDFOperationDetails {
  type: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation';
  amount: number;
  paymentReference: string;
  date: Date;
  status: 'confirmed' | 'pending';
  description: string;
  additionalInfo?: string;
}

export interface PDFData {
  userDetails: PDFUserDetails;
  operationDetails: PDFOperationDetails;
  qrCodeData: string;
}

export interface WhatsAppPDFData extends PDFData {
  // Inherits all PDFData properties for WhatsApp delivery
}

export class PDFWhatsAppUtils {
  /**
   * Send convention registration confirmation with PDF
   */
  static async sendConventionConfirmation(
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      console.log('Sending convention confirmation PDF for:', userDetails.name);

      const pdfData: WhatsAppPDFData = {
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          registrationId: userDetails.registrationId
        },
        operationDetails: {
          type: 'convention',
          amount: record.amount || 0,
          paymentReference: record.paymentReference,
          date: record.createdAt || new Date(),
          status: record.confirm ? 'confirmed' : 'pending',
          description: 'GOSA 2025 Convention Registration',
          additionalInfo: this.formatConventionAdditionalInfo(record)
        },
        qrCodeData
      };

      const result = await WhatsAppPDFService.generateAndSendPDF(pdfData);

      return result;
    } catch (error) {
      console.error('Error sending convention confirmation:', error);

      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send dinner reservation confirmation with PDF
   */
  static async sendDinnerConfirmation(
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    try {
      console.log('Sending dinner confirmation PDF for:', userDetails.name);

      const pdfData: WhatsAppPDFData = {
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          registrationId: userDetails.registrationId
        },
        operationDetails: {
          type: 'dinner',
          amount: record.totalAmount || 0,
          paymentReference: record.paymentReference,
          date: record.createdAt || new Date(),
          status: record.confirmed ? 'confirmed' : 'pending',
          description: 'GOSA 2025 Convention Dinner Reservation',
          additionalInfo: this.formatDinnerAdditionalInfo(record)
        },
        qrCodeData
      };

      return await WhatsAppPDFService.generateAndSendPDF(pdfData);
    } catch (error) {
      console.error('Error sending dinner confirmation:', error);
      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send accommodation booking confirmation with PDF
   */
  static async sendAccommodationConfirmation(
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    try {
      console.log('Sending accommodation confirmation PDF for:', userDetails.name);

      const pdfData: WhatsAppPDFData = {
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          registrationId: userDetails.registrationId
        },
        operationDetails: {
          type: 'accommodation',
          amount: record.totalAmount || 0,
          paymentReference: record.paymentReference,
          date: record.createdAt || new Date(),
          status: record.confirmed ? 'confirmed' : 'pending',
          description: 'GOSA 2025 Convention Accommodation Booking',
          additionalInfo: this.formatAccommodationAdditionalInfo(record)
        },
        qrCodeData
      };

      return await WhatsAppPDFService.generateAndSendPDF(pdfData);
    } catch (error) {
      console.error('Error sending accommodation confirmation:', error);
      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send brochure order confirmation with PDF
   */
  static async sendBrochureConfirmation(
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    try {
      console.log('Sending brochure confirmation PDF for:', userDetails.name);

      const pdfData: WhatsAppPDFData = {
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          registrationId: userDetails.registrationId
        },
        operationDetails: {
          type: 'brochure',
          amount: record.totalAmount || 0,
          paymentReference: record.paymentReference,
          date: record.createdAt || new Date(),
          status: record.confirmed ? 'confirmed' : 'pending',
          description: 'GOSA 2025 Convention Brochure Order',
          additionalInfo: this.formatBrochureAdditionalInfo(record)
        },
        qrCodeData
      };

      return await WhatsAppPDFService.generateAndSendPDF(pdfData);
    } catch (error) {
      console.error('Error sending brochure confirmation:', error);
      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send goodwill message confirmation with PDF
   */
  static async sendGoodwillConfirmation(
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    try {
      console.log('Sending goodwill confirmation PDF for:', userDetails.name);

      const pdfData: WhatsAppPDFData = {
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          registrationId: userDetails.registrationId
        },
        operationDetails: {
          type: 'goodwill',
          amount: record.donationAmount || 0,
          paymentReference: record.paymentReference,
          date: record.createdAt || new Date(),
          status: record.confirmed ? 'confirmed' : 'pending',
          description: 'GOSA 2025 Convention Goodwill Message & Donation',
          additionalInfo: this.formatGoodwillAdditionalInfo(record)
        },
        qrCodeData
      };

      return await WhatsAppPDFService.generateAndSendPDF(pdfData);
    } catch (error) {
      console.error('Error sending goodwill confirmation:', error);
      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send donation confirmation with PDF
   */
  static async sendDonationConfirmation(
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    try {
      console.log('Sending donation confirmation PDF for:', userDetails.name);

      const pdfData: WhatsAppPDFData = {
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          phone: userDetails.phone,
          registrationId: userDetails.registrationId
        },
        operationDetails: {
          type: 'donation',
          amount: record.amount || 0,
          paymentReference: record.paymentReference,
          date: record.createdAt || new Date(),
          status: record.confirmed ? 'confirmed' : 'pending',
          description: 'GOSA 2025 Convention Donation',
          additionalInfo: this.formatDonationAdditionalInfo(record)
        },
        qrCodeData
      };

      return await WhatsAppPDFService.generateAndSendPDF(pdfData);
    } catch (error) {
      console.error('Error sending donation confirmation:', error);
      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods for formatting additional information

  private static formatConventionAdditionalInfo(registration: any): string {
    const info: string[] = [];

    info.push(`Registration ID: ${registration._id}`);
    info.push(`Amount: ₦${registration.amount?.toLocaleString() || '0'}`);
    info.push(`Quantity: ${registration.quantity || 1} person(s)`);

    if (registration.persons && registration.persons.length > 0) {
      info.push(`Additional Persons: ${registration.persons.length}`);
    }

    return info.join(' | ');
  }

  private static formatDinnerAdditionalInfo(reservation: any): string {
    const info: string[] = [];

    info.push(`Guests: ${reservation.numberOfGuests || 1}`);
    info.push(`Total Amount: ₦${reservation.totalAmount?.toLocaleString() || '0'}`);

    if (reservation.guestDetails && reservation.guestDetails.length > 0) {
      const guestNames = reservation.guestDetails.map((guest: any) => guest.name).join(', ');
      info.push(`Guest Names: ${guestNames}`);
    }

    if (reservation.specialRequests) {
      info.push(`Special Requests: ${reservation.specialRequests}`);
    }

    return info.join(' | ');
  }

  private static formatAccommodationAdditionalInfo(accommodation: any): string {
    const info: string[] = [];

    info.push(`Type: ${accommodation.accommodationType?.charAt(0).toUpperCase() + accommodation.accommodationType?.slice(1) || 'Standard'}`);
    info.push(`Check-in: ${accommodation.checkInDate?.toLocaleDateString() || 'TBD'}`);
    info.push(`Check-out: ${accommodation.checkOutDate?.toLocaleDateString() || 'TBD'}`);
    info.push(`Guests: ${accommodation.numberOfGuests || 1}`);
    info.push(`Confirmation Code: ${accommodation.confirmationCode || 'TBD'}`);

    if (accommodation.specialRequests) {
      info.push(`Special Requests: ${accommodation.specialRequests}`);
    }

    return info.join(' | ');
  }

  private static formatBrochureAdditionalInfo(brochure: any): string {
    const info: string[] = [];

    info.push(`Type: ${brochure.brochureType?.charAt(0).toUpperCase() + brochure.brochureType?.slice(1) || 'Physical'}`);
    info.push(`Quantity: ${brochure.quantity || 1}`);
    info.push(`Total Amount: ₦${brochure.totalAmount?.toLocaleString() || '0'}`);

    if (brochure.recipientDetails && brochure.recipientDetails.length > 0) {
      const recipientNames = brochure.recipientDetails.map((recipient: any) => recipient.name).join(', ');
      info.push(`Recipients: ${recipientNames}`);
    }

    return info.join(' | ');
  }

  private static formatGoodwillAdditionalInfo(goodwill: any): string {
    const info: string[] = [];

    info.push(`Donation: ₦${goodwill.donationAmount?.toLocaleString() || '0'}`);
    info.push(`Status: ${goodwill.approved ? 'Approved' : 'Pending Approval'}`);
    info.push(`Anonymous: ${goodwill.anonymous ? 'Yes' : 'No'}`);

    if (goodwill.attributionName && !goodwill.anonymous) {
      info.push(`Attribution: ${goodwill.attributionName}`);
    }

    if (goodwill.message) {
      const truncatedMessage = goodwill.message.length > 100
        ? goodwill.message.substring(0, 100) + '...'
        : goodwill.message;
      info.push(`Message: "${truncatedMessage}"`);
    }

    return info.join(' | ');
  }

  private static formatDonationAdditionalInfo(donation: any): string {
    const info: string[] = [];

    info.push(`Amount: ₦${donation.amount?.toLocaleString() || '0'}`);
    info.push(`Receipt: ${donation.receiptNumber || 'TBD'}`);
    info.push(`Anonymous: ${donation.anonymous ? 'Yes' : 'No'}`);

    if (donation.onBehalfOf) {
      info.push(`On Behalf Of: ${donation.onBehalfOf}`);
    }

    if (donation.donorName && !donation.anonymous) {
      info.push(`Donor: ${donation.donorName}`);
    }

    return info.join(' | ');
  }
}