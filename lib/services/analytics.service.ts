import { ConventionRegistration } from '../schema/convention.schema';
import { DinnerReservation } from '../schema/dinner.schema';
import { Accommodation } from '../schema/accommodation.schema';
import { ConventionBrochure } from '../schema/brochure.schema';
import { GoodwillMessage } from '../schema/goodwill.schema';
import { Donation } from '../schema/donation.schema';
import { User } from '../schema/user.schema';

export interface RevenueBreakdown {
  total: number;
  byService: {
    convention: number;
    dinner: number;
    accommodation: number;
    brochure: number;
    goodwill: number;
    donations: number;
  };
  byMonth: Array<{
    month: string;
    amount: number;
  }>;
}

export interface ServiceAnalytics {
  convention: {
    count: number;
    revenue: number;
    averageAmount: number;
  };
  dinner: {
    count: number;
    revenue: number;
    averageAmount: number;
    totalGuests: number;
  };
  accommodation: {
    count: number;
    revenue: number;
    averageAmount: number;
    byType: {
      standard: number;
      premium: number;
      luxury: number;
    };
  };
  brochure: {
    count: number;
    revenue: number;
    averageAmount: number;
    byType: {
      digital: number;
      physical: number;
    };
  };
  goodwill: {
    count: number;
    revenue: number;
    averageAmount: number;
    approved: number;
    pending: number;
  };
  donations: {
    count: number;
    revenue: number;
    averageAmount: number;
    anonymous: number;
    attributed: number;
  };
}

export interface PaymentTrends {
  daily: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  weekly: Array<{
    week: string;
    amount: number;
    count: number;
  }>;
  monthly: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

export interface DonorData {
  name: string;
  totalAmount: number;
  donationCount: number;
  averageDonation: number;
  lastDonation: Date;
  anonymous: boolean;
}

export class AnalyticsService {
  /**
   * Get total number of attendees
   */
  static async getTotalAttendees(): Promise<number> {
    try {
      return await User.countDocuments();
    } catch (error) {
      console.error('Error getting total attendees:', error);
      throw new Error('Failed to get total attendees');
    }
  }

  /**
   * Get comprehensive revenue breakdown
   */
  static async getTotalRevenue(): Promise<RevenueBreakdown> {
    try {
      const [
        conventionRevenue,
        dinnerRevenue,
        accommodationRevenue,
        brochureRevenue,
        goodwillRevenue,
        donationRevenue
      ] = await Promise.all([
        this.getServiceRevenue(ConventionRegistration, 'totalAmount'),
        this.getServiceRevenue(DinnerReservation, 'totalAmount'),
        this.getServiceRevenue(Accommodation, 'totalAmount'),
        this.getServiceRevenue(ConventionBrochure, 'totalAmount'),
        this.getServiceRevenue(GoodwillMessage, 'donationAmount'),
        this.getServiceRevenue(Donation, 'amount')
      ]);

      const total = conventionRevenue + dinnerRevenue + accommodationRevenue + 
                   brochureRevenue + goodwillRevenue + donationRevenue;

      const byMonth = await this.getMonthlyRevenue();

      return {
        total,
        byService: {
          convention: conventionRevenue,
          dinner: dinnerRevenue,
          accommodation: accommodationRevenue,
          brochure: brochureRevenue,
          goodwill: goodwillRevenue,
          donations: donationRevenue
        },
        byMonth
      };
    } catch (error) {
      console.error('Error getting total revenue:', error);
      throw new Error('Failed to get revenue breakdown');
    }
  }

  /**
   * Get detailed service analytics
   */
  static async getServiceBreakdown(): Promise<ServiceAnalytics> {
    try {
      const [
        conventionStats,
        dinnerStats,
        accommodationStats,
        brochureStats,
        goodwillStats,
        donationStats
      ] = await Promise.all([
        this.getConventionAnalytics(),
        this.getDinnerAnalytics(),
        this.getAccommodationAnalytics(),
        this.getBrochureAnalytics(),
        this.getGoodwillAnalytics(),
        this.getDonationAnalytics()
      ]);

      return {
        convention: conventionStats,
        dinner: dinnerStats,
        accommodation: accommodationStats,
        brochure: brochureStats,
        goodwill: goodwillStats,
        donations: donationStats
      };
    } catch (error) {
      console.error('Error getting service breakdown:', error);
      throw new Error('Failed to get service analytics');
    }
  }

