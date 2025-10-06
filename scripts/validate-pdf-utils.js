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
      
      console.log(`   ${serviceType}: ✓ Generated QR data: ${qrData}`);
      
      // Validate URL format
      if (!qrData.startsWith('https://gosa.events/scan?id=')) {
        throw new Error(`Invalid QR data format for ${serviceType}. Expected URL format.`);
      }
      
      // Extract and validate ID
      const url = new URL(qrData);
      const id = url.searchParams.get('id');
      if (!id) {
        throw new Error(`Missing ID in QR data for ${serviceType}`);
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

    // Test 3: Validate QR code data structure for accommodation
    console.log('\n✅ Test 3: Validate accommodation QR data format');
    const checkOutDate = new Date('2025-12-31T10:00:00Z');
    const accomQrData = await PDFWhatsAppUtils.generateServiceQRCodeData(
      'accommodation',
      serviceId,
      {
        userId: additionalData.userId,
        accommodationType: 'premium',
        checkOutDate: checkOutDate.toISOString(),
      }
    );

    console.log(`   ✓ Accommodation QR data: ${accomQrData}`);
    
    if (!accomQrData.startsWith('https://gosa.events/scan?id=')) {
      throw new Error('Accommodation QR data should use URL format');
    }

    // Test 4: Validate URL format consistency
    console.log('\n✅ Test 4: Validate URL format consistency');
    
    const conventionQr = await PDFWhatsAppUtils.generateServiceQRCodeData('convention', serviceId, additionalData);
    const dinnerQr = await PDFWhatsAppUtils.generateServiceQRCodeData('dinner', serviceId, additionalData);
    const brochureQr = await PDFWhatsAppUtils.generateServiceQRCodeData('brochure', serviceId, additionalData);

    console.log(`   ✓ Convention QR: ${conventionQr}`);
    console.log(`   ✓ Dinner QR: ${dinnerQr}`);
    console.log(`   ✓ Brochure QR: ${brochureQr}`);

    // All should have the same format with the service ID
    const expectedUrl = `https://gosa.events/scan?id=${serviceId}`;
    if (conventionQr !== expectedUrl || dinnerQr !== expectedUrl || brochureQr !== expectedUrl) {
      throw new Error('QR codes should all use the same URL format with service ID');
    }

    console.log('\n🎉 All PDF WhatsApp Utils validation tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✓ QR code data generation for all service types');
    console.log('   ✓ Service type extraction from payment references');
    console.log('   ✓ URL format validation for QR codes');
    console.log('   ✓ Consistent ID usage across service types');
    console.log('   ✓ Proper URL structure validation');

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