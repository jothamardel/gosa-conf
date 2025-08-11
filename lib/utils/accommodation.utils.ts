import connectDB from "../mongodb";
import { Accommodation, IAccommodation, IAccommodationGuest } from "../schema/accommodation.schema";
import { Types } from "mongoose";

// Type assertion to bypass Mongoose typing issues
const AccommodationModel = Accommodation as any;

export interface AccommodationData {
  userId: string | Types.ObjectId;
  paymentReference: string;
  accommodationType: 'standard' | 'premium' | 'luxury';
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  guestDetails: IAccommodationGuest[];
  specialRequests?: string;
  totalAmount: number;
}

export class AccommodationUtils {
  // Accommodation pricing per night
  static readonly PRICING = {
    standard: 100,
    premium: 200,
    luxury: 350
  };

  /**
   * Create a new accommodation booking
   */
  static async createBooking(data: AccommodationData): Promise<IAccommodation> {
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

      // Validate dates
      if (data.checkOutDate <= data.checkInDate) {
        throw new Error("Check-out date must be after check-in date");
      }

      // Generate confirmation code
      const confirmationCode = this.generateConfirmationCode();

      // Create booking
      const booking = await AccommodationModel.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
        confirmed: false,
        confirmationCode
      });

      return booking;
    } catch (error) {
      throw new Error(`Failed to create accommodation booking: ${error}`);
    }
  }

  /**
   * Find an accommodation booking by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<any | null> {
    try {
      await connectDB();

      // Search for booking where paymentReference starts with the pattern
      const { Accommodation } = await import('../schema/accommodation.schema');
      const booking = await Accommodation.findOne({
        paymentReference: { $regex: `^${referencePattern}` }
      }).populate('userId');

      return booking;
    } catch (error) {
      console.error(`Error finding accommodation booking by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm an accommodation booking
   */
  static async confirmBooking(paymentReference: string): Promise<IAccommodation> {
    try {
      await connectDB();

      const booking = await AccommodationModel.findOneAndUpdate(
        { paymentReference },
        { confirmed: true },
        { new: true }
      ).populate("userId");

      if (!booking) {
        throw new Error("Accommodation booking not found");
      }

      return booking;
    } catch (error) {
      throw new Error(`Failed to confirm accommodation booking: ${error}`);
    }
  }

  /**
   * Generate a unique confirmation code
   */
  static generateConfirmationCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ACCOM-${timestamp}-${random}`;
  }

  /**
   * Get all accommodation bookings for a user
   */
  static async getUserBookings(userId: string | Types.ObjectId): Promise<IAccommodation[]> {
    try {
      await connectDB();
      return await AccommodationModel.find({
        userId: new Types.ObjectId(userId)
      }).populate("userId").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user accommodation bookings: ${error}`);
    }
  }

  /**
   * Find booking by payment reference
   */
  static async findByPaymentReference(paymentReference: string): Promise<IAccommodation | null> {
    try {
      await connectDB();
      return await AccommodationModel.findOne({ paymentReference }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find accommodation booking: ${error}`);
    }
  }

  /**
   * Find multiple bookings by payment reference pattern (for group bookings)
   */
  static async findMany(paymentReference: string): Promise<IAccommodation[]> {
    try {
      await connectDB();
      return await AccommodationModel.find({
        paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
      }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find accommodation bookings: ${error}`);
    }
  }

  /**
   * Confirm multiple bookings by payment reference pattern
   */
  static async findAndConfirmMany(paymentReference: string): Promise<any> {
    try {
      await connectDB();

      return await AccommodationModel.updateMany(
        {
          paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
        },
        { confirmed: true }
      );
    } catch (error) {
      throw new Error(`Failed to confirm multiple accommodation bookings: ${error}`);
    }
  }

  /**
   * Find booking by confirmation code
   */
  static async findByConfirmationCode(confirmationCode: string): Promise<IAccommodation | null> {
    try {
      await connectDB();
      return await AccommodationModel.findOne({ confirmationCode }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find accommodation booking by confirmation code: ${error}`);
    }
  }

  /**
   * Get all accommodation bookings with pagination
   */
  static async getAllBookings(page: number = 1, limit: number = 10): Promise<{
    bookings: IAccommodation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      await connectDB();

      const skip = (page - 1) * limit;

      const bookings = await AccommodationModel.find({})
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await AccommodationModel.countDocuments();

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get accommodation bookings: ${error}`);
    }
  }

  /**
   * Calculate accommodation total amount based on type, dates, and number of guests
   */
  static calculateTotalAmount(
    accommodationType: 'standard' | 'premium' | 'luxury',
    checkInDate: Date,
    checkOutDate: Date,
    numberOfGuests: number = 1
  ): number {
    const pricePerNight = this.PRICING[accommodationType];
    const nights = this.calculateNights(checkInDate, checkOutDate);

    // Base price for the room
    let totalAmount = pricePerNight * nights;

    // Additional charge for extra guests (beyond 2 guests)
    if (numberOfGuests > 2) {
      const extraGuests = numberOfGuests - 2;
      const extraGuestCharge = Math.floor(pricePerNight * 0.3); // 30% of room price per extra guest per night
      totalAmount += extraGuestCharge * extraGuests * nights;
    }

    return totalAmount;
  }

  /**
   * Calculate number of nights between check-in and check-out dates
   */
  static calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(nights, 1); // Minimum 1 night
  }

  /**
   * Check availability for accommodation type and dates
   */
  static async checkAvailability(
    accommodationType: 'standard' | 'premium' | 'luxury',
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<{
    available: boolean;
    totalRooms: number;
    bookedRooms: number;
    availableRooms: number;
  }> {
    try {
      await connectDB();

      // Define room capacity for each accommodation type
      const roomCapacity = {
        standard: 50,
        premium: 30,
        luxury: 15
      };

      const totalRooms = roomCapacity[accommodationType];

      // Find overlapping bookings for the same accommodation type
      const overlappingBookings = await AccommodationModel.countDocuments({
        accommodationType,
        confirmed: true,
        $or: [
          {
            // Booking starts during the requested period
            checkInDate: { $gte: checkInDate, $lt: checkOutDate }
          },
          {
            // Booking ends during the requested period
            checkOutDate: { $gt: checkInDate, $lte: checkOutDate }
          },
          {
            // Booking spans the entire requested period
            checkInDate: { $lte: checkInDate },
            checkOutDate: { $gte: checkOutDate }
          }
        ]
      });

      const bookedRooms = overlappingBookings;
      const availableRooms = Math.max(0, totalRooms - bookedRooms);

      return {
        available: availableRooms > 0,
        totalRooms,
        bookedRooms,
        availableRooms
      };
    } catch (error) {
      throw new Error(`Failed to check availability: ${error}`);
    }
  }

  /**
   * Get accommodation type details
   */
  static getAccommodationTypeDetails(accommodationType: 'standard' | 'premium' | 'luxury'): {
    name: string;
    price: number;
    description: string;
    amenities: string[];
  } {
    const details = {
      standard: {
        name: 'Standard Room',
        price: this.PRICING.standard,
        description: 'Comfortable accommodation with essential amenities',
        amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'Air Conditioning']
      },
      premium: {
        name: 'Premium Room',
        price: this.PRICING.premium,
        description: 'Spacious room with upgraded amenities and city view',
        amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'Air Conditioning', 'City View', 'Mini Bar', 'Room Service']
      },
      luxury: {
        name: 'Luxury Suite',
        price: this.PRICING.luxury,
        description: 'Executive suite with premium amenities and concierge services',
        amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'Air Conditioning', 'City View', 'Mini Bar', 'Room Service', 'Concierge', 'Balcony', 'Premium Bedding']
      }
    };

    return details[accommodationType];
  }

  /**
   * Validate check-in and check-out dates
   */
  static validateDates(checkInDate: Date, checkOutDate: Date): {
    valid: boolean;
    message?: string;
  } {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day

    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    const checkOut = new Date(checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    // Check if check-in date is in the past
    if (checkIn < now) {
      return {
        valid: false,
        message: "Check-in date cannot be in the past"
      };
    }

    // Check if check-out date is after check-in date
    if (checkOut <= checkIn) {
      return {
        valid: false,
        message: "Check-out date must be after check-in date"
      };
    }

    // Check if booking is too far in advance (e.g., 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (checkIn > oneYearFromNow) {
      return {
        valid: false,
        message: "Check-in date cannot be more than 1 year in advance"
      };
    }

    // Check maximum stay duration (e.g., 30 days)
    const maxStayDays = 30;
    const stayDuration = this.calculateNights(checkIn, checkOut);

    if (stayDuration > maxStayDays) {
      return {
        valid: false,
        message: `Maximum stay duration is ${maxStayDays} days`
      };
    }

    return { valid: true };
  }

  /**
   * Get accommodation pricing information
   */
  static getPricingInfo(): {
    standard: { price: number; description: string };
    premium: { price: number; description: string };
    luxury: { price: number; description: string };
  } {
    return {
      standard: {
        price: this.PRICING.standard,
        description: "Standard room with basic amenities"
      },
      premium: {
        price: this.PRICING.premium,
        description: "Premium room with enhanced amenities and services"
      },
      luxury: {
        price: this.PRICING.luxury,
        description: "Luxury suite with premium amenities and concierge services"
      }
    };
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
  static validateGuestDetails(guestDetails: IAccommodationGuest[]): {
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

      // Validate email format if provided
      if (guest.email && guest.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guest.email)) {
          errors.push(`Guest ${index + 1}: Invalid email format`);
        }
      }

      // Validate phone format if provided
      if (guest.phone && guest.phone.trim().length > 0) {
        const phoneRegex = /^(\+?234[789]\d{8}|0[789]\d{8}|\+?[1-9]\d{7,14})$/;
        if (!phoneRegex.test(guest.phone.replace(/[\s\-\(\)]/g, ''))) {
          errors.push(`Guest ${index + 1}: Invalid phone format`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get bookings by accommodation type
   */
  static async getBookingsByType(accommodationType: 'standard' | 'premium' | 'luxury'): Promise<IAccommodation[]> {
    try {
      await connectDB();
      return await AccommodationModel.find({ accommodationType })
        .populate("userId")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get bookings by type: ${error}`);
    }
  }

  /**
   * Get bookings by date range
   */
  static async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<IAccommodation[]> {
    try {
      await connectDB();
      return await AccommodationModel.find({
        $or: [
          {
            checkInDate: { $gte: startDate, $lte: endDate }
          },
          {
            checkOutDate: { $gte: startDate, $lte: endDate }
          },
          {
            checkInDate: { $lte: startDate },
            checkOutDate: { $gte: endDate }
          }
        ]
      }).populate("userId").sort({ checkInDate: 1 });
    } catch (error) {
      throw new Error(`Failed to get bookings by date range: ${error}`);
    }
  }
}