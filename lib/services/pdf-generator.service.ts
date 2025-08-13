import * as QRCode from 'qrcode';
import { PDFCacheService } from './pdf-cache.service';
import { PDFLoggerService } from './pdf-logger.service';

export interface PDFData {
  userDetails: {
    name: string;
    email: string;
    phone: string;
    registrationId?: string;
  };
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

export interface PDFTemplate {
  title: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export class PDFGeneratorService {
  private static readonly DEFAULT_TEMPLATE: PDFTemplate = {
    title: 'GOSA 2025 Convention',
    subtitle: 'For Light and Truth',
    primaryColor: '#16A34A',
    secondaryColor: '#F59E0B',
    logoUrl: '/images/gosa.png'
  };

  /**
   * Generate PDF as HTML string with caching (can be converted to PDF using puppeteer or similar)
   */
  static async generatePDFHTML(data: PDFData): Promise<string> {
    const startTime = Date.now();

    try {
      // Log generation start
      PDFLoggerService.logGenerationStart(
        data.operationDetails.paymentReference,
        data.operationDetails.type,
        data.userDetails.registrationId
      );

      // Generate cache key
      const cacheKey = PDFCacheService.generateCacheKey(data);

      // Try to get from cache first
      const cachedHTML = await PDFCacheService.getCachedHTML(cacheKey);
      if (cachedHTML) {
        const duration = Date.now() - startTime;
        PDFLoggerService.logGenerationSuccess(
          data.operationDetails.paymentReference,
          data.operationDetails.type,
          duration,
          data.userDetails.registrationId
        );
        console.log('PDF HTML served from cache:', cacheKey.substring(0, 8));
        return cachedHTML;
      }

      console.log('Generating new PDF HTML:', cacheKey.substring(0, 8));

      // Check for cached QR code first
      let qrCodeDataURL = await PDFCacheService.getCachedQRCode(data.qrCodeData);

      if (!qrCodeDataURL) {
        // Generate QR code as data URL
        qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
          width: 200,
          margin: 2,
          color: {
            dark: this.DEFAULT_TEMPLATE.primaryColor,
            light: '#FFFFFF'
          }
        });

        // Cache the QR code for future use
        await PDFCacheService.cacheQRCode(data.qrCodeData, qrCodeDataURL);
      }

      const template = this.DEFAULT_TEMPLATE;
      const { userDetails, operationDetails } = data;

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${template.title} - ${this.getOperationTypeTitle(operationDetails.type)}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              background: linear-gradient(135deg, ${template.primaryColor}10 0%, ${template.secondaryColor}10 100%);
            }
            
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              min-height: 100vh;
              position: relative;
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, ${template.primaryColor} 0%, ${template.secondaryColor} 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
              position: relative;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
              opacity: 0.3;
            }
            
            .logo-section {
              margin-bottom: 20px;
              position: relative;
              z-index: 1;
            }
            
