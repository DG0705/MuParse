require("dotenv").config();
const mongoose = require("mongoose");
const StudentMaster = require("./models/StudentMaster");

// Adjust this if your .env variable for the database is named differently (e.g., DATABASE_URL)
const MONGODB_URL = process.env.MONGODB_URL; 

async function runMigration() {
  try {
    if (!MONGODB_URL) {
      throw new Error("MongoDB URI is missing. Please check your .env file.");
    }

    console.log("Connecting to Database...");
    await mongoose.connect(MONGODB_URL);
    console.log("Connected successfully!");

    console.log("Fetching students who need a batch update...");
    
    // Find all students that don't have a batch, or where it is null/empty
    const students = await StudentMaster.find({
      $or: [{ batch: { $exists: false } }, { batch: null }, { batch: "" }],
    });

    if (students.length === 0) {
      console.log("No students found that need updating. Your database is fully up to date!");
      process.exit(0);
    }

    console.log(`Found ${students.length} students to migrate. Processing...`);
    const bulkOperations = [];

    students.forEach((student) => {
      const rawPRN = student.prn ? student.prn.toString() : "";
      
      // Ensure the PRN is valid and long enough to extract a year
      if (rawPRN.length >= 4 && !rawPRN.startsWith("TEMP_")) {
        const extractedYear = rawPRN.substring(0, 4);

        bulkOperations.push({
          updateOne: {
            filter: { _id: student._id },
            update: { $set: { batch: extractedYear } },
          },
        });
      }
    });

    if (bulkOperations.length > 0) {
      const result = await StudentMaster.bulkWrite(bulkOperations);
      console.log(`Migration Complete! Successfully updated ${result.modifiedCount} records.`);
    } else {
      console.log("No valid PRNs found to extract batch years from.");
    }

  } catch (error) {
    console.error("\nMigration failed:", error.message);
  } finally {
    console.log("Disconnecting from Database...");
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();