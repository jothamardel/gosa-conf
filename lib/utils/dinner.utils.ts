import connectDB from "../mongodb";
import { DinnerReservation, IDinnerReservation, IGuestDetail, IQRCode } from "../schema/dinner.schema";
import { Types } from "mongoose";
import { QRCodeService } from "../services/qr-code.service";

// Type assertion to bypass Mongoose typing issues
const DinnerModel = DinnerReservation as any;

export interface DinnerReservationData {
  userId: string | Types.ObjectId;
  paymentReference: string;
  numberOfGuests: number;
  guestDetails: IGuestDetail[];
  specialRequests?: string;
  totalAmount: number;
  isPrimaryContact?: boolean;
  guestIndex?: number;
}

export class DinnerUtils {
  /**
   * Create a new dinner reservation (enhanced with multiple guest support)
   */
  static async createReservation(data: DinnerReservationData): Promise<IDinnerReservation> {
    try {
      await connectDB();

      // Validate guest details count matches numberOfGuests
      if (data.guestDetails.length !== data.numberOfGuests) {
        throw new Error("Number of guest details must match numberOfGuests");
      }

      // Enhanced validation and formatting for all guests
      const formattedGuestDetails = [];
      for (const guest of data.guestDetails) {
        if (!guest.name || guest.name.trim().length === 0) {
          throw new Error("All guests must have a name");
        }
        if (!guest.email || guest.email.trim().length === 0) {
          throw new Error("All guests must have an email");
        }
        if (!guest.phone || guest.phone.trim().length === 0) {
          throw new Error("All guests must have a phone number");
        }

        // Format phone number
        const formattedPhone = this.formatPhoneNumber(guest.phone);
        formattedGuestDetails.push({
          ...guest,
          phone: formattedPhone
        });
      }

      // Use upsert operation to handle duplicate payment references
      const reservationData = {
        ...data,
        guestDetails: formattedGuestDetails,
        userId: new Types.ObjectId(data.userId),
        isPrimaryContact: data.isPrimaryContact || false,
        guestIndex: data.guestIndex,
        confirmed: false
      };

      // Check if reservation already exists with this payment reference
      const existingReservation = await DinnerModel.findOne({
        paymentReference: data.paymentReference
      });

      let reservation;
      if (existingReservation) {
        // Update existing reservation
        console.log(`Updating existing dinner reservation: ${existingReservation._id} with reference ${data.paymentReference}`);
        reservation = await DinnerModel.findOneAndUpdate(
          { paymentReference: data.paymentReference },
          reservationData,
          { new: true, upsert: false }
        );
      } else {
        // Create new reservation
        reservation = await DinnerModel.create(reservationData);
        console.log(`Created new dinner reservation: ${reservation._id} (${data.isPrimaryContact ? 'Primary' : 'Guest'} ${data.guestIndex !== undefined ? data.guestIndex + 1 : ''})`);
      }

      return reservation;
    } catch (error) {
      throw new Error(`Failed to create dinner reservation: ${error}`);
    }
  }

