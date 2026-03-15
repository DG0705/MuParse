import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json
import sys

def analyze():
    try:
        # Update connection string if necessary
        client = MongoClient("mongodb+srv://MuParseUser:kT2yki8ErcA3cq3d@cluster0.bq0sluh.mongodb.net/")
        db = client.StudentDB
        
        # Ensure we actually get data
        cursor = db.academicrecords.find({}, {"_id": 0, "prn": 1, "sgpi": 1, "semester": 1})
        records = list(cursor)
        
        if not records:
            print(json.dumps([]))
            return

        df = pd.DataFrame(records)
        df['sgpi'] = pd.to_numeric(df['sgpi'], errors='coerce').fillna(0)
        
        # 1. Peer Stats (Class Average)
        # Use transform to keep shape consistent
        df['mean'] = df.groupby('semester')['sgpi'].transform('mean')
        df['std'] = df.groupby('semester')['sgpi'].transform('std').replace(0, 1)
        df['z_score'] = (df['sgpi'] - df['mean']) / df['std']

        # 2. Historical Trend
        df = df.sort_values(['prn', 'semester'])
        df['past_avg'] = df.groupby('prn')['sgpi'].transform(lambda x: x.shift().expanding().mean()).fillna(df['sgpi'])
        df['drop'] = (df['past_avg'] - df['sgpi']).clip(lower=0) # Only care about drops
        
        # 3. Volatility
        df['volatility'] = df.groupby('prn')['sgpi'].transform(lambda x: x.expanding().std()).fillna(0)

        # 4. ML Model
        features = ['z_score', 'drop', 'volatility']
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(df[features])

        model = IsolationForest(contamination=0.1, random_state=42)
        df['is_anomaly'] = model.fit_predict(scaled_data)

        # 5. Risk Labeling
        def get_risk(row):
            if row['is_anomaly'] == -1 and row['drop'] > 2.0: return "Critical"
            if row['drop'] > 1.0: return "Warning"
            if row['z_score'] < -1.0: return "Peer Lag"
            return "Stable"

        df['risk_level'] = df.apply(get_risk, axis=1)

        # Filter and output
        results = df[df['risk_level'] != "Stable"]
        print(json.dumps(results[['prn', 'semester', 'sgpi', 'past_avg', 'drop', 'z_score', 'risk_level']].to_dict(orient='records')))

    except Exception as e:
        # Important: Output error to stderr so Node.js sees it in console.error
        sys.stderr.write(str(e))
        sys.exit(1)

if __name__ == "__main__":
    analyze()