            .logo-placeholder {
              width: 80px;
              height: 80px;
              background: white;
              border-radius: 50%;
              margin: 0 auto 15px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              color: ${template.primaryColor};
              font-weight: bold;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            
            .logo-image {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              object-fit: cover;
              margin: 0 auto 15px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            
            .title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 8px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              position: relative;
              z-index: 1;
            }
            
            .subtitle {
              font-size: 18px;
              opacity: 0.9;
              font-style: italic;
              position: relative;
              z-index: 1;
            }
            
            .content {
              padding: 40px 30px;
            }
            
            .section {
              margin-bottom: 35px;
              background: #f8f9fa;
              border-radius: 12px;
              padding: 25px;
              border-left: 5px solid ${template.primaryColor};
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            
            .section-title {
              font-size: 20px;
              font-weight: bold;
              color: ${template.primaryColor};
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            }
            
            .section-title::before {
              content: '';
              width: 4px;
              height: 20px;
              background: ${template.secondaryColor};
              margin-right: 10px;
              border-radius: 2px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            
            .info-item {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .info-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
              font-weight: 600;
            }
            
            .info-value {
              font-size: 16px;
              font-weight: 600;
              color: #1f2937;
            }
            
            .amount {
              color: ${template.primaryColor};
              font-size: 24px;
              font-weight: bold;
            }
            
            .status {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .status.confirmed {
              background: #dcfce7;
              color: #166534;
            }
            
            .status.pending {
              background: #fef3c7;
              color: #92400e;
            }
            
            .qr-section {
              text-align: center;
              background: white;
              border: 2px dashed ${template.primaryColor};
              border-radius: 12px;
              padding: 30px;
              margin: 20px 0;
            }
            
            .qr-code {
              margin: 20px auto;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .qr-instructions {
              font-size: 14px;
              color: #6b7280;
              margin-top: 15px;
              line-height: 1.5;
            }
            
            .footer {
              background: #f3f4f6;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              margin-top: 40px;
            }
            
            .footer-text {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            
            .contact-info {
              font-size: 12px;
              color: #9ca3af;
            }
            
            .decorative-border {
              height: 4px;
              background: linear-gradient(90deg, ${template.primaryColor} 0%, ${template.secondaryColor} 50%, ${template.primaryColor} 100%);
              margin: 20px 0;
            }
            
            @media print {
              body {
                background: white;
              }
              .container {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-section">
                <img src="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${template.logoUrl}" alt="GOSA Logo" class="logo-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="logo-placeholder" style="display: none;">GOSA</div>
              </div>
              <h1 class="title">${template.title}</h1>
              <p class="subtitle">${template.subtitle}</p>
            </div>
            
            <div class="content">
              <div class="section">
                <h2 class="section-title">Personal Information</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">${userDetails.name}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Email Address</div>
                    <div class="info-value">${userDetails.email}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Phone Number</div>
                    <div class="info-value">${userDetails.phone}</div>
                  </div>
                  ${userDetails.registrationId ? `
                  <div class="info-item">
                    <div class="info-label">Registration ID</div>
                    <div class="info-value">${userDetails.registrationId}</div>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="section">
                <h2 class="section-title">${this.getOperationTypeTitle(operationDetails.type)} Details</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Service Type</div>
                    <div class="info-value">${this.getOperationTypeTitle(operationDetails.type)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Amount</div>
                    <div class="info-value amount">₦${operationDetails.amount.toLocaleString()}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Payment Reference</div>
                    <div class="info-value">${operationDetails.paymentReference}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Date</div>
                    <div class="info-value">${operationDetails.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</div>
                  </div>
                </div>
                
                <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
                  <div class="info-label">Status</div>
                  <div class="info-value">
                    <span class="status ${operationDetails.status}">${operationDetails.status.toUpperCase()}</span>
                  </div>
                </div>
                
                <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
                  <div class="info-label">Description</div>
                  <div class="info-value">${operationDetails.description}</div>
                  ${operationDetails.additionalInfo ? `
                    <div style="margin-top: 10px; font-size: 14px; color: #6b7280;">
                      ${operationDetails.additionalInfo}
                    </div>
                  ` : ''}
                </div>
              </div>
              
              ${this.formatServiceSpecificContent(operationDetails)}
              
              <div class="section">
                <h2 class="section-title">QR Code</h2>
                <div class="qr-section">
                  <p style="font-weight: 600; color: ${template.primaryColor}; margin-bottom: 10px;">
                    Your Digital Pass
                  </p>
                  <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" />
                  <div class="qr-instructions">
                    <strong>Instructions:</strong><br>
                    • Present this QR code at the convention entrance<br>
                    • Keep this document safe for your records<br>
                    • Contact support if you have any issues<br>
                    • This QR code is unique to your registration
                  </div>
                </div>
              </div>
              
              <div class="decorative-border"></div>
            </div>
            
            <div class="footer">
              <div class="footer-text">
                <strong>GOSA 2025 Convention - For Light and Truth</strong>
              </div>
              <div class="contact-info">
                For support, contact us at support@gosa.org | www.gosa.org<br>
                Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Cache the generated HTML
      await PDFCacheService.cacheHTML(cacheKey, html);

      // Log successful generation
      const duration = Date.now() - startTime;
      PDFLoggerService.logGenerationSuccess(
        data.operationDetails.paymentReference,
        data.operationDetails.type,
        duration,
        data.userDetails.registrationId
      );

      return html;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log generation error
      PDFLoggerService.logGenerationError(
        data.operationDetails.paymentReference,
        data.operationDetails.type,
        errorMessage,
        duration,
        data.userDetails.registrationId
      );

      console.error('Error generating PDF HTML:', error);
      throw new Error('Failed to generate PDF content');
    }
  }

  /**
   * Get operation type display title
   */
  private static getOperationTypeTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'convention': 'Convention Registration',
      'dinner': 'Dinner Reservation',
      'accommodation': 'Accommodation Booking',
      'brochure': 'Brochure Purchase',
      'goodwill': 'Goodwill Message',
      'donation': 'Donation'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Generate PDF buffer using HTML (requires puppeteer or similar)
   * For now, returns the HTML string that can be converted to PDF
   */
  static async generatePDF(data: PDFData): Promise<string> {
    return await this.generatePDFHTML(data);
  }

  /**
   * Create PDF data from registration/operation details
   */
  static createPDFData(
    userDetails: PDFData['userDetails'],
    operationDetails: PDFData['operationDetails'],
    qrCodeData: string
  ): PDFData {
    return {
      userDetails,
      operationDetails,
      qrCodeData
    };
  }

  /**
   * Generate filename for PDF
   */
  static generateFilename(userDetails: PDFData['userDetails'], operationType: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = userDetails.name.replace(/[^a-zA-Z0-9]/g, '_');
    return `GOSA_2025_${operationType}_${sanitizedName}_${timestamp}.pdf`;
  }

  /**
   * Format service-specific content based on operation type
   */
  private static formatServiceSpecificContent(operationDetails: PDFData['operationDetails']): string {
    switch (operationDetails.type) {
      case 'convention':
        return this.formatConventionContent(operationDetails);
      case 'dinner':
        return this.formatDinnerContent(operationDetails);
      case 'accommodation':
        return this.formatAccommodationContent(operationDetails);
      case 'brochure':
        return this.formatBrochureContent(operationDetails);
      case 'goodwill':
        return this.formatGoodwillContent(operationDetails);
      case 'donation':
        return this.formatDonationContent(operationDetails);
      default:
        return '';
    }
  }

  /**
   * Format convention registration specific content
   */
  private static formatConventionContent(operationDetails: PDFData['operationDetails']): string {
    const template = this.DEFAULT_TEMPLATE;
    const additionalInfo = this.parseConventionAdditionalInfo(operationDetails.additionalInfo);

    return `
      <div class="section">
        <h2 class="section-title">Convention Registration Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Registration Type</div>
            <div class="info-value">Full Convention Access</div>
          </div>
          <div class="info-item">
            <div class="info-label">Convention Dates</div>
            <div class="info-value">December 26-29, 2025</div>
          </div>
          <div class="info-item">
            <div class="info-label">Venue</div>
            <div class="info-value">GOSA Convention Center</div>
          </div>
          <div class="info-item">
            <div class="info-label">Check-in Time</div>
            <div class="info-value">8:00 AM - 10:00 AM Daily</div>
          </div>
          ${additionalInfo.quantity > 1 ? `
          <div class="info-item">
            <div class="info-label">Total Attendees</div>
            <div class="info-value">${additionalInfo.quantity} person(s)</div>
          </div>
          ` : ''}
          ${additionalInfo.accommodationType ? `
          <div class="info-item">
            <div class="info-label">Accommodation</div>
            <div class="info-value">${additionalInfo.accommodationType.charAt(0).toUpperCase() + additionalInfo.accommodationType.slice(1)} Room</div>
          </div>
          ` : ''}
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">What's Included</div>
          <div class="info-value">
            • Access to all convention sessions and workshops<br>
            • Welcome package and convention materials<br>
            • Networking opportunities with fellow attendees<br>
            • Access to exhibition hall and vendor booths<br>
            • Digital copy of convention proceedings<br>
            • Welcome reception and refreshments<br>
            • Certificate of attendance
          </div>
        </div>
        
        ${additionalInfo.additionalPersons && additionalInfo.additionalPersons.length > 0 ? `
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Additional Attendees</div>
          <div class="info-value">
            ${additionalInfo.additionalPersons.map((person: any, index: number) => `
              <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 3px solid ${template.primaryColor};">
                <strong>Person ${index + 2}:</strong> ${person.name || 'Name not provided'}<br>
                <small style="color: #6b7280;">Email: ${person.email || 'Not provided'} | Phone: ${person.phone || 'Not provided'}</small>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px; background: #dcfce7; border-left: 5px solid ${template.primaryColor};">
          <div class="info-label" style="color: #166534;">Convention Schedule Highlights</div>
          <div class="info-value" style="color: #166534;">
            <strong>Day 1 (Dec 26):</strong> Registration, Welcome Ceremony, Opening Sessions<br>
            <strong>Day 2 (Dec 27):</strong> Workshops, Panel Discussions, Cultural Activities<br>
            <strong>Day 3 (Dec 28):</strong> Main Sessions, Gala Dinner, Awards Ceremony<br>
            <strong>Day 4 (Dec 29):</strong> Final Sessions, Closing Ceremony, Networking
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format dinner reservation specific content
   */
  private static formatDinnerContent(operationDetails: PDFData['operationDetails']): string {
    const template = this.DEFAULT_TEMPLATE;
    const dinnerInfo = this.parseDinnerAdditionalInfo(operationDetails.additionalInfo);

    return `
      <div class="section">
        <h2 class="section-title">Dinner Reservation Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Event</div>
            <div class="info-value">GOSA 2025 Convention Gala Dinner</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date & Time</div>
            <div class="info-value">December 28, 2025 at 7:00 PM</div>
          </div>
          <div class="info-item">
            <div class="info-label">Venue</div>
            <div class="info-value">Grand Ballroom, GOSA Convention Center</div>
          </div>
          <div class="info-item">
            <div class="info-label">Dress Code</div>
            <div class="info-value">Formal/Black Tie</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Guests</div>
            <div class="info-value">${dinnerInfo.numberOfGuests} person(s)</div>
          </div>
          <div class="info-item">
            <div class="info-label">Table Assignment</div>
            <div class="info-value">Will be provided at check-in</div>
          </div>
        </div>
        
        ${dinnerInfo.guestDetails && dinnerInfo.guestDetails.length > 0 ? `
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Guest Information</div>
          <div class="info-value">
            ${dinnerInfo.guestDetails.map((guest: any, index: number) => `
              <div style="margin-bottom: 10px; padding: 12px; background: white; border-radius: 6px; border-left: 3px solid ${template.primaryColor};">
                <strong>Guest ${index + 1}:</strong> ${guest.name || 'Name not provided'}<br>
                <small style="color: #6b7280;">
                  ${guest.email ? `Email: ${guest.email}` : ''} 
                  ${guest.phone ? `| Phone: ${guest.phone}` : ''}
                  ${guest.dietaryRestrictions ? `| Dietary: ${guest.dietaryRestrictions}` : ''}
                </small>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Evening Program</div>
          <div class="info-value">
            <strong>6:30 PM:</strong> Cocktail reception and networking<br>
            <strong>7:00 PM:</strong> Welcome remarks and dinner service begins<br>
            <strong>8:30 PM:</strong> Cultural performances and entertainment<br>
            <strong>9:00 PM:</strong> Awards ceremony and recognition<br>
            <strong>9:30 PM:</strong> Dancing and continued networking<br>
            <strong>11:00 PM:</strong> Event conclusion
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Dinner Menu</div>
          <div class="info-value">
            <strong>Appetizer:</strong> Pan-seared scallops with cauliflower purée<br>
            <strong>Main Course:</strong> Choice of herb-crusted salmon or beef tenderloin<br>
            <strong>Dessert:</strong> Chocolate lava cake with vanilla ice cream<br>
            <strong>Beverages:</strong> Wine pairings, soft drinks, coffee, and tea<br>
            <em style="color: #6b7280;">Vegetarian and dietary restriction options available</em>
          </div>
        </div>
        
        ${dinnerInfo.specialRequests ? `
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Special Requests</div>
          <div class="info-value" style="color: ${template.primaryColor};">
            ${dinnerInfo.specialRequests}
          </div>
        </div>
        ` : ''}
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px; background: #fef3c7; border-left: 5px solid ${template.secondaryColor};">
          <div class="info-label" style="color: #92400e;">Important Notes</div>
          <div class="info-value" style="color: #92400e;">
            • Arrive by 6:30 PM for cocktail reception<br>
            • Each guest needs their individual QR code for entry<br>
            • Photography will be taking place during the event<br>
            • Parking is available at the convention center<br>
            • Contact event coordinator for any last-minute changes
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format accommodation booking specific content
   */
  private static formatAccommodationContent(operationDetails: PDFData['operationDetails']): string {
    const template = this.DEFAULT_TEMPLATE;
    const accommodationInfo = this.parseAccommodationAdditionalInfo(operationDetails.additionalInfo);

    return `
      <div class="section">
        <h2 class="section-title">Accommodation Booking Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Hotel</div>
            <div class="info-value">GOSA Convention Hotel</div>
          </div>
          <div class="info-item">
            <div class="info-label">Room Type</div>
            <div class="info-value">${accommodationInfo.accommodationType.charAt(0).toUpperCase() + accommodationInfo.accommodationType.slice(1)} Room</div>
          </div>
          <div class="info-item">
            <div class="info-label">Check-in Date</div>
            <div class="info-value">${accommodationInfo.checkInDate} (3:00 PM)</div>
          </div>
          <div class="info-item">
            <div class="info-label">Check-out Date</div>
            <div class="info-value">${accommodationInfo.checkOutDate} (11:00 AM)</div>
          </div>
          <div class="info-item">
            <div class="info-label">Number of Guests</div>
            <div class="info-value">${accommodationInfo.numberOfGuests} person(s)</div>
          </div>
          <div class="info-item">
            <div class="info-label">Confirmation Code</div>
            <div class="info-value">${accommodationInfo.confirmationCode}</div>
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Room Features & Amenities</div>
          <div class="info-value">
            ${this.getRoomFeatures(accommodationInfo.accommodationType)}
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Hotel Amenities Included</div>
          <div class="info-value">
            • Daily housekeeping service<br>
            • Complimentary Wi-Fi access<br>
            • Access to hotel facilities (gym, pool, spa)<br>
            • 24/7 room service<br>
            • Concierge services<br>
            • Shuttle service to convention center<br>
            • Complimentary breakfast (Premium & Luxury rooms)<br>
            • Laundry and dry cleaning services
          </div>
        </div>
        
        ${accommodationInfo.specialRequests ? `
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Special Requests</div>
          <div class="info-value" style="color: ${template.primaryColor};">
            ${accommodationInfo.specialRequests}
          </div>
        </div>
        ` : ''}
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px; background: #dcfce7; border-left: 5px solid ${template.primaryColor};">
          <div class="info-label" style="color: #166534;">Check-in Instructions</div>
          <div class="info-value" style="color: #166534;">
            • Present this confirmation and a valid ID at hotel reception<br>
            • Check-in time: 3:00 PM (early check-in available upon request)<br>
            • Check-out time: 11:00 AM (late check-out may be available)<br>
            • Hotel address: GOSA Convention Hotel, Convention District<br>
            • Contact: +234-XXX-XXXX for any special arrangements
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format brochure order specific content
   */
  private static formatBrochureContent(operationDetails: PDFData['operationDetails']): string {
    const template = this.DEFAULT_TEMPLATE;
    const brochureInfo = this.parseBrochureAdditionalInfo(operationDetails.additionalInfo);

    return `
      <div class="section">
        <h2 class="section-title">Brochure Order Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Publication</div>
            <div class="info-value">GOSA 2025 Convention Brochure</div>
          </div>
          <div class="info-item">
            <div class="info-label">Format</div>
            <div class="info-value">${brochureInfo.brochureType.charAt(0).toUpperCase() + brochureInfo.brochureType.slice(1)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Quantity</div>
            <div class="info-value">${brochureInfo.quantity} copies</div>
          </div>
          <div class="info-item">
            <div class="info-label">Delivery Method</div>
            <div class="info-value">${brochureInfo.deliveryMethod.charAt(0).toUpperCase() + brochureInfo.deliveryMethod.slice(1)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Order Status</div>
            <div class="info-value">
              <span class="status ${operationDetails.status}">${operationDetails.status.toUpperCase()}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Processing Time</div>
            <div class="info-value">${brochureInfo.brochureType === 'digital' ? 'Within 24 hours' : '2-3 business days'}</div>
          </div>
        </div>
        
        ${brochureInfo.recipientDetails && brochureInfo.recipientDetails.length > 0 ? `
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Recipient Information</div>
          <div class="info-value">
            ${brochureInfo.recipientDetails.map((recipient: any, index: number) => `
              <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid ${template.primaryColor};">
                <strong>Recipient ${index + 1}:</strong> ${recipient.name}<br>
                <small style="color: #6b7280;">Email: ${recipient.email}</small>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Brochure Contents (120+ pages)</div>
          <div class="info-value">
            <strong>Section 1:</strong> Welcome & Convention Overview<br>
            <strong>Section 2:</strong> Complete program schedule and session details<br>
            <strong>Section 3:</strong> Keynote speakers and presenter profiles<br>
            <strong>Section 4:</strong> Workshop descriptions and learning objectives<br>
            <strong>Section 5:</strong> Venue maps and facility information<br>
            <strong>Section 6:</strong> Local area guide and dining recommendations<br>
            <strong>Section 7:</strong> GOSA history and organizational structure<br>
            <strong>Section 8:</strong> Member directory and networking guide<br>
            <strong>Section 9:</strong> Sponsor recognition and advertisements<br>
            <strong>Section 10:</strong> Contact information and resources
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Additional Features</div>
          <div class="info-value">
            • High-quality full-color printing (physical copies)<br>
            • Interactive links and bookmarks (digital copies)<br>
            • QR codes for quick access to online resources<br>
            • Tear-out maps and quick reference guides<br>
            • Note-taking sections for each session<br>
            • Convention evaluation forms<br>
            • Post-convention resource links
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px; background: #fef3c7; border-left: 5px solid ${template.secondaryColor};">
          <div class="info-label" style="color: #92400e;">${brochureInfo.brochureType === 'digital' ? 'Digital Delivery' : 'Pickup Instructions'}</div>
          <div class="info-value" style="color: #92400e;">
            ${this.getBrochureDeliveryInstructions(operationDetails.additionalInfo)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format goodwill message specific content
   */
  private static formatGoodwillContent(operationDetails: PDFData['operationDetails']): string {
    const template = this.DEFAULT_TEMPLATE;
    return `
      <div class="section">
        <h2 class="section-title">Goodwill Message & Donation</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Message Type</div>
            <div class="info-value">Convention Goodwill Message</div>
          </div>
          <div class="info-item">
            <div class="info-label">Donation Amount</div>
            <div class="info-value amount">₦${operationDetails.amount.toLocaleString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Attribution</div>
            <div class="info-value">${this.getAttributionFromAdditionalInfo(operationDetails.additionalInfo)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status ${operationDetails.status}">${operationDetails.status.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Your Message</div>
          <div class="info-value" style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-style: italic; border-left: 4px solid ${template.primaryColor};">
            "${this.extractMessageFromAdditionalInfo(operationDetails.additionalInfo)}"
          </div>
        </div>
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Impact of Your Contribution</div>
          <div class="info-value">
            • Supports convention programming and activities<br>
            • Helps provide scholarships for attendees in need<br>
            • Contributes to GOSA's community outreach programs<br>
            • Enables enhanced convention experiences for all<br>
            • Supports the organization's mission of "Light and Truth"
          </div>
        </div>
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px; background: #dcfce7; border-left: 5px solid ${template.primaryColor};">
          <div class="info-label" style="color: #166534;">Thank You</div>
          <div class="info-value" style="color: #166534;">
            Your goodwill message and generous donation help make the GOSA 2025 Convention a memorable experience for all attendees. Your message will be reviewed and may be featured in convention materials.
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format donation specific content
   */
  private static formatDonationContent(operationDetails: PDFData['operationDetails']): string {
    const template = this.DEFAULT_TEMPLATE;
    const donationInfo = this.parseDonationAdditionalInfo(operationDetails.additionalInfo);

    return `
      <div class="section">
        <h2 class="section-title">Official Donation Receipt</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Donation Type</div>
            <div class="info-value">General Convention Support</div>
          </div>
          <div class="info-item">
            <div class="info-label">Amount</div>
            <div class="info-value amount">₦${operationDetails.amount.toLocaleString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Receipt Number</div>
            <div class="info-value">${this.generateReceiptNumber(operationDetails.paymentReference)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tax Year</div>
            <div class="info-value">${new Date().getFullYear()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Donor Attribution</div>
            <div class="info-value">${donationInfo.anonymous ? 'Anonymous' : donationInfo.donorName || 'Named Donor'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tax Deductible</div>
            <div class="info-value">Yes (where applicable by law)</div>
          </div>
        </div>
        
        ${donationInfo.onBehalfOf ? `
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Donation Made On Behalf Of</div>
          <div class="info-value" style="color: ${template.primaryColor};">
            ${donationInfo.onBehalfOf}
          </div>
        </div>
        ` : ''}
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">How Your Donation Helps</div>
          <div class="info-value">
            Your generous contribution of ₦${operationDetails.amount.toLocaleString()} directly supports GOSA's mission and helps fund:
            <br><br>
            <strong>Educational Initiatives (40%):</strong><br>
            • Workshops and professional development programs<br>
            • Educational scholarships and grants<br>
            • Research and publication projects<br><br>
            
            <strong>Community Outreach (30%):</strong><br>
            • Community service projects<br>
            • Youth mentorship programs<br>
            • Cultural preservation activities<br><br>
            
            <strong>Convention & Events (20%):</strong><br>
            • Annual convention organization<br>
            • Regional meetings and gatherings<br>
            • Special events and celebrations<br><br>
            
            <strong>Organizational Operations (10%):</strong><br>
            • Administrative support<br>
            • Technology and communication systems<br>
            • Facility maintenance and improvements
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
          <div class="info-label">Tax Information</div>
          <div class="info-value">
            <strong>Organization Details:</strong><br>
            • GOSA (Graduate Organization of Student Affairs)<br>
            • Tax-Exempt Status: 501(c)(3) equivalent (where applicable)<br>
            • Tax ID: XX-XXXXXXX<br>
            • No goods or services were provided in exchange for this donation<br><br>
            
            <strong>Important Notes:</strong><br>
            • This receipt is valid for tax deduction purposes where applicable by law<br>
            • Consult your tax advisor for specific deduction eligibility<br>
            • Keep this receipt with your tax records<br>
            • Contact our finance department for any questions or corrections
          </div>
        </div>
        
        <div class="info-item" style="grid-column: 1 / -1; margin-top: 15px; background: #dcfce7; border-left: 5px solid ${template.primaryColor};">
          <div class="info-label" style="color: #166534;">Thank You & Official Acknowledgment</div>
          <div class="info-value" style="color: #166534;">
            On behalf of GOSA and all the lives you've touched through your generosity, thank you for your donation of ₦${operationDetails.amount.toLocaleString()}. This official receipt confirms your contribution and serves as documentation for tax purposes. Your support makes our mission of "Light and Truth" possible.
            <br><br>
            <strong>Contact Information:</strong><br>
            Finance Department: finance@gosa.org<br>
            Phone: +234-XXX-XXXX<br>
            Address: GOSA Headquarters, Convention District
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Helper method to get accommodation type title
   */
  private static getAccommodationTypeTitle(additionalInfo?: string): string {
    if (!additionalInfo) return 'Standard Room';

    if (additionalInfo.toLowerCase().includes('premium')) return 'Premium Room';
    if (additionalInfo.toLowerCase().includes('luxury')) return 'Luxury Suite';
    return 'Standard Room';
  }

  /**
   * Helper method to get brochure type title
   */
  private static getBrochureTypeTitle(additionalInfo?: string): string {
    if (!additionalInfo) return 'Digital Brochure';

    if (additionalInfo.toLowerCase().includes('physical')) return 'Physical Brochure';
    return 'Digital Brochure';
  }

  /**
   * Helper method to extract quantity from additional info
   */
  private static extractQuantityFromAdditionalInfo(additionalInfo?: string): string {
    if (!additionalInfo) return '1';

    const quantityMatch = additionalInfo.match(/quantity:\s*(\d+)/i);
    return quantityMatch ? quantityMatch[1] : '1';
  }

  /**
   * Helper method to get brochure delivery instructions
   */
  private static getBrochureDeliveryInstructions(additionalInfo?: string): string {
    if (!additionalInfo) return 'Digital brochure will be sent to your email address.';

    if (additionalInfo.toLowerCase().includes('physical')) {
      return 'Physical brochures can be collected at the convention registration desk. Present this confirmation for pickup.';
    }
    return 'Digital brochure will be sent to your email address within 24 hours.';
  }

  /**
   * Helper method to get attribution from additional info
   */
  private static getAttributionFromAdditionalInfo(additionalInfo?: string): string {
    if (!additionalInfo) return 'Anonymous';

    const attributionMatch = additionalInfo.match(/attribution:\s*([^|]+)/i);
    if (attributionMatch) {
      return attributionMatch[1].trim();
    }

    if (additionalInfo.toLowerCase().includes('anonymous')) return 'Anonymous';
    return 'As provided';
  }

  /**
   * Helper method to extract message from additional info
   */
  private static extractMessageFromAdditionalInfo(additionalInfo?: string): string {
    if (!additionalInfo) return 'Thank you for your support of GOSA 2025 Convention.';

    const messageMatch = additionalInfo.match(/message:\s*([^|]+)/i);
    if (messageMatch) {
      return messageMatch[1].trim();
    }

    // If no specific message format, return the additional info as the message
    return additionalInfo.length > 200 ? additionalInfo.substring(0, 200) + '...' : additionalInfo;
  }

  /**
   * Helper method to generate receipt number from payment reference
   */
  private static generateReceiptNumber(paymentReference: string): string {
    const year = new Date().getFullYear();
    const shortRef = paymentReference.substring(0, 8).toUpperCase();
    return `GOSA-${year}-${shortRef}`;
  }
}
 /**
   * Parse convention additional information
   */
  private static parseConventionAdditionalInfo(additionalInfo ?: string): {
  quantity: number;
  accommodationType ?: string;
  additionalPersons: any[];
} {
  if (!additionalInfo) {
    return { quantity: 1, additionalPersons: [] };
  }

  const info = additionalInfo.toLowerCase();
  let quantity = 1;
  let accommodationType: string | undefined;
  const additionalPersons: any[] = [];

  // Extract quantity
  const quantityMatch = info.match(/quantity:\s*(\d+)/);
  if (quantityMatch) {
    quantity = parseInt(quantityMatch[1]);
  }

  // Extract accommodation type
  if (info.includes('premium')) {
    accommodationType = 'premium';
  } else if (info.includes('luxury')) {
    accommodationType = 'luxury';
  } else if (info.includes('standard')) {
    accommodationType = 'standard';
  }

  // Extract additional persons (simplified parsing)
  const personsMatch = info.match(/additional persons:\s*(\d+)/);
  if (personsMatch) {
    const count = parseInt(personsMatch[1]);
    for (let i = 0; i < count; i++) {
      additionalPersons.push({
        name: `Additional Person ${i + 1}`,
        email: 'Not provided',
        phone: 'Not provided'
      });
    }
  }

  return { quantity, accommodationType, additionalPersons };
}

  /**
   * Parse dinner additional information
   */
  private static parseDinnerAdditionalInfo(additionalInfo ?: string): {
  numberOfGuests: number;
  guestDetails: any[];
  specialRequests ?: string;
} {
  if (!additionalInfo) {
    return { numberOfGuests: 1, guestDetails: [] };
  }

  const info = additionalInfo.toLowerCase();
  let numberOfGuests = 1;
  const guestDetails: any[] = [];
  let specialRequests: string | undefined;

  // Extract number of guests
  const guestsMatch = info.match(/guests:\s*(\d+)/);
  if (guestsMatch) {
    numberOfGuests = parseInt(guestsMatch[1]);
  }

  // Extract guest names (simplified parsing)
  const guestNamesMatch = additionalInfo.match(/guest names:\s*([^|]+)/i);
  if (guestNamesMatch) {
    const names = guestNamesMatch[1].split(',').map(name => name.trim());
    names.forEach((name, index) => {
      if (name && index < numberOfGuests - 1) { // -1 because main attendee is not in guest list
        guestDetails.push({
          name,
          email: 'Not provided',
          phone: 'Not provided',
          dietaryRestrictions: 'None specified'
        });
      }
    });
  }

  // Extract special requests
  const requestsMatch = additionalInfo.match(/special requests:\s*([^|]+)/i);
  if (requestsMatch) {
    specialRequests = requestsMatch[1].trim();
  }

  return { numberOfGuests, guestDetails, specialRequests };
}

  /**
   * Parse accommodation additional information
   */
  private static parseAccommodationAdditionalInfo(additionalInfo ?: string): {
  accommodationType: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  confirmationCode: string;
  specialRequests ?: string;
} {
  const defaultInfo = {
    accommodationType: 'standard',
    checkInDate: 'December 25, 2025',
    checkOutDate: 'December 30, 2025',
    numberOfGuests: 1,
    confirmationCode: 'GOSA-' + Math.random().toString(36).substr(2, 8).toUpperCase()
  };

  if (!additionalInfo) {
    return defaultInfo;
  }

  const info = additionalInfo.toLowerCase();
  let accommodationType = 'standard';
  let specialRequests: string | undefined;

  // Extract accommodation type
  if (info.includes('premium')) {
    accommodationType = 'premium';
  } else if (info.includes('luxury')) {
    accommodationType = 'luxury';
  }

  // Extract special requests
  const requestsMatch = additionalInfo.match(/special requests:\s*([^|]+)/i);
  if (requestsMatch) {
    specialRequests = requestsMatch[1].trim();
  }

  return {
    ...defaultInfo,
    accommodationType,
    specialRequests
  };
}

  /**
   * Parse brochure additional information
   */
  private static parseBrochureAdditionalInfo(additionalInfo ?: string): {
  brochureType: string;
  quantity: number;
  deliveryMethod: string;
  recipientDetails: any[];
} {
  if (!additionalInfo) {
    return {
      brochureType: 'digital',
      quantity: 1,
      deliveryMethod: 'email',
      recipientDetails: []
    };
  }

  const info = additionalInfo.toLowerCase();
  let brochureType = 'digital';
  let quantity = 1;
  let deliveryMethod = 'email';
  const recipientDetails: any[] = [];

  // Extract brochure type
  if (info.includes('physical')) {
    brochureType = 'physical';
    deliveryMethod = 'pickup';
  }

  // Extract quantity
  const quantityMatch = info.match(/quantity:\s*(\d+)/);
  if (quantityMatch) {
    quantity = parseInt(quantityMatch[1]);
  }

  // Extract recipient details (simplified)
  const recipientsMatch = additionalInfo.match(/recipients:\s*([^|]+)/i);
  if (recipientsMatch) {
    const names = recipientsMatch[1].split(',').map(name => name.trim());
    names.forEach(name => {
      if (name) {
        recipientDetails.push({
          name,
          email: 'Not provided'
        });
      }
    });
  }

  return { brochureType, quantity, deliveryMethod, recipientDetails };
}

  /**
   * Extract message from goodwill additional information
   */
  private static extractMessageFromAdditionalInfo(additionalInfo ?: string): string {
  if (!additionalInfo) return 'Thank you for your generous contribution to GOSA 2025 Convention.';

  const messageMatch = additionalInfo.match(/message:\s*"([^"]+)"/i);
  if (messageMatch) {
    return messageMatch[1];
  }

  // Fallback: look for message without quotes
  const messageMatch2 = additionalInfo.match(/message:\s*([^|]+)/i);
  if (messageMatch2) {
    return messageMatch2[1].trim();
  }

  return 'Thank you for your generous contribution to GOSA 2025 Convention.';
}

  /**
   * Get attribution from goodwill additional information
   */
  private static getAttributionFromAdditionalInfo(additionalInfo ?: string): string {
  if (!additionalInfo) return 'Anonymous';

  if (additionalInfo.toLowerCase().includes('anonymous: yes')) {
    return 'Anonymous';
  }

  const attributionMatch = additionalInfo.match(/attribution:\s*([^|]+)/i);
  if (attributionMatch) {
    return attributionMatch[1].trim();
  }

  return 'Anonymous';
}

  /**
   * Generate receipt number from payment reference
   */
  private static generateReceiptNumber(paymentReference: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const refSuffix = paymentReference.slice(-4).toUpperCase();
  return `GOSA-${timestamp}-${refSuffix}`;
}

  /**
   * Get brochure delivery instructions
   */
  private static getBrochureDeliveryInstructions(additionalInfo ?: string): string {
  if (!additionalInfo) {
    return 'Digital brochure will be sent to your email address within 24 hours.';
  }

  const info = additionalInfo.toLowerCase();

  if (info.includes('physical')) {
    return 'Present this QR code at the convention registration desk to collect your physical brochure(s). Available from December 26-29, 2025.';
  }

  return 'Digital brochure will be sent to your email address within 24 hours.';
}

  /**
   * Generate PDF buffer with caching (placeholder for actual PDF generation)
   */
  static async generatePDFBuffer(data: PDFData): Promise < Buffer > {
  try {
    // Generate cache key for PDF buffer
    const cacheKey = PDFCacheService.generateCacheKey(data);
    const pdfCacheKey = `pdf:${cacheKey}`;

    // Try to get from cache first
    const cachedPDF = await PDFCacheService.getCachedPDF(pdfCacheKey);
    if(cachedPDF) {
      console.log('PDF buffer served from cache:', pdfCacheKey.substring(0, 12));
      return cachedPDF;
    }

      console.log('Generating new PDF buffer:', pdfCacheKey.substring(0, 12));

    // This is a placeholder implementation
    // In a real implementation, you would use puppeteer or similar to convert HTML to PDF
    const html = await this.generatePDFHTML(data);

    // For now, return the HTML as a buffer
    // In production, this would be replaced with actual PDF generation
    const pdfBuffer = Buffer.from(html, 'utf-8');

    // Cache the generated PDF buffer
    await PDFCacheService.cachePDF(pdfCacheKey, pdfBuffer);

    return pdfBuffer;
  } catch(error) {
    console.error('Error generating PDF buffer:', error);
    throw new Error('Failed to generate PDF buffer');
  }
}

  /**
   * Clear cache for a specific payment reference
   */
  static async clearCache(paymentReference: string): Promise < void> {
  await PDFCacheService.invalidatePaymentReference(paymentReference);
}

  /**
   * Get cache statistics
   */
  static getCacheStats() {
  return PDFCacheService.getCacheStats();
}
}  /
  **
   * Get room features based on accommodation type
  */
  private static getRoomFeatures(accommodationType: string): string {
  switch (accommodationType.toLowerCase()) {
    case 'luxury':
      return `
          • Spacious suite with separate living area<br>
          • King-size bed with premium linens<br>
          • Marble bathroom with jacuzzi tub<br>
          • Private balcony with city view<br>
          • Mini-bar and coffee machine<br>
          • 55" Smart TV with premium channels<br>
          • Work desk and seating area<br>
          • Complimentary premium breakfast<br>
          • Priority room service and concierge
        `;
    case 'premium':
      return `
          • Comfortable room with modern furnishings<br>
          • Queen-size bed with quality linens<br>
          • Updated bathroom with shower/tub combo<br>
          • City or garden view<br>
          • Coffee maker and mini-fridge<br>
          • 42" Smart TV with cable channels<br>
          • Work desk and chair<br>
          • Complimentary continental breakfast<br>
          • Enhanced room service options
        `;
    default: // standard
      return `
          • Well-appointed room with essential amenities<br>
          • Comfortable double bed with clean linens<br>
          • Private bathroom with shower<br>
          • Standard room view<br>
          • Coffee maker and water bottles<br>
          • 32" TV with basic cable<br>
          • Small work area<br>
          • Access to hotel breakfast (additional charge)<br>
          • Standard room service available
        `;
  }
}  /**
  
 * Get brochure type title from additional info
   */
  private static getBrochureTypeTitle(additionalInfo ?: string): string {
  if (!additionalInfo) return 'Digital';

  const info = additionalInfo.toLowerCase();
  if (info.includes('physical')) return 'Physical';
  return 'Digital';
}

  /**
   * Extract quantity from additional info
   */
  private static extractQuantityFromAdditionalInfo(additionalInfo ?: string): number {
  if (!additionalInfo) return 1;

  const quantityMatch = additionalInfo.match(/quantity:\s*(\d+)/i);
  if (quantityMatch) {
    return parseInt(quantityMatch[1]);
  }

  return 1;
}
}  /
  **
   * Parse donation additional information
  */
  private static parseDonationAdditionalInfo(additionalInfo ?: string): {
  anonymous: boolean;
  donorName ?: string;
  onBehalfOf ?: string;
} {
  if (!additionalInfo) {
    return { anonymous: false };
  }

  const info = additionalInfo.toLowerCase();
  const anonymous = info.includes('anonymous: yes') || info.includes('anonymous donation');

  let donorName: string | undefined;
  let onBehalfOf: string | undefined;

  // Extract donor name
  const donorMatch = additionalInfo.match(/donor:\s*([^|]+)/i);
  if (donorMatch && !anonymous) {
    donorName = donorMatch[1].trim();
  }

  // Extract "on behalf of" information
  const behalfMatch = additionalInfo.match(/on behalf of:\s*([^|]+)/i);
  if (behalfMatch) {
    onBehalfOf = behalfMatch[1].trim();
  }

  return { anonymous, donorName, onBehalfOf };
}
}