  /**
   * Find a dinner reservation by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<IDinnerReservation | null> {
    try {
      await connectDB();

      // Search for reservation where paymentReference starts with the pattern
      const reservation = await DinnerModel.findOne({
        paymentReference: { $regex: `^${referencePattern}` }
      }).populate('userId');

      return reservation;
    } catch (error) {
      console.error(`Error finding dinner reservation by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm dinner reservations (enhanced to handle multiple guest reservations)
   */
  static async confirmReservation(paymentReference: string): Promise<IDinnerReservation[]> {
    try {
      await connectDB();

      // Extract base Paystack reference (before first underscore)
      // paymentReference might be: "pb54jc4ht9_2347033680280_0"
      // We want to find all reservations starting with: "pb54jc4ht9_"
      const baseReference = paymentReference.split('_')[0];
      console.log(`🔍 Searching for all reservations with base reference: ${baseReference}`);

      // Find all reservations with this base payment reference pattern
      const reservations = await DinnerModel.find({
        paymentReference: { $regex: `^${baseReference}_` }
      }).populate('userId');

      if (reservations.length === 0) {
        throw new Error(`No dinner reservations found for: ${paymentReference}`);
      }

      console.log(`🎫 Found ${reservations.length} reservations to confirm for base reference: ${baseReference}`);
      console.log(`🔍 Expected: Should match number of guests in the group`);

      // Log each reservation found with detailed info
      reservations.forEach((res: any, index: number) => {
        console.log(`📋 Reservation ${index + 1}/${reservations.length}:`, {
          id: res._id,
          paymentReference: res.paymentReference,
          isPrimaryContact: res.isPrimaryContact,
          guestIndex: res.guestIndex,
          guestName: res.guestDetails[0]?.name,
          userPhone: res.userId?.phoneNumber,
          confirmed: res.confirmed,
          numberOfGuests: res.numberOfGuests
        });
      });

      // Check for potential duplicates
      const paymentRefs = reservations.map((r: any) => r.paymentReference);
      const uniqueRefs = new Set(paymentRefs);
      if (paymentRefs.length !== uniqueRefs.size) {
        console.error(`🚨 DUPLICATE PAYMENT REFERENCES DETECTED!`);
        console.error(`Total reservations: ${paymentRefs.length}, Unique references: ${uniqueRefs.size}`);
        console.error(`References:`, paymentRefs);
      }

      const confirmedReservations: any = [];

      console.log("confirmedReservations::::::::::::::::::::::::::::::::", confirmedReservations)
      const processedPhoneNumbers = new Set<string>(); // Track processed phone numbers to avoid duplicates

      console.log("processedPhoneNumbers::::::::::::::::::::::::::::::::", processedPhoneNumbers)
      for (const reservation of reservations) {
        // If already confirmed, just add to array and continue
        if (reservation.confirmed) {
          console.log(`ℹ️ Reservation ${reservation._id} already confirmed, skipping processing`);
          confirmedReservations.push(reservation);
          continue;
        }

        // Process unconfirmed reservation
        console.log(`🔄 Processing unconfirmed reservation: ${reservation._id}`);

        // Generate individual QR code for each reservation
        const qrCodes = await this.generateQRCodes(
          reservation._id.toString(),
          reservation.guestDetails
        );

        // Update reservation with confirmation and QR codes
        reservation.confirmed = true;
        reservation.qrCodes = qrCodes;

        // Extract phone number from payment reference as fallback
        // Payment reference format: "jyh0hp59de_2347033680280"
        const phoneFromReference = reservation.paymentReference?.split("_")[1];
        if (phoneFromReference) {
          // Add + prefix to make it international format
          const formattedPhoneFromReference = `+${phoneFromReference}`;
          console.log(`📞 Extracted phone from payment reference: ${reservation.paymentReference} → ${formattedPhoneFromReference}`);

          // If userId is populated, ensure phone number matches the guest
          if (reservation.userId && typeof reservation.userId === 'object') {
            const originalPhone = (reservation.userId as any).phoneNumber;
            (reservation.userId as any).phoneNumber = formattedPhoneFromReference;
            // Also ensure other user details match the guest
            (reservation.userId as any).fullName = reservation.guestDetails[0]?.name || (reservation.userId as any).fullName;
            (reservation.userId as any).email = reservation.guestDetails[0]?.email || (reservation.userId as any).email;
            console.log(`📞 Updated user details: ${originalPhone} → ${formattedPhoneFromReference}, Name: ${(reservation.userId as any).fullName}`);
          } else {
            // If userId is not populated, create a minimal user object
            console.log(`📞 Creating minimal user object with phone: ${formattedPhoneFromReference}`);
            reservation.userId = {
              phoneNumber: formattedPhoneFromReference,
              fullName: reservation.guestDetails[0]?.name || 'Guest',
              email: reservation.guestDetails[0]?.email || ''
            } as any;
          }
        }

        await reservation.save();

        console.log(`✅ Confirmed dinner reservation: ${reservation._id} (${reservation.isPrimaryContact ? 'Primary' : 'Guest'})`);

        // Add to confirmed reservations array (ONLY ONCE)
        confirmedReservations.push(reservation);

        // Send individual notification to each guest (avoid duplicates)
        const guestPhone = (reservation.userId as any)?.phoneNumber;
        if (reservation.userId && guestPhone) {
          if (processedPhoneNumbers.has(guestPhone)) {
            console.log(`⏭️ Skipping duplicate notification for phone: ${guestPhone} (already sent)`);
          } else {
            try {
              await this.sendConfirmationNotification(reservation);
              processedPhoneNumbers.add(guestPhone);
              console.log(`✅ Sent notification to: ${guestPhone}`);
            } catch (notificationError) {
              console.error(`Failed to send notification to ${(reservation.userId as any).email}:`, notificationError);
            }
          }
        }
      }

      return confirmedReservations;
    } catch (error) {
      throw new Error(`Failed to confirm dinner reservations: ${error}`);
    }
  }