  /**
   * Get payment trends over time
   */
  static async getPaymentTrends(): Promise<PaymentTrends> {
    try {
      const [daily, weekly, monthly] = await Promise.all([
        this.getDailyTrends(),
        this.getWeeklyTrends(),
        this.getMonthlyTrends()
      ]);

      return { daily, weekly, monthly };
    } catch (error) {
      console.error('Error getting payment trends:', error);
      throw new Error('Failed to get payment trends');
    }
  }

  /**
   * Get top donors information
   */
  static async getTopDonors(): Promise<DonorData[]> {
    try {
      const topDonors = await Donation.aggregate([
        { $match: { confirmed: true } },
        {
          $group: {
            _id: {
              name: { $cond: [{ $eq: ['$anonymous', true] }, 'Anonymous', '$donorName'] },
              anonymous: '$anonymous'
            },
            totalAmount: { $sum: '$amount' },
            donationCount: { $sum: 1 },
            lastDonation: { $max: '$createdAt' }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 20 },
        {
          $project: {
            name: '$_id.name',
            anonymous: '$_id.anonymous',
            totalAmount: 1,
            donationCount: 1,
            averageDonation: { $divide: ['$totalAmount', '$donationCount'] },
            lastDonation: 1,
            _id: 0
          }
        }
      ]);

      return topDonors;
    } catch (error) {
      console.error('Error getting top donors:', error);
      throw new Error('Failed to get donor data');
    }
  }

  // Private helper methods
  private static async getServiceRevenue(model: any, amountField: string): Promise<number> {
    const result = await model.aggregate([
      { $match: { confirmed: true } },
      { $group: { _id: null, total: { $sum: `$${amountField}` } } }
    ]);
    return result[0]?.total || 0;
  }

  private static async getMonthlyRevenue(): Promise<Array<{ month: string; amount: number }>> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const [convention, dinner, accommodation, brochure, goodwill, donation] = await Promise.all([
        ConventionRegistration.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        DinnerReservation.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        Accommodation.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        ConventionBrochure.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        GoodwillMessage.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$donationAmount' } } }
        ]),
        Donation.aggregate([
          { $match: { confirmed: true, createdAt: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const totalAmount = 
        (convention[0]?.total || 0) +
        (dinner[0]?.total || 0) +
        (accommodation[0]?.total || 0) +
        (brochure[0]?.total || 0) +
        (goodwill[0]?.total || 0) +
        (donation[0]?.total || 0);

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        amount: totalAmount
      });
    }

    return monthlyData;
  }

  private static async getConventionAnalytics() {
    const [count, revenue] = await Promise.all([
      ConventionRegistration.countDocuments({ confirmed: true }),
      ConventionRegistration.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalRevenue = revenue[0]?.total || 0;
    return {
      count,
      revenue: totalRevenue,
      averageAmount: count > 0 ? totalRevenue / count : 0
    };
  }

  private static async getDinnerAnalytics() {
    const [count, revenue, guestCount] = await Promise.all([
      DinnerReservation.countDocuments({ confirmed: true }),
      DinnerReservation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      DinnerReservation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$numberOfGuests' } } }
      ])
    ]);

    const totalRevenue = revenue[0]?.total || 0;
    const totalGuests = guestCount[0]?.total || 0;

    return {
      count,
      revenue: totalRevenue,
      averageAmount: count > 0 ? totalRevenue / count : 0,
      totalGuests
    };
  }

  private static async getAccommodationAnalytics() {
    const [count, revenue, byType] = await Promise.all([
      Accommodation.countDocuments({ confirmed: true }),
      Accommodation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Accommodation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: '$accommodationType', count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = revenue[0]?.total || 0;
    const typeBreakdown = byType.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, { standard: 0, premium: 0, luxury: 0 });

    return {
      count,
      revenue: totalRevenue,
      averageAmount: count > 0 ? totalRevenue / count : 0,
      byType: typeBreakdown
    };
  }

  private static async getBrochureAnalytics() {
    const [count, revenue, byType] = await Promise.all([
      ConventionBrochure.countDocuments({ confirmed: true }),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: '$brochureType', count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = revenue[0]?.total || 0;
    const typeBreakdown = byType.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, { digital: 0, physical: 0 });

    return {
      count,
      revenue: totalRevenue,
      averageAmount: count > 0 ? totalRevenue / count : 0,
      byType: typeBreakdown
    };
  }

  private static async getGoodwillAnalytics() {
    const [count, revenue, approved, pending] = await Promise.all([
      GoodwillMessage.countDocuments({ confirmed: true }),
      GoodwillMessage.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$donationAmount' } } }
      ]),
      GoodwillMessage.countDocuments({ confirmed: true, approved: true }),
      GoodwillMessage.countDocuments({ confirmed: true, approved: false })
    ]);

    const totalRevenue = revenue[0]?.total || 0;

    return {
      count,
      revenue: totalRevenue,
      averageAmount: count > 0 ? totalRevenue / count : 0,
      approved,
      pending
    };
  }

  private static async getDonationAnalytics() {
    const [count, revenue, anonymous, attributed] = await Promise.all([
      Donation.countDocuments({ confirmed: true }),
      Donation.aggregate([
        { $match: { confirmed: true } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Donation.countDocuments({ confirmed: true, anonymous: true }),
      Donation.countDocuments({ confirmed: true, anonymous: false })
    ]);

    const totalRevenue = revenue[0]?.total || 0;

    return {
      count,
      revenue: totalRevenue,
      averageAmount: count > 0 ? totalRevenue / count : 0,
      anonymous,
      attributed
    };
  }

  private static async getDailyTrends() {
    // Implementation for daily trends (last 30 days)
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get total revenue and count for this day across all services
      const dayData = await this.getDayRevenue(date, nextDate);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        amount: dayData.amount,
        count: dayData.count
      });
    }
    return trends;
  }

  private static async getWeeklyTrends() {
    // Implementation for weekly trends (last 12 weeks)
    const trends = [];
    for (let i = 11; i >= 0; i--) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (i * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      const weekData = await this.getDayRevenue(startDate, endDate);
      
      trends.push({
        week: `Week of ${startDate.toLocaleDateString()}`,
        amount: weekData.amount,
        count: weekData.count
      });
    }
    return trends;
  }

  private static async getMonthlyTrends() {
    // Implementation for monthly trends (last 12 months)
    const trends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthData = await this.getDayRevenue(monthStart, monthEnd);
      
      trends.push({
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        amount: monthData.amount,
        count: monthData.count
      });
    }
    return trends;
  }

  private static async getDayRevenue(startDate: Date, endDate: Date) {
    const [convention, dinner, accommodation, brochure, goodwill, donation] = await Promise.all([
      ConventionRegistration.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      DinnerReservation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      Accommodation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      ConventionBrochure.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      GoodwillMessage.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$donationAmount' }, count: { $sum: 1 } } }
      ]),
      Donation.aggregate([
        { $match: { confirmed: true, createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalAmount = 
      (convention[0]?.total || 0) +
      (dinner[0]?.total || 0) +
      (accommodation[0]?.total || 0) +
      (brochure[0]?.total || 0) +
      (goodwill[0]?.total || 0) +
      (donation[0]?.total || 0);

    const totalCount = 
      (convention[0]?.count || 0) +
      (dinner[0]?.count || 0) +
      (accommodation[0]?.count || 0) +
      (brochure[0]?.count || 0) +
      (goodwill[0]?.count || 0) +
      (donation[0]?.count || 0);

    return { amount: totalAmount, count: totalCount };
  }
}