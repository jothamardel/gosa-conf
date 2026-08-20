import { MongoClient } from "mongodb";

const localURI = "mongodb://localhost:27017";

async function run() {
  console.log("Connecting to local MongoDB...");
  const client = new MongoClient(localURI);

  try {
    await client.connect();
    console.log("Connected successfully!");
    const admin = client.db().admin();
    const dbsInfo = await admin.listDatabases();
    console.log("Databases list:", dbsInfo.databases.map(d => d.name));
    
    for (const dbInfo of dbsInfo.databases) {
      if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
      
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      console.log(`\nDatabase: ${dbInfo.name}`);
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`- Collection ${col.name} has ${count} documents`);
        if (count > 0) {
          const sample = await db.collection(col.name).find().limit(2).toArray();
          console.log(`  Sample:`, JSON.stringify(sample, null, 2));
        }
      }
    }
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.close();
  }
}

run();
