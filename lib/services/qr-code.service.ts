import * as QRCode from 'qrcode';
import { Types } from 'mongoose';
import { QRCodeHistory } from '../schema/qr-history.schema';
import { ConventionRegistration } from '../schema/convention.schema';
import { DinnerReservation } from '../schema/dinner.schema';
import { Accommodation } from '../schema/accommodation.schema';
import { ConventionBrochure } from '../schema/brochure.schema';

export interface QRCodeData {
  type: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation';
  id: string;
  userId: string;
  guestName?: string;
  validUntil: Date;
  metadata: Record<string, any>;
}

export interface RegenerationResult {
  success: boolean;
  oldQRCode: string;
  newQRCode: string;
  historyId: string;
  message: string;
}

export class QRCodeService {
  /**
   * Generate a QR code from data string
   */
  static async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate multiple QR codes from array of data strings
   */
  static async generateMultipleQRCodes(dataArray: string[]): Promise<string[]> {
    try {
      const qrCodes = await Promise.all(
        dataArray.map(data => this.generateQRCode(data))
      );
      return qrCodes;
    } catch (error) {
      console.error('Error generating multiple QR codes:', error);
      throw new Error('Failed to generate QR codes');
    }
  }

  /**
   * Validate QR code format and structure
   */
  static async validateQRCode(qrCode: string): Promise<boolean> {
    try {
      // Basic validation - check if it's a valid data URL
      if (!qrCode.startsWith('data:image/png;base64,')) {
        return false;
      }

      // Additional validation could include:
      // - Checking if the base64 data is valid
      // - Verifying the image dimensions
      // - Checking if it contains valid QR code data

      return true;
    } catch (error) {
      console.error('Error validating QR code:', error);
      return false;
    }
  }

