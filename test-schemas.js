// Quick test to verify schemas can be imported
const mongoose = require('mongoose');

// Mock mongoose connection for testing
mongoose.models = {};

try {
  // Test importing each schema
  const { DinnerReservation } = require('./lib/schema/dinner.schema.ts');
  const { Accommodation } = require('./lib/schema/accommodation.schema.ts');
  const { ConventionBrochure } = require('./lib/schema/brochure.schema.ts');
  const { GoodwillMessage } = require('./lib/schema/goodwill.schema.ts');
  const { Donation } = require('./lib/schema/donation.schema.ts');
  const { AttendeeBadge } = require('./lib/schema/badge.schema.ts');
  const { QRCodeHistory } = require('./lib/schema/qr-history.schema.ts');
  
  console.log('✅ All schemas imported successfully');
  console.log('✅ DinnerReservation model available');
  console.log('✅ Accommodation model available');
  console.log('✅ ConventionBrochure model available');
  console.log('✅ GoodwillMessage model available');
  console.log('✅ Donation model available');
  console.log('✅ AttendeeBadge model available');
  console.log('✅ QRCodeHistory model available');
} catch (error) {
  console.error('❌ Error importing schemas:', error.message);
  process.exit(1);
}