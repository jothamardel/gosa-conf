import { Types } from 'mongoose';
import { User } from '../schema/user.schema';
import { ConventionRegistration } from '../schema/convention.schema';
import { DinnerReservation } from '../schema/dinner.schema';
import { Accommodation } from '../schema/accommodation.schema';
import { ConventionBrochure } from '../schema/brochure.schema';
import { GoodwillMessage } from '../schema/goodwill.schema';
import { Donation } from '../schema/donation.schema';
import { AttendeeBadge } from '../schema/badge.schema';
import { QRCodeService } from '../services/qr-code.service';

export interface AnalyticsData {
  totalAttendees: number;
  totalRevenue: number;
  revenueBreakdown: {
    convention: number;
    dinner: number;
    accommodation: number;
    brochure: number;
    goodwill: number;
    donations: number;
  };
  serviceStats: {
    conventionRegistrations: number;
    dinnerReservations: number;
    accommodationBookings: number;
    brochureOrders: number;
    goodwillMessages: number;
    totalDonations: number;
    badgesGenerated: number;
  };
  paymentTrends: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  topDonors: Array<{
    name: string;
    amount: number;
    donationCount: number;
  }>;
}

export interface AttendeeData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  registrationDate: Date;
  services: {
    convention: boolean;
    dinner: boolean;
    accommodation: boolean;
    brochure: boolean;
    goodwill: boolean;
    donation: boolean;
    badge: boolean;
  };
  totalSpent: number;
  qrCodes: Array<{
    service: string;
    code: string;
    used: boolean;
  }>;
}

export interface PaymentSummary {
  paymentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  service: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  paymentReference: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface DashboardSummary {
  todayStats: {
    newRegistrations: number;
    totalPayments: number;
    revenue: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    amount?: number;
  }>;
  pendingApprovals: {
    goodwillMessages: number;
    brochureOrders: number;
  };
  quickStats: {
    totalUsers: number;
    totalRevenue: number;
    thisMonthRevenue: number;
    conversionRate: number;
  };
}

export class AdminUtils {
  /**
   * Get comprehensive analytics data
   */
  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      const [
        conventionStats,
        dinnerStats,
        accommodationStats,
        brochureStats,
        goodwillStats,
        donationStats,
        badgeStats,
        paymentTrends
      ] = await Promise.all([
        this.getConventionStats(),
        this.getDinnerStats(),
        this.getAccommodationStats(),
        this.getBrochureStats(),
        this.getGoodwillStats(),
        this.getDonationStats(),
        this.getBadgeStats(),
        this.getPaymentTrends()
      ]);

      const totalRevenue = 
        conventionStats.revenue +
        dinnerStats.revenue +
        accommodationStats.revenue +
        brochureStats.revenue +
        goodwillStats.revenue +
        donationStats.revenue;

      const totalAttendees = await User.countDocuments();

      const topDonors = await this.getTopDonors();

      return {
        totalAttendees,
        totalRevenue,
        revenueBreakdown: {
          convention: conventionStats.revenue,
          dinner: dinnerStats.revenue,
          accommodation: accommodationStats.revenue,
          brochure: brochureStats.revenue,
          goodwill: goodwillStats.revenue,
          donations: donationStats.revenue
        },
        serviceStats: {
          conventionRegistrations: conventionStats.count,
          dinnerReservations: dinnerStats.count,
          accommodationBookings: accommodationStats.count,
          brochureOrders: brochureStats.count,
          goodwillMessages: goodwillStats.count,
          totalDonations: donationStats.count,
          badgesGenerated: badgeStats.count
        },
        paymentTrends,
        topDonors
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Error('Failed to retrieve analytics data');
    }
  }

