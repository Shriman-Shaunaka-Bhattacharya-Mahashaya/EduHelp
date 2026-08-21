import mongoose from 'mongoose';

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    // Force the use of the actual DB string in case .env isn't loaded by the raw script
    await mongoose.connect('mongodb+srv://bhattacharyasounak3_db_user:80nseCc9srm2Kdwv@cluster0.it9zmoo.mongodb.net/?appName=Cluster0');
    
    console.log("Connected! Dropping index...");
    await mongoose.connection.collection('onlineclasses').dropIndex('meetingId_1');
    console.log("Successfully dropped 'meetingId_1' index from onlineclasses.");
    
  } catch (error: any) {
    if (error.codeName === 'IndexNotFound') {
      console.log("Index already dropped or doesn't exist.");
    } else {
      console.error("Error dropping index:", error);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