  /**
   * Send confirmation notification to individual guest
   */
  static async sendConfirmationNotification(reservation: IDinnerReservation): Promise<void> {
    try {
      const user = reservation.userId as any;
      const guestName = reservation.guestDetails[0]?.name || user.fullName;

      const message = `🍽️ Dinner Reservation Confirmed!

Hi ${guestName},

Your dinner reservation has been confirmed!
💰 Amount: ₦${reservation.totalAmount.toLocaleString()}
📅 Date: Saturday, August 12th
🕰️ Time: 7:00 PM - 10:00 PM
📍 Venue: GOSA Convention Center

${reservation.guestDetails[0]?.dietaryRequirements ? `🥗 Dietary Requirements: ${reservation.guestDetails[0].dietaryRequirements}` : ''}

Your QR code receipt will be sent shortly.

Thank you!
GOSA 2025 Convention Team`;

      // Import notification service dynamically to avoid circular dependencies
      const { NotificationService } = await import('../services/notification.service');
      await NotificationService.sendDinnerConfirmation(reservation);

      console.log(`📱 Sent confirmation to ${user.fullName} (${user.phoneNumber})`);
    } catch (error) {
      console.error('Error sending dinner confirmation notification:', error);
      throw error;
    }
  }
  /*
*
   * Generate QR codes for multiple guests
   */
  static async generateQRCodes(reservationId: string, guestDetails: IGuestDetail[]): Promise<IQRCode[]> {
    try {
      const qrCodes: IQRCode[] = [];

      for (const guest of guestDetails) {
        // Generate unique QR code string for this guest
        const qrCodeString = QRCodeService.generateUniqueQRData(
          'dinner',
          reservationId,
          guest.name
        );

        qrCodes.push({
          guestName: guest.name,
          qrCode: qrCodeString,
          used: false
        });
      }

      return qrCodes;
    } catch (error) {
      throw new Error(`Failed to generate QR codes: ${error}`);
    }
  }

