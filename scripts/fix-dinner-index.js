// Script to fix the dinner reservation QR code index issue
const { MongoClient } = require('mongodb');

async function fixDinnerIndex() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gosa';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('dinnerreservations');

    console.log('Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the problematic qrCodes.qrCode index if it exists
    try {
      await collection.dropIndex('qrCodes.qrCode_1');
      console.log('Dropped problematic qrCodes.qrCode_1 index');
    } catch (error) {
      console.log('Index qrCodes.qrCode_1 does not exist or already dropped');
    }

    // Create the new sparse unique index
    try {
      await collection.createIndex(
        { 'qrCodes.qrCode': 1 }, 
        { unique: true, sparse: true, name: 'qrCodes.qrCode_sparse' }
      );
      console.log('Created new sparse unique index for qrCodes.qrCode');
    } catch (error) {
      console.log('Error creating new index:', error.message);
    }

    console.log('Index fix completed');
  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await client.close();
  }
}

fixDinnerIndex().catch(console.error);