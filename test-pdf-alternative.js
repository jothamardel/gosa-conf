// Simple test for PDF alternative service
const { PDFBlobAlternativeService } = require('./lib/services/pdf-blob-alternative.service.ts');

// Mock data for testing
const testData = {
  userDetails: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  },
  operationDetails: {
    type: 'convention',
    amount: 150.00,
    paymentReference: 'CONV_TEST_123',
    date: new Date(),
    status: 'confirmed',
    description: 'Convention Registration',
    additionalInfo: 'Standard accommodation, 2 dinner tickets'
  },
  qrCodeData: 'CONV_TEST_123|John Doe|2025-01-15'
};

async function testPDFGeneration() {
  try {
    console.log('Testing PDF generation with jsPDF...');
    
    // This would normally upload to Vercel Blob, but we'll just test the PDF generation part
    const result = await PDFBlobAlternativeService.generateAndUploadPDF(testData);
    
    console.log('PDF generation result:', result);
    
    if (result.success) {
      console.log('✅ PDF generated successfully!');
      console.log('File size:', result.size, 'bytes');
      console.log('Duration:', result.duration, 'ms');
    } else {
      console.log('❌ PDF generation failed:', result.error);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPDFGeneration();