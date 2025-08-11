import { IDinnerReservation } from '../schema/dinner.schema';
import { IAccommodation } from '../schema/accommodation.schema';
import { IConventionBrochure } from '../schema/brochure.schema';
import { IGoodwillMessage } from '../schema/goodwill.schema';
import { IDonation } from '../schema/donation.schema';

export interface NotificationTemplate {
  message: string;
  qrCodes?: string[];
  confirmationCode?: string;
  receiptNumber?: string;
}

export class NotificationService {
  private static readonly WASENDER_API_URL = process.env.WASENDER_API_URL || 'https://api.wasender.com';
  private static readonly WASENDER_API_KEY = process.env.WASENDER_API_KEY || '';

  /**
   * Send dinner confirmation notification
   */
  static async sendDinnerConfirmation(reservation: IDinnerReservation): Promise<void> {
    try {
      const template = this.createDinnerTemplate(reservation);
      await this.sendWhatsAppMessage(reservation.userId, template);
    } catch (error) {
      console.error('Error sending dinner confirmation:', error);
      throw new Error('Failed to send dinner confirmation notification');
    }
  }

  /**
   * Send accommodation confirmation notification
   */
  static async sendAccommodationConfirmation(booking: IAccommodation): Promise<void> {
    try {
      const template = this.createAccommodationTemplate(booking);
      await this.sendWhatsAppMessage(booking.userId, template);
    } catch (error) {
      console.error('Error sending accommodation confirmation:', error);
      throw new Error('Failed to send accommodation confirmation notification');
    }
  }

  /**
   * Send brochure confirmation notification
   */
  static async sendBrochureConfirmation(order: IConventionBrochure): Promise<void> {
    try {
      const template = this.createBrochureTemplate(order);
      await this.sendWhatsAppMessage(order.userId, template);
    } catch (error) {
      console.error('Error sending brochure confirmation:', error);
      throw new Error('Failed to send brochure confirmation notification');
    }
  }

  /**
   * Send goodwill message confirmation notification
   */
  static async sendGoodwillConfirmation(message: IGoodwillMessage): Promise<void> {
    try {
      const template = this.createGoodwillTemplate(message);
      await this.sendWhatsAppMessage(message.userId, template);
    } catch (error) {
      console.error('Error sending goodwill confirmation:', error);
      throw new Error('Failed to send goodwill confirmation notification');
    }
  }

  /**
   * Send donation thank you notification
   */
  static async sendDonationThankYou(donation: IDonation): Promise<void> {
    try {
      const template = this.createDonationTemplate(donation);
      await this.sendWhatsAppMessage(donation.userId, template);
    } catch (error) {
      console.error('Error sending donation thank you:', error);
      throw new Error('Failed to send donation thank you notification');
    }
  }

  /**
   * Send goodwill message approval notification
   */
  static async sendGoodwillApprovalNotification(message: IGoodwillMessage): Promise<void> {
    try {
      const template = this.createGoodwillApprovalTemplate(message);
      await this.sendWhatsAppMessage(message.userId, template);
    } catch (error) {
      console.error('Error sending goodwill approval notification:', error);
      throw new Error('Failed to send goodwill approval notification');
    }
  }

  // Private template creation methods
  private static createDinnerTemplate(reservation: IDinnerReservation): NotificationTemplate {
    const qrCodes = reservation.qrCodes?.map(qr => qr.qrCode).filter((code): code is string => !!code) || [];

    return {
      message: `🍽️ *Dinner Reservation Confirmed!*

Thank you for your dinner reservation payment of $${reservation.totalAmount}.

*Reservation Details:*
• Number of guests: ${reservation.numberOfGuests}
• Total amount: $${reservation.totalAmount}
• Date: Saturday, August 12th
• Time: 7:00 PM - 10:00 PM
• Venue: Grand Ballroom, Metropolitan Hotel

*QR Codes:*
${reservation.qrCodes?.map((qr, index) => `Guest ${index + 1} (${qr.guestName}): Please save your QR code for entry`).join('\n') || ''}

${reservation.specialRequests ? `*Special Requests:* ${reservation.specialRequests}` : ''}

Please present your QR code(s) at the venue entrance. See you there! 🎉`,
      qrCodes
    };
  }

  private static createAccommodationTemplate(booking: IAccommodation): NotificationTemplate {
    return {
      message: `🏨 *Accommodation Booking Confirmed!*

Thank you for your accommodation booking payment of $${booking.totalAmount}.

*Booking Details:*
• Room type: ${booking.accommodationType.charAt(0).toUpperCase() + booking.accommodationType.slice(1)}
• Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}
• Check-out: ${new Date(booking.checkOutDate).toLocaleDateString()}
• Number of guests: ${booking.numberOfGuests}
• Total amount: $${booking.totalAmount}

*Confirmation Code:* ${booking.confirmationCode}

${booking.specialRequests ? `*Special Requests:* ${booking.specialRequests}` : ''}

Please present your confirmation code at hotel check-in. Have a comfortable stay! 🛏️`,
      confirmationCode: booking.confirmationCode
    };
  }

  private static createBrochureTemplate(order: IConventionBrochure): NotificationTemplate {
    const qrCodes = order.qrCode ? [order.qrCode] : [];

    return {
      message: `📚 *Brochure Order Confirmed!*

Thank you for your brochure order payment of $${order.totalAmount}.

*Order Details:*
• Type: ${order.brochureType === 'digital' ? 'Digital Download' : 'Physical Pickup'}
• Quantity: ${order.quantity}
• Total amount: $${order.totalAmount}

${order.brochureType === 'digital'
          ? '*Digital Access:* Your brochure download link will be sent to your email shortly.'
          : `*Pickup Instructions:* Please present the QR code below at the convention registration desk to collect your brochure(s).`
        }

${order.brochureType === 'physical' ? 'Your pickup QR code is attached to this message.' : ''}

Thank you for your purchase! 📖`,
      qrCodes: order.brochureType === 'physical' ? qrCodes : undefined
    };
  }

  private static createGoodwillTemplate(message: IGoodwillMessage): NotificationTemplate {
    return {
      message: `💝 *Goodwill Message Submitted!*

Thank you for your generous donation of $${message.donationAmount} and your heartfelt message.

*Submission Details:*
• Donation amount: $${message.donationAmount}
• Attribution: ${message.anonymous ? 'Anonymous' : message.attributionName || 'Your Name'}
• Message: "${message.message}"

Your message is currently under review and will be displayed once approved by our team.

Thank you for spreading positivity and supporting our mission! ❤️`,
    };
  }

  private static createDonationTemplate(donation: IDonation): NotificationTemplate {
    return {
      message: `🙏 *Thank You for Your Donation!*

Your generous donation of $${donation.amount} has been received and confirmed.

*Donation Details:*
• Amount: $${donation.amount}
• Receipt Number: ${donation.receiptNumber}
• Attribution: ${donation.anonymous ? 'Anonymous' : donation.donorName || 'Your Name'}
${donation.onBehalfOf ? `• On behalf of: ${donation.onBehalfOf}` : ''}

Your contribution makes a real difference in our community and helps us continue our important work.

Thank you for your generosity! 💚`,
      receiptNumber: donation.receiptNumber
    };
  }

  private static createGoodwillApprovalTemplate(message: IGoodwillMessage): NotificationTemplate {
    return {
      message: `✅ *Your Goodwill Message Has Been Approved!*

Great news! Your goodwill message has been reviewed and approved for display.

*Message Details:*
• Your message: "${message.message}"
• Attribution: ${message.anonymous ? 'Anonymous' : message.attributionName || 'Your Name'}
• Donation: $${message.donationAmount}

Your message is now live and spreading positivity in our community. Thank you for your contribution! 🌟`,
    };
  }

  /**
   * Send WhatsApp message via WASender API
   */
  private static async sendWhatsAppMessage(userId: any, template: NotificationTemplate): Promise<void> {
    try {
      // In a real implementation, you would:
      // 1. Get user's phone number from userId
      // 2. Format the message properly
      // 3. Send via WASender API
      // 4. Handle QR codes and attachments

      const payload = {
        phone: '+1234567890', // This would be fetched from user data
        message: template.message,
        attachments: template.qrCodes || []
      };

      // Mock API call - replace with actual WASender integration
      console.log('Sending WhatsApp notification:', payload);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('WhatsApp API error:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(notifications: Array<{
    userId: any;
    template: NotificationTemplate;
  }>): Promise<void> {
    try {
      await Promise.all(
        notifications.map(({ userId, template }) =>
          this.sendWhatsAppMessage(userId, template)
        )
      );
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw new Error('Failed to send bulk notifications');
    }
  }

  /**
   * Get notification delivery status
   */
  static async getDeliveryStatus(messageId: string): Promise<{
    status: 'pending' | 'delivered' | 'failed';
    timestamp: Date;
  }> {
    // Mock implementation - replace with actual WASender API call
    return {
      status: 'delivered',
      timestamp: new Date()
    };
  }
}