const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/gosa';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to local DB");
  
  const collectionName = 'whatsappgroups';
  const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
  console.log(`Documents in '${collectionName}':`);
  console.log(JSON.stringify(documents, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