  /**
   * Regenerate QR code for a specific service
   */
  static async regenerateQRCode(
    serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure',
    serviceId: string,
    adminId: string,
    reason?: string
  ): Promise<RegenerationResult> {
    try {
      // Get the service record and current QR code
      const serviceRecord = await this.getServiceRecord(serviceType, serviceId);
      if (!serviceRecord) {
        throw new Error('Service record not found');
      }

      let oldQRCode: string;
      let newQRCodeData: string;

      // Handle different service types
      switch (serviceType) {
        case 'convention':
          oldQRCode = serviceRecord.qrCode;
          newQRCodeData = this.generateQRCodeData({
            type: 'convention',
            id: serviceId,
            userId: serviceRecord.userId.toString(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            metadata: {
              name: serviceRecord.name,
              email: serviceRecord.email,
              phone: serviceRecord.phone
            }
          });
          break;

        case 'dinner':
          oldQRCode = serviceRecord.qrCodes?.[0]?.qrCode || '';
          newQRCodeData = this.generateQRCodeData({
            type: 'dinner',
            id: serviceId,
            userId: serviceRecord.userId.toString(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            metadata: {
              numberOfGuests: serviceRecord.numberOfGuests,
              guestDetails: serviceRecord.guestDetails
            }
          });
          break;

        case 'accommodation':
          // Accommodation uses confirmation codes, not QR codes
          throw new Error('Accommodation bookings use confirmation codes, not QR codes');

        case 'brochure':
          oldQRCode = serviceRecord.qrCode;
          newQRCodeData = this.generateQRCodeData({
            type: 'brochure',
            id: serviceId,
            userId: serviceRecord.userId.toString(),
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            metadata: {
              quantity: serviceRecord.quantity,
              brochureType: serviceRecord.brochureType
            }
          });
          break;

        default:
          throw new Error('Unsupported service type');
      }

      // Generate new QR code
      const newQRCode = await this.generateQRCode(newQRCodeData);

      // Update the service record with new QR code
      await this.updateServiceQRCode(serviceType, serviceId, newQRCode);

      // Create history record
      const historyRecord = new QRCodeHistory({
        userId: serviceRecord.userId,
        serviceType,
        serviceId: new Types.ObjectId(serviceId),
        oldQRCode,
        newQRCode,
        regeneratedBy: new Types.ObjectId(adminId),
        reason
      });

      await historyRecord.save();

      return {
        success: true,
        oldQRCode,
        newQRCode,
        historyId: historyRecord._id.toString(),
        message: 'QR code regenerated successfully'
      };

    } catch (error: any) {
      console.error('Error regenerating QR code:', error);
      return {
        success: false,
        oldQRCode: '',
        newQRCode: '',
        historyId: '',
        message: error.message || 'Failed to regenerate QR code'
      };
    }
  }

  /**
   * Get QR code regeneration history for a user
   */
  static async getRegenerationHistory(userId: string): Promise<any[]> {
    try {
      const history = await QRCodeHistory.find({ userId: new Types.ObjectId(userId) })
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .exec();

      return history.map(record => ({
        id: record._id,
        serviceType: record.serviceType,
        serviceId: record.serviceId,
        regeneratedAt: record.createdAt,
        regeneratedBy: record.admin ? {
          name: (record.admin as any).name,
          email: (record.admin as any).email
        } : null,
        reason: record.reason
      }));
    } catch (error) {
      console.error('Error getting regeneration history:', error);
      throw new Error('Failed to retrieve regeneration history');
    }
  }

  /**
   * Get all QR code regeneration history (admin view)
   */
  static async getAllRegenerationHistory(page: number = 1, limit: number = 50): Promise<{
    history: any[];
    pagination: any;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        QRCodeHistory.find()
          .populate('user', 'name email')
          .populate('admin', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        QRCodeHistory.countDocuments()
      ]);

      const formattedHistory = history.map(record => ({
        id: record._id,
        serviceType: record.serviceType,
        serviceId: record.serviceId,
        user: record.user ? {
          name: (record.user as any).name,
          email: (record.user as any).email
        } : null,
        regeneratedAt: record.createdAt,
        regeneratedBy: record.admin ? {
          name: (record.admin as any).name,
          email: (record.admin as any).email
        } : null,
        reason: record.reason
      }));

      return {
        history: formattedHistory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting all regeneration history:', error);
      throw new Error('Failed to retrieve regeneration history');
    }
  }

  // Private helper methods
  private static generateQRCodeData(data: QRCodeData): string {
    // Generate the URL format for QR code scanning
    return `https://gosa.events/scan?id=${data.id}`;
  }

  private static async getServiceRecord(serviceType: string, serviceId: string): Promise<any> {
    const objectId = new Types.ObjectId(serviceId);

    switch (serviceType) {
      case 'convention':
        return await ConventionRegistration.findById(objectId);
      case 'dinner':
        return await DinnerReservation.findById(objectId);
      case 'accommodation':
        return await Accommodation.findById(objectId);
      case 'brochure':
        return await ConventionBrochure.findById(objectId);
      default:
        return null;
    }
  }

  private static async updateServiceQRCode(serviceType: string, serviceId: string, newQRCode: string): Promise<void> {
    const objectId = new Types.ObjectId(serviceId);

    switch (serviceType) {
      case 'convention':
        await ConventionRegistration.findByIdAndUpdate(objectId, { qrCode: newQRCode });
        break;
      case 'dinner':
        // For dinner reservations, update the first QR code (main attendee)
        await DinnerReservation.findByIdAndUpdate(objectId, {
          $set: { 'qrCodes.0.qrCode': newQRCode }
        });
        break;
      case 'brochure':
        await ConventionBrochure.findByIdAndUpdate(objectId, { qrCode: newQRCode });
        break;
      default:
        throw new Error('Unsupported service type for QR code update');
    }
  }

  /**
   * Generate unique QR code data string
   */
  static generateUniqueQRData(type: string, id: string, additionalData?: any): string {
    // Generate the URL format for QR code scanning
    return `https://gosa.events/scan?id=${id}`;
  }

  /**
   * Parse QR code data
   */
  static parseQRCodeData(qrDataString: string): any {
    try {
      // Handle URL format: https://gosa.events/scan?id=xxxxxxxxxx
      if (qrDataString.startsWith('https://gosa.events/scan?id=')) {
        const url = new URL(qrDataString);
        const id = url.searchParams.get('id');
        return {
          id,
          url: qrDataString
        };
      }

      // Fallback to JSON parsing for backward compatibility
      return JSON.parse(qrDataString);
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  /**
   * Generate QR codes for all service types
   */
  static async generateServiceQRCodes(
    serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure',
    serviceData: any
  ): Promise<string[]> {
    try {
      const qrCodes: string[] = [];

      switch (serviceType) {
        case 'convention':
          const conventionData = this.generateUniqueQRData('convention', serviceData.id, {
            userId: serviceData.userId,
            name: serviceData.name,
            email: serviceData.email,
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          });
          qrCodes.push(await this.generateQRCode(conventionData));
          break;

        case 'dinner':
          // Generate QR code for each guest
          for (let i = 0; i < serviceData.numberOfGuests; i++) {
            const guestData = this.generateUniqueQRData('dinner', serviceData.id, {
              userId: serviceData.userId,
              guestIndex: i,
              guestName: serviceData.guestDetails[i]?.name || `Guest ${i + 1}`,
              validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
            qrCodes.push(await this.generateQRCode(guestData));
          }
          break;

        case 'brochure':
          if (serviceData.brochureType === 'physical') {
            const brochureData = this.generateUniqueQRData('brochure', serviceData.id, {
              userId: serviceData.userId,
              quantity: serviceData.quantity,
              brochureType: serviceData.brochureType,
              validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
            });
            qrCodes.push(await this.generateQRCode(brochureData));
          }
          break;

        case 'accommodation':
          // Accommodation uses confirmation codes, not QR codes
          break;
      }

      return qrCodes;
    } catch (error) {
      console.error('Error generating service QR codes:', error);
      throw new Error('Failed to generate QR codes');
    }
  }

  /**
   * Generate confirmation codes for services that don't use QR codes
   */
  static generateConfirmationCode(serviceType: string, serviceId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const typePrefix = serviceType.substring(0, 3).toUpperCase();

    return `${typePrefix}-${timestamp}-${random}`;
  }

  /**
   * Validate QR code and extract data
   */
  static validateAndParseQRCode(qrCodeData: string): {
    valid: boolean;
    data?: any;
    error?: string;
  } {
    try {
      const data = this.parseQRCodeData(qrCodeData);

      if (!data) {
        return { valid: false, error: 'Invalid QR code format' };
      }

      // For URL format, validate the ID exists
      if (data.url && data.id) {
        return { valid: true, data };
      }

      // For legacy JSON format, check expiration and required fields
      if (data.validUntil && new Date(data.validUntil) < new Date()) {
        return { valid: false, error: 'QR code has expired' };
      }

      // Validate required fields for legacy format
      if (!data.type || !data.id || !data.userId) {
        return { valid: false, error: 'QR code missing required data' };
      }

      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: 'Failed to parse QR code' };
    }
  }

  /**
   * Mark QR code as used
   */
  static async markQRCodeAsUsed(
    serviceType: 'convention' | 'dinner' | 'brochure',
    serviceId: string,
    qrCodeData?: string
  ): Promise<boolean> {
    try {
      const objectId = new Types.ObjectId(serviceId);

      switch (serviceType) {
        case 'convention':
          await ConventionRegistration.findByIdAndUpdate(objectId, {
            checkedIn: true,
            checkedInAt: new Date()
          });
          break;

        case 'dinner':
          if (qrCodeData) {
            const parsedData = this.parseQRCodeData(qrCodeData);
            if (parsedData && parsedData.guestIndex !== undefined) {
              await DinnerReservation.findByIdAndUpdate(objectId, {
                $set: { [`qrCodes.${parsedData.guestIndex}.used`]: true }
              });
            }
          }
          break;

        case 'brochure':
          await ConventionBrochure.findByIdAndUpdate(objectId, {
            collected: true,
            collectedAt: new Date()
          });
          break;
      }

      return true;
    } catch (error) {
      console.error('Error marking QR code as used:', error);
      return false;
    }
  }

  /**
   * Get QR code usage statistics
   */
  static async getQRCodeStats(): Promise<{
    totalGenerated: number;
    totalUsed: number;
    usageByType: Record<string, { generated: number; used: number }>;
  }> {
    try {
      const [conventionStats, dinnerStats, brochureStats] = await Promise.all([
        ConventionRegistration.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              used: { $sum: { $cond: ['$checkedIn', 1, 0] } }
            }
          }
        ]),
        DinnerReservation.aggregate([
          {
            $project: {
              totalQRCodes: { $size: '$qrCodes' },
              usedQRCodes: {
                $size: {
                  $filter: {
                    input: '$qrCodes',
                    cond: { $eq: ['$$this.used', true] }
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalQRCodes' },
              used: { $sum: '$usedQRCodes' }
            }
          }
        ]),
        ConventionBrochure.aggregate([
          {
            $match: { brochureType: 'physical' }
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              used: { $sum: { $cond: ['$collected', 1, 0] } }
            }
          }
        ])
      ]);

      const convention = conventionStats[0] || { total: 0, used: 0 };
      const dinner = dinnerStats[0] || { total: 0, used: 0 };
      const brochure = brochureStats[0] || { total: 0, used: 0 };

      return {
        totalGenerated: convention.total + dinner.total + brochure.total,
        totalUsed: convention.used + dinner.used + brochure.used,
        usageByType: {
          convention: { generated: convention.total, used: convention.used },
          dinner: { generated: dinner.total, used: dinner.used },
          brochure: { generated: brochure.total, used: brochure.used }
        }
      };
    } catch (error) {
      console.error('Error getting QR code stats:', error);
      throw new Error('Failed to retrieve QR code statistics');
    }
  }
}