  /**
   * Get all attendees with their service details
   */
  static async getAllAttendees(): Promise<AttendeeData[]> {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      
      const attendeesData = await Promise.all(
        users.map(async (user) => {
          const [
            convention,
            dinner,
            accommodation,
            brochure,
            goodwill,
            donation,
            badge
          ] = await Promise.all([
            ConventionRegistration.findOne({ userId: user._id }),
            DinnerReservation.findOne({ userId: user._id }),
            Accommodation.findOne({ userId: user._id }),
            ConventionBrochure.findOne({ userId: user._id }),
            GoodwillMessage.findOne({ userId: user._id }),
            Donation.findOne({ userId: user._id }),
            AttendeeBadge.findOne({ userId: user._id })
          ]);

          const totalSpent = 
            (convention?.totalAmount || 0) +
            (dinner?.totalAmount || 0) +
            (accommodation?.totalAmount || 0) +
            (brochure?.totalAmount || 0) +
            (goodwill?.donationAmount || 0) +
            (donation?.amount || 0);

          const qrCodes = [];
          if (convention?.qrCode) {
            qrCodes.push({
              service: 'convention',
              code: convention.qrCode,
              used: convention.checkedIn || false
            });
          }
          if (dinner?.qrCodes) {
            dinner.qrCodes.forEach((qr: any) => {
              qrCodes.push({
                service: 'dinner',
                code: qr.qrCode,
                used: qr.used
              });
            });
          }

          return {
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            registrationDate: user.createdAt,
            services: {
              convention: !!convention,
              dinner: !!dinner,
              accommodation: !!accommodation,
              brochure: !!brochure,
              goodwill: !!goodwill,
              donation: !!donation,
              badge: !!badge
            },
            totalSpent,
            qrCodes
          };
        })
      );

      return attendeesData;
    } catch (error) {
      console.error('Error getting all attendees:', error);
      throw new Error('Failed to retrieve attendee data');
    }
  }

  /**
   * Get all payments across services
   */
  static async getAllPayments(): Promise<PaymentSummary[]> {
    try {
      const [
        conventions,
        dinners,
        accommodations,
        brochures,
        goodwills,
        donations
      ] = await Promise.all([
        ConventionRegistration.find().populate('userId', 'name email').sort({ createdAt: -1 }),
        DinnerReservation.find().populate('userId', 'name email').sort({ createdAt: -1 }),
        Accommodation.find().populate('userId', 'name email').sort({ createdAt: -1 }),
        ConventionBrochure.find().populate('userId', 'name email').sort({ createdAt: -1 }),
        GoodwillMessage.find().populate('userId', 'name email').sort({ createdAt: -1 }),
        Donation.find().populate('userId', 'name email').sort({ createdAt: -1 })
      ]);

      const payments: PaymentSummary[] = [];

      // Convention payments
      conventions.forEach((conv: any) => {
        payments.push({
          paymentId: conv._id.toString(),
          userId: conv.userId._id.toString(),
          userName: conv.userId.name,
          userEmail: conv.userId.email,
          service: 'Convention Registration',
          amount: conv.totalAmount,
          status: conv.confirmed ? 'confirmed' : 'pending',
          paymentReference: conv.paymentReference,
          createdAt: conv.createdAt,
          confirmedAt: conv.confirmed ? conv.updatedAt : undefined
        });
      });

      // Dinner payments
      dinners.forEach((dinner: any) => {
        payments.push({
          paymentId: dinner._id.toString(),
          userId: dinner.userId._id.toString(),
          userName: dinner.userId.name,
          userEmail: dinner.userId.email,
          service: 'Dinner Reservation',
          amount: dinner.totalAmount,
          status: dinner.confirmed ? 'confirmed' : 'pending',
          paymentReference: dinner.paymentReference,
          createdAt: dinner.createdAt,
          confirmedAt: dinner.confirmed ? dinner.updatedAt : undefined
        });
      });

      // Accommodation payments
      accommodations.forEach((accom: any) => {
        payments.push({
          paymentId: accom._id.toString(),
          userId: accom.userId._id.toString(),
          userName: accom.userId.name,
          userEmail: accom.userId.email,
          service: 'Accommodation Booking',
          amount: accom.totalAmount,
          status: accom.confirmed ? 'confirmed' : 'pending',
          paymentReference: accom.paymentReference,
          createdAt: accom.createdAt,
          confirmedAt: accom.confirmed ? accom.updatedAt : undefined
        });
      });

      // Brochure payments
      brochures.forEach((brochure: any) => {
        payments.push({
          paymentId: brochure._id.toString(),
          userId: brochure.userId._id.toString(),
          userName: brochure.userId.name,
          userEmail: brochure.userId.email,
          service: 'Brochure Purchase',
          amount: brochure.totalAmount,
          status: brochure.confirmed ? 'confirmed' : 'pending',
          paymentReference: brochure.paymentReference,
          createdAt: brochure.createdAt,
          confirmedAt: brochure.confirmed ? brochure.updatedAt : undefined
        });
      });

      // Goodwill payments
      goodwills.forEach((goodwill: any) => {
        payments.push({
          paymentId: goodwill._id.toString(),
          userId: goodwill.userId._id.toString(),
          userName: goodwill.userId.name,
          userEmail: goodwill.userId.email,
          service: 'Goodwill Message',
          amount: goodwill.donationAmount,
          status: goodwill.confirmed ? 'confirmed' : 'pending',
          paymentReference: goodwill.paymentReference,
          createdAt: goodwill.createdAt,
          confirmedAt: goodwill.confirmed ? goodwill.updatedAt : undefined
        });
      });

      // Donation payments
      donations.forEach((donation: any) => {
        payments.push({
          paymentId: donation._id.toString(),
          userId: donation.userId._id.toString(),
          userName: donation.userId.name,
          userEmail: donation.userId.email,
          service: 'Donation',
          amount: donation.amount,
          status: donation.confirmed ? 'confirmed' : 'pending',
          paymentReference: donation.paymentReference,
          createdAt: donation.createdAt,
          confirmedAt: donation.confirmed ? donation.updatedAt : undefined
        });
      });

      // Sort by creation date (newest first)
      return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting all payments:', error);
      throw new Error('Failed to retrieve payment data');
    }
  }

  /**
   * Regenerate QR code for a service
   */
  static async regenerateQRCode(
    serviceType: string, 
    serviceId: string, 
    adminId: string,
    reason?: string
  ): Promise<string> {
    try {
      const result = await QRCodeService.regenerateQRCode(
        serviceType as 'convention' | 'dinner' | 'accommodation' | 'brochure',
        serviceId,
        adminId,
        reason
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.newQRCode;
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      throw new Error('Failed to regenerate QR code');
    }
  }

  /**
   * Get dashboard summary data
   */
  static async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const [
        todayRegistrations,
        todayPayments,
        todayRevenue,
        totalUsers,
        totalRevenue,
        thisMonthRevenue,
        pendingGoodwill,
        pendingBrochures,
        recentActivity
      ] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
        this.getTodayPaymentCount(),
        this.getTodayRevenue(),
        User.countDocuments(),
        this.getTotalRevenue(),
        this.getThisMonthRevenue(),
        GoodwillMessage.countDocuments({ approved: false, confirmed: true }),
        ConventionBrochure.countDocuments({ confirmed: true, collected: false }),
        this.getRecentActivity()
      ]);

      const conversionRate = totalUsers > 0 ? (todayRegistrations / totalUsers * 100) : 0;

      return {
        todayStats: {
          newRegistrations: todayRegistrations,
          totalPayments: todayPayments,
          revenue: todayRevenue
        },
        recentActivity,
        pendingApprovals: {
          goodwillMessages: pendingGoodwill,
          brochureOrders: pendingBrochures
        },
        quickStats: {
          totalUsers,
          totalRevenue,
          thisMonthRevenue,
          conversionRate
        }
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw new Error('Failed to retrieve dashboard summary');
    }
  }

  // Helper methods for analytics
  private static async getConventionStats() {
    const [count, revenue] = await Promise.all([
      ConventionRegistration.countDocuments({ confirmed: true }),
      ConventionRegistration.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);
    return { count, revenue: revenue[0]?.total || 0 };
  }

  private static async getDinnerStats() {
    const [count, revenue] = await Promise.all([
      DinnerReservation.countDocuments({ confirmed: true }),
      DinnerReservation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);
    return { count, revenue: revenue[0]?.total || 0 };
  }

  private static async getAccommodationStats() {
    const [count, revenue] = await Promise.all([
      Accommodation.countDocuments({ confirmed: true }),
      Accommodation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);
    return { count, revenue: revenue[0]?.total || 0 };
  }

  private static async getBrochureStats() {
    const [count, revenue] = await Promise.all([
      ConventionBrochure.countDocuments({ confirmed: true }),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);
    return { count, revenue: revenue[0]?.total || 0 };
  }

  private static async getGoodwillStats() {
    const [count, revenue] = await Promise.all([
      GoodwillMessage.countDocuments({ confirmed: true }),
      GoodwillMessage.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$donationAmount' } } }
      ])
    ]);
    return { count, revenue: revenue[0]?.total || 0 };
  }

  private static async getDonationStats() {
    const [count, revenue] = await Promise.all([
      Donation.countDocuments({ confirmed: true }),
      Donation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    return { count, revenue: revenue[0]?.total || 0 };
  }

  private static async getBadgeStats() {
    const count = await AttendeeBadge.countDocuments();
    return { count, revenue: 0 };
  }

  private static async getPaymentTrends() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // This is a simplified version - in production you'd want more sophisticated aggregation
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [conventionRevenue, dinnerRevenue, accommodationRevenue, brochureRevenue, goodwillRevenue, donationRevenue] = await Promise.all([
        ConventionRegistration.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: date, $lt: nextDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        DinnerReservation.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: date, $lt: nextDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Accommodation.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: date, $lt: nextDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        ConventionBrochure.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: date, $lt: nextDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        GoodwillMessage.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: date, $lt: nextDate } } },
          { $group: { _id: null, total: { $sum: '$donationAmount' }, count: { $sum: 1 } } }
        ]),
        Donation.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: date, $lt: nextDate } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ])
      ]);

      const totalAmount = 
        (conventionRevenue[0]?.total || 0) +
        (dinnerRevenue[0]?.total || 0) +
        (accommodationRevenue[0]?.total || 0) +
        (brochureRevenue[0]?.total || 0) +
        (goodwillRevenue[0]?.total || 0) +
        (donationRevenue[0]?.total || 0);

      const totalCount = 
        (conventionRevenue[0]?.count || 0) +
        (dinnerRevenue[0]?.count || 0) +
        (accommodationRevenue[0]?.count || 0) +
        (brochureRevenue[0]?.count || 0) +
        (goodwillRevenue[0]?.count || 0) +
        (donationRevenue[0]?.count || 0);

      trends.push({
        date: date.toISOString().split('T')[0],
        amount: totalAmount,
        count: totalCount
      });
    }

    return trends;
  }

  private static async getTopDonors() {
    const topDonors = await Donation.aggregate([
      { $match: { confirmed: true, anonymous: false } },
      {
        $group: {
          _id: '$donorName',
          amount: { $sum: '$amount' },
          donationCount: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: '$_id',
          amount: 1,
          donationCount: 1,
          _id: 0
        }
      }
    ]);

    return topDonors;
  }

  private static async getTodayPaymentCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [convention, dinner, accommodation, brochure, goodwill, donation] = await Promise.all([
      ConventionRegistration.countDocuments({ confirmed: true, createdAt: { $gte: today, $lt: tomorrow } }),
      DinnerReservation.countDocuments({ confirmed: true, createdAt: { $gte: today, $lt: tomorrow } }),
      Accommodation.countDocuments({ confirmed: true, createdAt: { $gte: today, $lt: tomorrow } }),
      ConventionBrochure.countDocuments({ confirmed: true, createdAt: { $gte: today, $lt: tomorrow } }),
      GoodwillMessage.countDocuments({ confirmed: true, createdAt: { $gte: today, $lt: tomorrow } }),
      Donation.countDocuments({ confirmed: true, createdAt: { $gte: today, $lt: tomorrow } })
    ]);

    return convention + dinner + accommodation + brochure + goodwill + donation;
  }

  private static async getTodayRevenue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [convention, dinner, accommodation, brochure, goodwill, donation] = await Promise.all([
      ConventionRegistration.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      DinnerReservation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Accommodation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      GoodwillMessage.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$donationAmount' } } }
      ]),
      Donation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    return (
      (convention[0]?.total || 0) +
      (dinner[0]?.total || 0) +
      (accommodation[0]?.total || 0) +
      (brochure[0]?.total || 0) +
      (goodwill[0]?.total || 0) +
      (donation[0]?.total || 0)
    );
  }

  private static async getTotalRevenue() {
    const [convention, dinner, accommodation, brochure, goodwill, donation] = await Promise.all([
      ConventionRegistration.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      DinnerReservation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Accommodation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      GoodwillMessage.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$donationAmount' } } }
      ]),
      Donation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    return (
      (convention[0]?.total || 0) +
      (dinner[0]?.total || 0) +
      (accommodation[0]?.total || 0) +
      (brochure[0]?.total || 0) +
      (goodwill[0]?.total || 0) +
      (donation[0]?.total || 0)
    );
  }

  private static async getThisMonthRevenue() {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [convention, dinner, accommodation, brochure, goodwill, donation] = await Promise.all([
      ConventionRegistration.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      DinnerReservation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Accommodation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      GoodwillMessage.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$donationAmount' } } }
      ]),
      Donation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    return (
      (convention[0]?.total || 0) +
      (dinner[0]?.total || 0) +
      (accommodation[0]?.total || 0) +
      (brochure[0]?.total || 0) +
      (goodwill[0]?.total || 0) +
      (donation[0]?.total || 0)
    );
  }

  private static async getRecentActivity() {
    const activities = [];

    // Get recent registrations
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    recentUsers.forEach(user => {
      activities.push({
        type: 'registration',
        description: `${user.name} registered for the convention`,
        timestamp: user.createdAt
      });
    });

    // Get recent payments
    const recentPayments = await ConventionRegistration.find({ confirmed: true })
      .populate('userId', 'name')
      .sort({ updatedAt: -1 })
      .limit(5);
    
    recentPayments.forEach((payment: any) => {
      activities.push({
        type: 'payment',
        description: `${payment.userId.name} completed convention payment`,
        timestamp: payment.updatedAt,
        amount: payment.totalAmount
      });
    });

    // Sort by timestamp and return latest 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }
}