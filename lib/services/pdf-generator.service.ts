import QRCode from 'qrcode';

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
   * Generate PDF as HTML string (can be converted to PDF using puppeteer or similar)
   */
  static async generatePDFHTML(data: PDFData): Promise<string> {
    try {
      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: this.DEFAULT_TEMPLATE.primaryColor,
          light: '#FFFFFF'
        }
      });

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
                <div class="logo-placeholder">GOSA</div>
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

      return html;
    } catch (error) {
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
}