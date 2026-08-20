import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI || "";

async function run() {
  console.log("Connecting directly to Atlas to search all DBs...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 60000,
  });

  try {
    await client.connect();
    console.log("Connected successfully!");
    const admin = client.db().admin();
    const dbsInfo = await admin.listDatabases();
    console.log("Databases on Atlas:", dbsInfo.databases.map(d => d.name));
    
    const targetRef = "cart_1787256997654_2348035994898";
    let found = false;

    for (const dbInfo of dbsInfo.databases) {
      if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
      
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      for (const col of collections) {
        const doc = await db.collection(col.name).findOne({ 
          $or: [
            { paymentReference: targetRef },
            { reference: targetRef },
            { paymentReference: { $regex: targetRef } }
          ]
        });
        
        if (doc) {
          console.log(`\n🎉 FOUND IT!`);
          console.log(`Database: ${dbInfo.name}`);
          console.log(`Collection: ${col.name}`);
          console.log(`Document:`, JSON.stringify(doc, null, 2));
          found = true;
        }
      }
    }

    if (!found) {
      console.log("\n❌ Transaction reference not found in any database/collection on Atlas.");
    }
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.close();
  }
}

run();
