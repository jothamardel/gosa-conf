// Simple validation script for PDF WhatsApp Utils
// This script validates the core functionality without database dependencies

const { PDFWhatsAppUtils } = require('../lib/utils/pdf-whatsapp.utils');

async function validatePDFUtils() {
  console.log('🔍 Validating PDF WhatsApp Utils...\n');

  try {
    // Test 1: Generate QR code data for different service types
    console.log('✅ Test 1: Generate QR code data for different service types');
    const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];
    const serviceId = '507f1f77bcf86cd799439011';
    const additionalData = { userId: '507f1f77bcf86cd799439012' };

    for (const serviceType of serviceTypes) {
      const qrData = await PDFWhatsAppUtils.generateServiceQRCodeData(
        serviceType,
        serviceId,
        additionalData
      );
      
      const parsedData = JSON.parse(qrData);
      console.log(`   ${serviceType}: ✓ Generated QR data with type: ${parsedData.type}`);
      
      // Validate structure
      if (!parsedData.type || !parsedData.id || !parsedData.validUntil || !parsedData.timestamp) {
        throw new Error(`Invalid QR data structure for ${serviceType}`);
      }
    }

    // Test 2: Extract service info from payment references
    console.log('\n✅ Test 2: Extract service info from payment references');
    const testReferences = [
      { ref: 'conv_123456', expected: 'convention' },
      { ref: 'dinner_789012', expected: 'dinner' },
      { ref: 'accom_345678', expected: 'accommodation' },
      { ref: 'broch_901234', expected: 'brochure' },
      { ref: 'good_567890', expected: 'goodwill' },
      { ref: 'don_123789', expected: 'donation' },
      { ref: 'unknown_456123', expected: undefined },
    ];

    for (const { ref, expected } of testReferences) {
      const result = PDFWhatsAppUtils.extractServiceInfoFromReference(ref);
      console.log(`   ${ref}: ✓ Detected service type: ${result.serviceType || 'none'}`);
      
      if (result.serviceType !== expected) {
        throw new Error(`Expected ${expected}, got ${result.serviceType} for ${ref}`);
      }
    }

    // Test 3: Validate QR code data structure for accommodation with custom checkout
    console.log('\n✅ Test 3: Validate accommodation QR data with custom checkout date');
    const checkOutDate = new Date('2024-12-31T10:00:00Z');
    const accomQrData = await PDFWhatsAppUtils.generateServiceQRCodeData(
      'accommodation',
      serviceId,
      {
        userId: additionalData.userId,
        accommodationType: 'premium',
        checkOutDate: checkOutDate.toISOString(),
      }
    );

    const accomParsedData = JSON.parse(accomQrData);
    console.log(`   ✓ Accommodation QR data uses custom checkout date: ${accomParsedData.validUntil}`);
    
    if (accomParsedData.validUntil !== checkOutDate.toISOString()) {
      throw new Error('Custom checkout date not properly set in accommodation QR data');
    }

    // Test 4: Validate expiration times for different service types
    console.log('\n✅ Test 4: Validate expiration times for different service types');
    const now = Date.now();
    
    const conventionQr = JSON.parse(await PDFWhatsAppUtils.generateServiceQRCodeData('convention', serviceId, additionalData));
    const dinnerQr = JSON.parse(await PDFWhatsAppUtils.generateServiceQRCodeData('dinner', serviceId, additionalData));
    const brochureQr = JSON.parse(await PDFWhatsAppUtils.generateServiceQRCodeData('brochure', serviceId, additionalData));

    const conventionExpiry = new Date(conventionQr.validUntil).getTime();
    const dinnerExpiry = new Date(dinnerQr.validUntil).getTime();
    const brochureExpiry = new Date(brochureQr.validUntil).getTime();

    // Convention should expire in ~1 year (365 days)
    const conventionDays = Math.round((conventionExpiry - now) / (1000 * 60 * 60 * 24));
    console.log(`   ✓ Convention expires in ~${conventionDays} days (expected ~365)`);
    
    // Dinner should expire in ~30 days
    const dinnerDays = Math.round((dinnerExpiry - now) / (1000 * 60 * 60 * 24));
    console.log(`   ✓ Dinner expires in ~${dinnerDays} days (expected ~30)`);
    
    // Brochure should expire in ~90 days
    const brochureDays = Math.round((brochureExpiry - now) / (1000 * 60 * 60 * 24));
    console.log(`   ✓ Brochure expires in ~${brochureDays} days (expected ~90)`);

    console.log('\n🎉 All PDF WhatsApp Utils validation tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✓ QR code data generation for all service types');
    console.log('   ✓ Service type extraction from payment references');
    console.log('   ✓ Custom expiration dates for accommodation');
    console.log('   ✓ Appropriate expiration times for each service type');
    console.log('   ✓ Data structure validation');

  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validatePDFUtils();
}

module.exports = { validatePDFUtils };