import connectDB from "../mongodb";
import { Types } from "mongoose";
import { QRCodeService } from "../services/qr-code.service";
import { WhatsAppPDFService, DeliveryResult } from "../services/whatsapp-pdf.service";
// import { PDFBlobService, BlobUploadResult } from "../services/pdf-blob.service";
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
   * Retrieve and format PDF data for convention registration
   */
  static async getConventionPDFData(paymentReference: string): Promise<PDFData | null> {
    try {
      await connectDB();

      const registration = await ConventionRegistration.findOne({ paymentReference })
        .populate('userId')
        .exec();

      if (!registration || !registration.userId) {
        return null;
      }

      const user = registration.userId as any;
      const userDetails: PDFUserDetails = {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: registration._id.toString(),
      };

      const operationDetails: PDFOperationDetails = {
        type: 'convention',
        amount: registration.amount,
        paymentReference: registration.paymentReference,
        date: registration.createdAt,
        status: registration.confirm ? 'confirmed' : 'pending',
        description: 'GOSA 2025 Convention Registration',
        additionalInfo: this.formatConventionAdditionalInfo(registration),
      };

      // Generate QR code data for convention entrance
      const qrCodeData = QRCodeService.generateUniqueQRData(
        'convention',
        registration._id.toString(),
        {
          userId: user._id.toString(),
          name: user.fullName,
          email: user.email,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      );

      return {
        userDetails,
        operationDetails,
        qrCodeData,
      };
    } catch (error) {
      console.error('Error getting convention PDF data:', error);
      return null;
    }
  }

  /**
   * Retrieve and format PDF data for dinner reservation
   */
  static async getDinnerPDFData(paymentReference: string): Promise<PDFData | null> {
    try {
      await connectDB();

      const reservation = await DinnerReservation.findOne({ paymentReference })
        .populate('userId')
        .exec();

      if (!reservation || !reservation.userId) {
        return null;
      }

      const user = reservation.userId as any;
      const userDetails: PDFUserDetails = {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: reservation._id.toString(),
      };

      const operationDetails: PDFOperationDetails = {
        type: 'dinner',
        amount: reservation.totalAmount,
        paymentReference: reservation.paymentReference,
        date: reservation.createdAt,
        status: reservation.confirmed ? 'confirmed' : 'pending',
        description: 'GOSA 2025 Convention Dinner Reservation',
        additionalInfo: this.formatDinnerAdditionalInfo(reservation),
      };

      // Generate QR code data for dinner access (main attendee)
      const qrCodeData = QRCodeService.generateUniqueQRData(
        'dinner',
        reservation._id.toString(),
        {
          userId: user._id.toString(),
          numberOfGuests: reservation.numberOfGuests,
          guestDetails: reservation.guestDetails,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      );

      return {
        userDetails,
        operationDetails,
        qrCodeData,
      };
    } catch (error) {
      console.error('Error getting dinner PDF data:', error);
      return null;
    }
  }

  /**
   * Retrieve and format PDF data for accommodation booking
   */
  static async getAccommodationPDFData(paymentReference: string): Promise<PDFData | null> {
    try {
      await connectDB();

      const accommodation = await Accommodation.findOne({ paymentReference })
        .populate('userId')
        .exec();

      if (!accommodation || !accommodation.userId) {
        return null;
      }

      const user = accommodation.userId as any;
      const userDetails: PDFUserDetails = {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: accommodation._id.toString(),
      };

      const operationDetails: PDFOperationDetails = {
        type: 'accommodation',
        amount: accommodation.totalAmount,
        paymentReference: accommodation.paymentReference,
        date: accommodation.createdAt,
        status: accommodation.confirmed ? 'confirmed' : 'pending',
        description: 'GOSA 2025 Convention Accommodation Booking',
        additionalInfo: this.formatAccommodationAdditionalInfo(accommodation),
      };

      // For accommodation, use confirmation code as QR data
      const qrCodeData = JSON.stringify({
        type: 'accommodation',
        id: accommodation._id.toString(),
        userId: user._id.toString(),
        confirmationCode: accommodation.confirmationCode,
        accommodationType: accommodation.accommodationType,
        checkInDate: accommodation.checkInDate.toISOString(),
        checkOutDate: accommodation.checkOutDate.toISOString(),
        validUntil: accommodation.checkOutDate.toISOString(),
      });

      return {
        userDetails,
        operationDetails,
        qrCodeData,
      };
    } catch (error) {
      console.error('Error getting accommodation PDF data:', error);
      return null;
    }
  }

  /**
   * Retrieve and format PDF data for brochure order
   */
  static async getBrochurePDFData(paymentReference: string): Promise<PDFData | null> {
    try {
      await connectDB();

      const brochure = await ConventionBrochure.findOne({ paymentReference })
        .populate('userId')
        .exec();

      if (!brochure || !brochure.userId) {
        return null;
      }

      const user = brochure.userId as any;
      const userDetails: PDFUserDetails = {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: brochure._id.toString(),
      };

      const operationDetails: PDFOperationDetails = {
        type: 'brochure',
        amount: brochure.totalAmount,
        paymentReference: brochure.paymentReference,
        date: brochure.createdAt,
        status: brochure.confirmed ? 'confirmed' : 'pending',
        description: 'GOSA 2025 Convention Brochure Order',
        additionalInfo: this.formatBrochureAdditionalInfo(brochure),
      };

      // Generate QR code data for brochure collection (if physical)
      const qrCodeData = brochure.brochureType === 'physical'
        ? brochure.qrCode
        : QRCodeService.generateUniqueQRData(
          'brochure',
          brochure._id.toString(),
          {
            userId: user._id.toString(),
            quantity: brochure.quantity,
            brochureType: brochure.brochureType,
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          }
        );

      return {
        userDetails,
        operationDetails,
        qrCodeData,
      };
    } catch (error) {
      console.error('Error getting brochure PDF data:', error);
      return null;
    }
  }
  /**
    * Retrieve and format PDF data for goodwill message
    */
  static async getGoodwillPDFData(paymentReference: string): Promise<PDFData | null> {
    try {
      await connectDB();

      const goodwill = await GoodwillMessage.findOne({ paymentReference })
        .populate('userId')
        .exec();

      if (!goodwill || !goodwill.userId) {
        return null;
      }

      const user = goodwill.userId as any;
      const userDetails: PDFUserDetails = {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: goodwill._id.toString(),
      };

      const operationDetails: PDFOperationDetails = {
        type: 'goodwill',
        amount: goodwill.donationAmount,
        paymentReference: goodwill.paymentReference,
        date: goodwill.createdAt,
        status: goodwill.confirmed ? 'confirmed' : 'pending',
        description: 'GOSA 2025 Convention Goodwill Message & Donation',
        additionalInfo: this.formatGoodwillAdditionalInfo(goodwill),
      };

      // Generate QR code data for goodwill message receipt
      const qrCodeData = QRCodeService.generateUniqueQRData(
        'goodwill',
        goodwill._id.toString(),
        {
          userId: user._id.toString(),
          donationAmount: goodwill.donationAmount,
          anonymous: goodwill.anonymous,
          approved: goodwill.approved,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      );

      return {
        userDetails,
        operationDetails,
        qrCodeData,
      };
    } catch (error) {
      console.error('Error getting goodwill PDF data:', error);
      return null;
    }
  }

  /**
   * Retrieve and format PDF data for donation
   */
  static async getDonationPDFData(paymentReference: string): Promise<PDFData | null> {
    try {
      await connectDB();

      const donation = await Donation.findOne({ paymentReference })
        .populate('userId')
        .exec();

      if (!donation || !donation.userId) {
        return null;
      }

      const user = donation.userId as any;
      const userDetails: PDFUserDetails = {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: donation._id.toString(),
      };

      const operationDetails: PDFOperationDetails = {
        type: 'donation',
        amount: donation.amount,
        paymentReference: donation.paymentReference,
        date: donation.createdAt,
        status: donation.confirmed ? 'confirmed' : 'pending',
        description: 'GOSA 2025 Convention Donation',
        additionalInfo: this.formatDonationAdditionalInfo(donation),
      };

      // Generate QR code data for donation receipt
      const qrCodeData = QRCodeService.generateUniqueQRData(
        'donation',
        donation._id.toString(),
        {
          userId: user._id.toString(),
          amount: donation.amount,
          receiptNumber: donation.receiptNumber,
          anonymous: donation.anonymous,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      );

      return {
        userDetails,
        operationDetails,
        qrCodeData,
      };
    } catch (error) {
      console.error('Error getting donation PDF data:', error);
      return null;
    }
  }  /*
*
   * Generic function to retrieve PDF data for any service type
   */
  static async getPDFDataByReference(
    paymentReference: string,
    serviceType?: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation'
  ): Promise<PDFData | null> {
    try {
      // If service type is specified, use the specific method
      if (serviceType) {
        switch (serviceType) {
          case 'convention':
            return await this.getConventionPDFData(paymentReference);
          case 'dinner':
            return await this.getDinnerPDFData(paymentReference);
          case 'accommodation':
            return await this.getAccommodationPDFData(paymentReference);
          case 'brochure':
            return await this.getBrochurePDFData(paymentReference);
          case 'goodwill':
            return await this.getGoodwillPDFData(paymentReference);
          case 'donation':
            return await this.getDonationPDFData(paymentReference);
          default:
            return null;
        }
      }

      // If no service type specified, try all services
      const services = [
        this.getConventionPDFData(paymentReference),
        this.getDinnerPDFData(paymentReference),
        this.getAccommodationPDFData(paymentReference),
        this.getBrochurePDFData(paymentReference),
        this.getGoodwillPDFData(paymentReference),
        this.getDonationPDFData(paymentReference),
      ];

      const results = await Promise.allSettled(services);

      // Return the first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting PDF data by reference:', error);
      return null;
    }
  }

  /**
   * Populate user details from database
   */
  static async populateUserDetails(userId: string | Types.ObjectId): Promise<PDFUserDetails | null> {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      return {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: user._id.toString(),
      };
    } catch (error) {
      console.error('Error populating user details:', error);
      return null;
    }
  }

  // Private helper methods for formatting additional information

  private static formatConventionAdditionalInfo(registration: any): string {
    const info: string[] = [];

    info.push(`Registration ID: ${registration._id}`);
    info.push(`Amount: ₦${registration.amount.toLocaleString()}`);
    info.push(`Quantity: ${registration.quantity} person(s)`);

    if (registration.persons && registration.persons.length > 0) {
      info.push(`Additional Persons: ${registration.persons.length}`);
    }

    return info.join(' | ');
  }

  private static formatDinnerAdditionalInfo(reservation: any): string {
    const info: string[] = [];

    info.push(`Guests: ${reservation.numberOfGuests}`);
    info.push(`Total Amount: ₦${reservation.totalAmount.toLocaleString()}`);

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

    info.push(`Type: ${accommodation.accommodationType.charAt(0).toUpperCase() + accommodation.accommodationType.slice(1)}`);
    info.push(`Check-in: ${accommodation.checkInDate.toLocaleDateString()}`);
    info.push(`Check-out: ${accommodation.checkOutDate.toLocaleDateString()}`);
    info.push(`Guests: ${accommodation.numberOfGuests}`);
    info.push(`Confirmation Code: ${accommodation.confirmationCode}`);

    if (accommodation.specialRequests) {
      info.push(`Special Requests: ${accommodation.specialRequests}`);
    }

    return info.join(' | ');
  }

  private static formatBrochureAdditionalInfo(brochure: any): string {
    const info: string[] = [];

    info.push(`Type: ${brochure.brochureType.charAt(0).toUpperCase() + brochure.brochureType.slice(1)}`);
    info.push(`Quantity: ${brochure.quantity}`);
    info.push(`Total Amount: ₦${brochure.totalAmount.toLocaleString()}`);

    if (brochure.recipientDetails && brochure.recipientDetails.length > 0) {
      const recipientNames = brochure.recipientDetails.map((recipient: any) => recipient.name).join(', ');
      info.push(`Recipients: ${recipientNames}`);
    }

    return info.join(' | ');
  }

  private static formatGoodwillAdditionalInfo(goodwill: any): string {
    const info: string[] = [];

    info.push(`Donation: ₦${goodwill.donationAmount.toLocaleString()}`);
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

    info.push(`Amount: ₦${donation.amount.toLocaleString()}`);
    info.push(`Receipt: ${donation.receiptNumber}`);
    info.push(`Anonymous: ${donation.anonymous ? 'Yes' : 'No'}`);

    if (donation.onBehalfOf) {
      info.push(`On Behalf Of: ${donation.onBehalfOf}`);
    }

    if (donation.donorName && !donation.anonymous) {
      info.push(`Donor: ${donation.donorName}`);
    }

    return info.join(' | ');
  }  /**
   * 
Generate QR code data for specific service types
   */
  static async generateServiceQRCodeData(
    serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation',
    serviceId: string,
    additionalData?: any
  ): Promise<string> {
    try {
      const baseData = {
        type: serviceType,
        id: serviceId,
        timestamp: new Date().toISOString(),
        ...additionalData,
      };

      // Set appropriate expiration based on service type
      let validUntil: Date;
      switch (serviceType) {
        case 'convention':
        case 'goodwill':
        case 'donation':
          validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
          break;
        case 'dinner':
          validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          break;
        case 'accommodation':
          validUntil = additionalData?.checkOutDate
            ? new Date(additionalData.checkOutDate)
            : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default
          break;
        case 'brochure':
          validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
          break;
        default:
          validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default
      }

      baseData.validUntil = validUntil.toISOString();

      return JSON.stringify(baseData);
    } catch (error) {
      console.error('Error generating service QR code data:', error);
      throw new Error('Failed to generate QR code data');
    }
  }

  /**
   * Validate and extract service information from payment reference
   */
  static extractServiceInfoFromReference(paymentReference: string): {
    serviceType?: string;
    baseReference: string;
  } {
    // Common patterns in payment references that might indicate service type
    const patterns = {
      convention: /^(conv|convention|reg)/i,
      dinner: /^(dinner|meal)/i,
      accommodation: /^(accom|hotel|room)/i,
      brochure: /^(broch|book)/i,
      goodwill: /^(good|message)/i,
      donation: /^(don|donate)/i,
    };

    for (const [serviceType, pattern] of Object.entries(patterns)) {
      if (pattern.test(paymentReference)) {
        return {
          serviceType,
          baseReference: paymentReference,
        };
      }
    }

    return {
      baseReference: paymentReference,
    };
  }

  /**
   * Get all PDF data for a user across all services
   */
  static async getAllUserPDFData(userId: string | Types.ObjectId): Promise<PDFData[]> {
    try {
      await connectDB();

      const objectId = new Types.ObjectId(userId);
      const pdfDataList: PDFData[] = [];

      // Get all services for the user
      const [conventions, dinners, accommodations, brochures, goodwills, donations] = await Promise.all([
        ConventionRegistration.find({ userId: objectId }).populate('userId'),
        DinnerReservation.find({ userId: objectId }).populate('userId'),
        Accommodation.find({ userId: objectId }).populate('userId'),
        ConventionBrochure.find({ userId: objectId }).populate('userId'),
        GoodwillMessage.find({ userId: objectId }).populate('userId'),
        Donation.find({ userId: objectId }).populate('userId'),
      ]);

      // Process each service type
      for (const convention of conventions) {
        const pdfData = await this.getConventionPDFData(convention.paymentReference);
        if (pdfData) pdfDataList.push(pdfData);
      }

      for (const dinner of dinners) {
        const pdfData = await this.getDinnerPDFData(dinner.paymentReference);
        if (pdfData) pdfDataList.push(pdfData);
      }

      for (const accommodation of accommodations) {
        const pdfData = await this.getAccommodationPDFData(accommodation.paymentReference);
        if (pdfData) pdfDataList.push(pdfData);
      }

      for (const brochure of brochures) {
        const pdfData = await this.getBrochurePDFData(brochure.paymentReference);
        if (pdfData) pdfDataList.push(pdfData);
      }

      for (const goodwill of goodwills) {
        const pdfData = await this.getGoodwillPDFData(goodwill.paymentReference);
        if (pdfData) pdfDataList.push(pdfData);
      }

      for (const donation of donations) {
        const pdfData = await this.getDonationPDFData(donation.paymentReference);
        if (pdfData) pdfDataList.push(pdfData);
      }

      return pdfDataList;
    } catch (error) {
      console.error('Error getting all user PDF data:', error);
      return [];
    }
  }

  // ========================================
  // Service-Specific PDF Confirmation Methods
  // ========================================

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

      // Log delivery metrics for monitoring
      await WhatsAppPDFService.logDeliveryMetrics(pdfData, result, startTime);

      return result;
    } catch (error) {
      console.error('Error sending convention confirmation:', error);

      const result: DeliveryResult = {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // Log failed delivery metrics
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

      await WhatsAppPDFService.logDeliveryMetrics(pdfData, result, startTime);

      return result;
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

  /**
   * Generic method to send PDF confirmation for any service type
   */
  static async sendServiceConfirmation(
    serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation',
    userDetails: any,
    record: any,
    qrCodeData: string
  ): Promise<DeliveryResult> {
    switch (serviceType) {
      case 'convention':
        return await this.sendConventionConfirmation(userDetails, record, qrCodeData);
      case 'dinner':
        return await this.sendDinnerConfirmation(userDetails, record, qrCodeData);
      case 'accommodation':
        return await this.sendAccommodationConfirmation(userDetails, record, qrCodeData);
      case 'brochure':
        return await this.sendBrochureConfirmation(userDetails, record, qrCodeData);
      case 'goodwill':
        return await this.sendGoodwillConfirmation(userDetails, record, qrCodeData);
      case 'donation':
        return await this.sendDonationConfirmation(userDetails, record, qrCodeData);
      default:
        throw new Error(`Unsupported service type: ${serviceType}`);
    }
  }
}
// ========================================
// Enhanced PDF Delivery with Vercel Blob (Commented out until dependencies are installed)
// ========================================

/*
// Uncomment this section after installing @vercel/blob and puppeteer dependencies
 
/**
 * Generate PDF, upload to Vercel Blob, save URL to DB, and send via WhatsApp
 */
/*
static async generateUploadAndSendPDF(
  serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation',
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  const startTime = Date.now();

  try {
    console.log(`Generating and uploading PDF for ${serviceType}:`, userDetails.name);

    // Prepare PDF data
    const pdfData = {
      userDetails: {
        name: userDetails.name,
        email: userDetails.email,
        phone: userDetails.phone,
        registrationId: userDetails.registrationId
      },
      operationDetails: {
        type: serviceType,
        amount: this.getRecordAmount(record, serviceType),
        paymentReference: record.paymentReference,
        date: record.createdAt || new Date(),
        status: this.getRecordStatus(record, serviceType),
        description: this.getServiceDescription(serviceType),
        additionalInfo: this.getServiceAdditionalInfo(record, serviceType)
      },
      qrCodeData
    };

    // Generate and upload PDF to Vercel Blob
    const blobResult = await PDFBlobService.generateAndUploadPDF(pdfData);

    if (!blobResult.success) {
      throw new Error(`PDF upload failed: ${blobResult.error}`);
    }

    console.log(`PDF uploaded successfully to: ${blobResult.url}`);

    // Save PDF URL to database
    const dbSaved = await this.savePDFUrlToDatabase(
      serviceType,
      record.paymentReference,
      blobResult.url!,
      blobResult.filename!
    );

    // Send PDF via WhatsApp using the blob URL
    const whatsappResult = await this.sendPDFViaWhatsApp(
      userDetails.phone,
      userDetails.name,
      serviceType,
      blobResult.url!,
      blobResult.filename!,
      record.paymentReference
    );

    const result = {
      success: blobResult.success && whatsappResult.success,
      pdfGenerated: blobResult.success,
      whatsappSent: whatsappResult.success,
      blobUrl: blobResult.url,
      dbSaved,
      error: whatsappResult.error || blobResult.error,
      fallbackUsed: whatsappResult.fallbackUsed || false
    };

    console.log(`${serviceType} PDF delivery result:`, result);
    return result;

  } catch (error) {
    console.error(`Error in ${serviceType} PDF delivery:`, error);
    return {
      success: false,
      pdfGenerated: false,
      whatsappSent: false,
      dbSaved: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
*/

/*
/**
 * Send PDF document via WhatsApp using Vercel Blob URL
 */
/*
private static async sendPDFViaWhatsApp(
  phoneNumber: string,
  userName: string,
  serviceType: string,
  blobUrl: string,
  filename: string,
  paymentReference: string
): Promise<{ success: boolean; error?: string; fallbackUsed?: boolean }> {
  try {
    // Create service-specific message
    const message = this.createWhatsAppMessage(userName, serviceType, paymentReference);

    // Send document via WhatsApp
    const result = await Wasender.sendDocument({
      to: phoneNumber,
      text: message,
      documentUrl: blobUrl,
      fileName: filename
    });

    if (result.success) {
      console.log(`WhatsApp document sent successfully to ${phoneNumber}`);
      return { success: true };
    } else {
      console.log(`WhatsApp document failed, trying fallback text message`);

      // Fallback: Send text message with PDF link
      const fallbackMessage = `${message}\n\n📄 Download your PDF: ${blobUrl}`;

      const fallbackResult = await Wasender.httpSenderMessage({
        to: phoneNumber,
        text: fallbackMessage
      });

      return {
        success: fallbackResult.success,
        fallbackUsed: true,
        error: fallbackResult.success ? undefined : 'Both document and text message failed'
      };
    }

  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
*/

/*
/**
 * Save PDF URL to the appropriate database collection
 */
/*
private static async savePDFUrlToDatabase(
  serviceType: string,
  paymentReference: string,
  pdfUrl: string,
  filename: string
): Promise<boolean> {
  try {
    await connectDB();

    const updateData = {
      pdfUrl,
      pdfFilename: filename,
      pdfGeneratedAt: new Date()
    };

    let result;

    switch (serviceType) {
      case 'convention':
        result = await ConventionRegistration.updateMany(
          { paymentReference },
          { $set: updateData }
        );
        break;

      case 'dinner':
        result = await DinnerReservation.updateOne(
          { paymentReference },
          { $set: updateData }
        );
        break;

      case 'accommodation':
        result = await Accommodation.updateOne(
          { paymentReference },
          { $set: updateData }
        );
        break;

      case 'brochure':
        result = await ConventionBrochure.updateOne(
          { paymentReference },
          { $set: updateData }
        );
        break;

      case 'goodwill':
        result = await GoodwillMessage.updateOne(
          { paymentReference },
          { $set: updateData }
        );
        break;

      case 'donation':
        result = await Donation.updateOne(
          { paymentReference },
          { $set: updateData }
        );
        break;

      default:
        console.error(`Unknown service type: ${serviceType}`);
        return false;
    }

    const success = result.modifiedCount > 0 || result.matchedCount > 0;
    console.log(`PDF URL saved to ${serviceType} database:`, success);
    return success;

  } catch (error) {
    console.error('Error saving PDF URL to database:', error);
    return false;
  }
}
*/

/*
/**
 * Create WhatsApp message for PDF delivery
 */
/*
private static createWhatsAppMessage(
  userName: string,
  serviceType: string,
  paymentReference: string
): string {
  const serviceNames = {
    convention: 'Convention Registration',
    dinner: 'Dinner Reservation',
    accommodation: 'Accommodation Booking',
    brochure: 'Brochure Order',
    goodwill: 'Goodwill Message & Donation',
    donation: 'Donation'
  };

  const serviceName = serviceNames[serviceType as keyof typeof serviceNames] || serviceType;

  return `🎉 Hello ${userName}!

Your ${serviceName} has been confirmed!

📄 Please find your official confirmation document attached.

📋 **Details:**
• Service: ${serviceName}
• Reference: ${paymentReference}
• Status: Confirmed ✅

📱 **Important:**
• Save this document to your device
• Present the QR code for verification when needed
• Keep this for your records

🏛️ **GOSA 2025 Convention**
"For Light and Truth"

Thank you for your participation! 🙏

Need help? Contact our support team.`;
}
*/

/*
/**
 * Enhanced convention confirmation with blob upload
 */
/*
static async sendConventionConfirmationWithBlob(
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  return await this.generateUploadAndSendPDF('convention', userDetails, record, qrCodeData);
}
*/

/*
/**
 * Enhanced dinner confirmation with blob upload
 */
/*
static async sendDinnerConfirmationWithBlob(
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  return await this.generateUploadAndSendPDF('dinner', userDetails, record, qrCodeData);
}

/**
 * Enhanced accommodation confirmation with blob upload
 */
/*
static async sendAccommodationConfirmationWithBlob(
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  return await this.generateUploadAndSendPDF('accommodation', userDetails, record, qrCodeData);
}

/**
 * Enhanced brochure confirmation with blob upload
 */
/*
static async sendBrochureConfirmationWithBlob(
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  return await this.generateUploadAndSendPDF('brochure', userDetails, record, qrCodeData);
}

/**
 * Enhanced goodwill confirmation with blob upload
 */
/*
static async sendGoodwillConfirmationWithBlob(
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  return await this.generateUploadAndSendPDF('goodwill', userDetails, record, qrCodeData);
}

/**
 * Enhanced donation confirmation with blob upload
 */
/*
static async sendDonationConfirmationWithBlob(
  userDetails: any,
  record: any,
  qrCodeData: string
): Promise<DeliveryResult & { blobUrl?: string; dbSaved?: boolean }> {
  return await this.generateUploadAndSendPDF('donation', userDetails, record, qrCodeData);
}
*/

/*
// Helper methods for service-specific data extraction

private static getRecordAmount(record: any, serviceType: string): number {
  switch (serviceType) {
    case 'convention':
      return record.amount || 0;
    case 'dinner':
    case 'accommodation':
    case 'brochure':
      return record.totalAmount || 0;
    case 'goodwill':
      return record.donationAmount || 0;
    case 'donation':
      return record.amount || 0;
    default:
      return 0;
  }
}

private static getRecordStatus(record: any, serviceType: string): 'confirmed' | 'pending' {
  switch (serviceType) {
    case 'convention':
      return record.confirm ? 'confirmed' : 'pending';
    case 'dinner':
    case 'accommodation':
    case 'brochure':
    case 'goodwill':
    case 'donation':
      return record.confirmed ? 'confirmed' : 'pending';
    default:
      return 'pending';
  }
}

private static getServiceDescription(serviceType: string): string {
  const descriptions = {
    convention: 'GOSA 2025 Convention Registration',
    dinner: 'GOSA 2025 Convention Dinner Reservation',
    accommodation: 'GOSA 2025 Convention Accommodation Booking',
    brochure: 'GOSA 2025 Convention Brochure Order',
    goodwill: 'GOSA 2025 Convention Goodwill Message & Donation',
    donation: 'GOSA 2025 Convention Donation'
  };

  return descriptions[serviceType as keyof typeof descriptions] || `GOSA 2025 ${serviceType}`;
}

private static getServiceAdditionalInfo(record: any, serviceType: string): string {
  switch (serviceType) {
    case 'convention':
      return this.formatConventionAdditionalInfo(record);
    case 'dinner':
      return this.formatDinnerAdditionalInfo(record);
    case 'accommodation':
      return this.formatAccommodationAdditionalInfo(record);
    case 'brochure':
      return this.formatBrochureAdditionalInfo(record);
    case 'goodwill':
      return this.formatGoodwillAdditionalInfo(record);
    case 'donation':
      return this.formatDonationAdditionalInfo(record);
    default:
      return '';
  }
}
*/

/*
/**
 * Retrieve PDF URL from database
 */
/*
static async getPDFUrlFromDatabase(
  serviceType: string,
  paymentReference: string
): Promise<{ pdfUrl?: string; pdfFilename?: string; pdfGeneratedAt?: Date } | null> {
  try {
    await connectDB();

    let record;

    switch (serviceType) {
      case 'convention':
        record = await ConventionRegistration.findOne(
          { paymentReference },
          { pdfUrl: 1, pdfFilename: 1, pdfGeneratedAt: 1 }
        );
        break;

      case 'dinner':
        record = await DinnerReservation.findOne(
          { paymentReference },
          { pdfUrl: 1, pdfFilename: 1, pdfGeneratedAt: 1 }
        );
        break;

      case 'accommodation':
        record = await Accommodation.findOne(
          { paymentReference },
          { pdfUrl: 1, pdfFilename: 1, pdfGeneratedAt: 1 }
        );
        break;

      case 'brochure':
        record = await ConventionBrochure.findOne(
          { paymentReference },
          { pdfUrl: 1, pdfFilename: 1, pdfGeneratedAt: 1 }
        );
        break;

      case 'goodwill':
        record = await GoodwillMessage.findOne(
          { paymentReference },
          { pdfUrl: 1, pdfFilename: 1, pdfGeneratedAt: 1 }
        );
        break;

      case 'donation':
        record = await Donation.findOne(
          { paymentReference },
          { pdfUrl: 1, pdfFilename: 1, pdfGeneratedAt: 1 }
        );
        break;

      default:
        return null;
    }

    return record || null;

  } catch (error) {
    console.error('Error retrieving PDF URL from database:', error);
    return null;
  }
}
} 
 */