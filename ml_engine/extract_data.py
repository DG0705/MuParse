import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables (make sure to have a .env file with MONGO_URI)
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URL", "mongodb+srv://MuParseUser:kT2yki8ErcA3cq3d@cluster0.bq0sluh.mongodb.net/StudentDB") 

def export_data_to_csv():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client.get_database() # Gets the default DB from the URI

    print("Fetching Student Master data...")
    # Fetch all students and drop the MongoDB specific _id
    students_cursor = db['studentmasters'].find({}, {'_id': 0})
    df_students = pd.DataFrame(list(students_cursor))

    print("Fetching Academic Records...")
    # Fetch academic records (Adjust collection name to 'nepacademicrecords' if needed)
    records_cursor = db['academicrecords'].find({}, {'_id': 0})
    df_records = pd.DataFrame(list(records_cursor))

    if df_students.empty or df_records.empty:
        print("Error: One or both collections are empty. Have you parsed the PDFs yet?")
        return

    print("Merging datasets...")
    # Assuming both collections share a common key like 'seatNumber' or 'studentId'
    # Adjust 'seatNumber' to whatever your actual linking field is in your Mongoose models
    master_df = pd.merge(df_students, df_records, on='prn', how='inner')

    # Save to CSV
    output_file = 'master_academic_data.csv'
    master_df.to_csv(output_file, index=False)
    
    print(f"Success! Data exported to {output_file}")
    print(f"Total records extracted: {len(master_df)}")
    print(f"Features (Columns) available: {len(master_df.columns)}")

if __name__ == "__main__":
    export_data_to_csv()