  /**
   * Get all dinner reservations for a user
   */
  static async getUserReservations(userId: string | Types.ObjectId): Promise<IDinnerReservation[]> {
    try {
      await connectDB();
      return await DinnerModel.find({
        userId: new Types.ObjectId(userId)
      }).populate("userId").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user dinner reservations: ${error}`);
    }
  }

  /**
   * Find reservation by payment reference
   */
  static async findByPaymentReference(paymentReference: string): Promise<IDinnerReservation | null> {
    try {
      await connectDB();
      return await DinnerModel.findOne({ paymentReference }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find dinner reservation: ${error}`);
    }
  }

  /**
   * Find multiple reservations by payment reference pattern (for group bookings)
   */
  static async findMany(paymentReference: string): Promise<IDinnerReservation[]> {
    try {
      await connectDB();
      return await DinnerModel.find({
        paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
      }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find dinner reservations: ${error}`);
    }
  }

  /**
   * Confirm multiple reservations by payment reference pattern
   */
  static async findAndConfirmMany(paymentReference: string): Promise<any> {
    try {
      await connectDB();

      // Find all matching reservations
      const reservations = await this.findMany(paymentReference);

      // Generate QR codes for each reservation and update
      const updatePromises = reservations.map(async (reservation) => {
        if (!reservation.confirmed) {
          const qrCodes = await this.generateQRCodes(
            (reservation._id as Types.ObjectId).toString(),
            reservation.guestDetails
          );

          return DinnerModel.findByIdAndUpdate(
            reservation._id,
            {
              confirmed: true,
              qrCodes
            },
            { new: true }
          );
        }
        return reservation;
      });

      await Promise.all(updatePromises);

      return await DinnerModel.updateMany(
        {
          paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
        },
        { confirmed: true }
      );
    } catch (error) {
      throw new Error(`Failed to confirm multiple dinner reservations: ${error}`);
    }
  }

  /**
   * Mark a QR code as used
   */
  static async markQRCodeAsUsed(qrCode: string): Promise<IDinnerReservation | null> {
    try {
      await connectDB();

      const reservation = await DinnerModel.findOneAndUpdate(
        { "qrCodes.qrCode": qrCode },
        { $set: { "qrCodes.$.used": true } },
        { new: true }
      ).populate("userId");

      return reservation;
    } catch (error) {
      throw new Error(`Failed to mark QR code as used: ${error}`);
    }
  }

  /**
   * Validate QR code and get reservation details
   */
  static async validateQRCode(qrCode: string): Promise<{
    valid: boolean;
    reservation?: IDinnerReservation;
    guest?: IQRCode;
    message: string;
  }> {
    try {
      await connectDB();

      const reservation = await DinnerModel.findOne({
        "qrCodes.qrCode": qrCode
      }).populate("userId");

      if (!reservation) {
        return {
          valid: false,
          message: "QR code not found"
        };
      }

      if (!reservation.confirmed) {
        return {
          valid: false,
          reservation,
          message: "Reservation not confirmed"
        };
      }

      const guest = reservation.qrCodes.find((qr: IQRCode) => qr.qrCode === qrCode);
      if (!guest) {
        return {
          valid: false,
          reservation,
          message: "Guest QR code not found"
        };
      }

      if (guest.used) {
        return {
          valid: false,
          reservation,
          guest,
          message: "QR code already used"
        };
      }

      return {
        valid: true,
        reservation,
        guest,
        message: "Valid QR code"
      };
    } catch (error) {
      throw new Error(`Failed to validate QR code: ${error}`);
    }
  }

  /**
   * Get all dinner reservations with pagination
   */
  static async getAllReservations(options: {
    page?: number;
    limit?: number;
    confirmed?: boolean;
  } = {}): Promise<{
    reservations: IDinnerReservation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      await connectDB();

      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      // Build query filter
      const filter: any = {};
      if (options.confirmed !== undefined) {
        filter.confirmed = options.confirmed;
      }

      const reservations = await DinnerModel.find(filter)
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await DinnerModel.countDocuments(filter);

      return {
        reservations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get dinner reservations: ${error}`);
    }
  }

  /**
   * Calculate dinner reservation total amount
   */
  static calculateTotalAmount(numberOfGuests: number, pricePerPerson: number = 3200): number {
    return numberOfGuests * pricePerPerson;
  }

  /**
   * Validate dietary requirements
   */
  static validateDietaryRequirements(requirements: string): boolean {
    // Basic validation - can be extended with specific dietary restriction rules
    if (!requirements) return true;

    const maxLength = 500;
    return requirements.trim().length <= maxLength;
  }

  /**
   * Validate special requests
   */
  static validateSpecialRequests(requests: string): boolean {
    if (!requests) return true;

    const maxLength = 1000;
    return requests.trim().length <= maxLength;
  }

  /**
   * Enhanced validation for dinner reservation data (requires email/phone for all guests)
   */
  static validateEnhancedReservationData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate primary contact
    if (!data.fullName?.trim()) {
      errors.push('Primary contact: Full name is required');
    }
    if (!data.email?.trim()) {
      errors.push('Primary contact: Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Primary contact: Valid email is required');
    }
    if (!data.phoneNumber?.trim()) {
      errors.push('Primary contact: Phone number is required');
    } else {
      const phoneValidation = this.validateAndFormatPhone(data.phoneNumber);
      if (!phoneValidation.valid) {
        errors.push(`Primary contact: ${phoneValidation.error}`);
      }
    }

    if (!data.numberOfGuests || data.numberOfGuests < 1 || data.numberOfGuests > 10) {
      errors.push('Number of guests must be between 1 and 10');
    }

    // Enhanced guest validation
    if (!data.guestDetails || !Array.isArray(data.guestDetails)) {
      errors.push('Guest details are required');
    } else if (data.guestDetails.length !== data.numberOfGuests) {
      errors.push('Guest details count must match number of guests');
    } else {
      data.guestDetails.forEach((guest: any, index: number) => {
        if (!guest.name?.trim()) {
          errors.push(`Guest ${index + 1}: Name is required`);
        }
        if (!guest.email?.trim()) {
          errors.push(`Guest ${index + 1}: Email is required`);
        } else if (!this.isValidEmail(guest.email)) {
          errors.push(`Guest ${index + 1}: Valid email is required`);
        }
        if (!guest.phone?.trim()) {
          errors.push(`Guest ${index + 1}: Phone number is required`);
        } else {
          const phoneValidation = this.validateAndFormatPhone(guest.phone);
          if (!phoneValidation.valid) {
            errors.push(`Guest ${index + 1}: ${phoneValidation.error}`);
          }
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Email validation helper
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format phone number to international format
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    // Already in international format with +234
    if (cleanNumber.startsWith("234") && cleanNumber.length === 13) {
      return "+" + cleanNumber;
    }

    // Nigerian number starting with 0 (e.g., 07033680280)
    if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
      return "+234" + cleanNumber.substring(1);
    }

    // Nigerian number without leading 0 (e.g., 7033680280)
    if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
      return "+234" + cleanNumber;
    }

    throw new Error("Invalid Nigerian phone number format");
  }

  /**
   * Validate and format phone number
   */
  static validateAndFormatPhone(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);
      return { valid: true, formatted };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Legacy validation for backward compatibility
   */
  static validateGuestDetails(guestDetails: IGuestDetail[]): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!Array.isArray(guestDetails)) {
      return {
        valid: false,
        errors: ["Guest details must be an array"]
      };
    }

    if (guestDetails.length === 0) {
      return {
        valid: false,
        errors: ["At least one guest detail is required"]
      };
    }

    guestDetails.forEach((guest, index) => {
      if (!guest.name || guest.name.trim().length === 0) {
        errors.push(`Guest ${index + 1}: Name is required`);
      }

      if (guest.name && guest.name.trim().length > 100) {
        errors.push(`Guest ${index + 1}: Name must be less than 100 characters`);
      }

      // Enhanced validation for required fields
      if (!guest.email || guest.email.trim().length === 0) {
        errors.push(`Guest ${index + 1}: Email is required`);
      } else if (!this.isValidEmail(guest.email)) {
        errors.push(`Guest ${index + 1}: Valid email is required`);
      }

      if (!guest.phone || guest.phone.trim().length === 0) {
        errors.push(`Guest ${index + 1}: Phone number is required`);
      } else {
        const phoneValidation = this.validateAndFormatPhone(guest.phone);
        if (!phoneValidation.valid) {
          errors.push(`Guest ${index + 1}: ${phoneValidation.error}`);
        }
      }

      if (guest.dietaryRequirements && !this.validateDietaryRequirements(guest.dietaryRequirements)) {
        errors.push(`Guest ${index + 1}: Dietary requirements are too long (max 500 characters)`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}