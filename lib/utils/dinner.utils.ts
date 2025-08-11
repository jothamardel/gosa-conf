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
}

export class DinnerUtils {
  /**
   * Create a new dinner reservation
   */
  static async createReservation(data: DinnerReservationData): Promise<IDinnerReservation> {
    try {
      await connectDB();

      // Validate guest details count matches numberOfGuests
      if (data.guestDetails.length !== data.numberOfGuests) {
        throw new Error("Number of guest details must match numberOfGuests");
      }

      // Validate guest details
      for (const guest of data.guestDetails) {
        if (!guest.name || guest.name.trim().length === 0) {
          throw new Error("All guests must have a name");
        }
      }

      // Create reservation without QR codes first
      const reservation = await DinnerModel.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
        confirmed: false
        // Don't set qrCodes at all, let it default to empty array
      });

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
   * Confirm a dinner reservation and generate QR codes
   */
  static async confirmReservation(paymentReference: string): Promise<IDinnerReservation> {
    try {
      await connectDB();

      const reservation = await DinnerModel.findOne({ paymentReference });
      if (!reservation) {
        throw new Error("Dinner reservation not found");
      }

      if (reservation.confirmed) {
        return reservation;
      }

      // Generate QR codes for all guests
      const qrCodes = await this.generateQRCodes(reservation._id.toString(), reservation.guestDetails);

      // Update reservation with confirmation and QR codes
      const updatedReservation = await DinnerModel.findByIdAndUpdate(
        reservation._id,
        {
          confirmed: true,
          qrCodes
        },
        { new: true }
      ).populate("userId");

      if (!updatedReservation) {
        throw new Error("Failed to update dinner reservation");
      }

      return updatedReservation;
    } catch (error) {
      throw new Error(`Failed to confirm dinner reservation: ${error}`);
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
  static calculateTotalAmount(numberOfGuests: number, pricePerPerson: number = 75): number {
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
   * Validate guest details
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