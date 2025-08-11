// Test script to verify dinner reservation creation works
const mongoose = require('mongoose');

// Simple test schema without the problematic unique constraint
const testSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  paymentReference: { type: String, required: true, unique: true },
  numberOfGuests: { type: Number, required: true },
  guestDetails: [{
    name: { type: String, required: true },
    email: String,
    phone: String,
    dietaryRequirements: String
  }],
  totalAmount: { type: Number, required: true },
  confirmed: { type: Boolean, default: false },
  qrCodes: [{
    guestName: { type: String, required: true },
    qrCode: { type: String, required: false },
    used: { type: Boolean, default: false }
  }]
}, { timestamps: true });

async function testDinnerCreation() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gosa';
    await mongoose.connect(uri);
    
    const TestModel = mongoose.model('TestDinnerReservation', testSchema);
    
    // Test creating a reservation with empty qrCodes
    const testReservation = await TestModel.create({
      userId: new mongoose.Types.ObjectId(),
      paymentReference: `test_${Date.now()}_+1234567890`,
      numberOfGuests: 2,
      guestDetails: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ],
      totalAmount: 150,
      confirmed: false,
      qrCodes: []
    });
    
    console.log('Test reservation created successfully:', testReservation._id);
    
    // Clean up
    await TestModel.deleteOne({ _id: testReservation._id });
    console.log('Test reservation cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testDinnerCreation().catch(console.error);