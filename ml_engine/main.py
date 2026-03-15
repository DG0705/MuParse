# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# import joblib
# import pandas as pd
# import warnings

# # Suppress standard sklearn warnings for clean terminal output
# warnings.filterwarnings('ignore')

# app = FastAPI(title="MuParse ML Engine", version="1.0")

# # 1. Load the trained model into memory when the server starts
# print("Loading ML Model...")
# try:
#     model = joblib.load('kt_predictor_model.pkl')
#     # Extract the exact column names the model expects
#     expected_features = model.feature_names_in_
#     print("Model loaded successfully!")
# except Exception as e:
#     print(f"Error loading model: {e}")
#     expected_features = []

# # 2. Define what the incoming JSON data from Node.js should look like
# class StudentData(BaseModel):
#     student_id: str
#     features: dict  # A dictionary of the student's current marks/data

# @app.get("/")
# def read_root():
#     return {"status": "ML Engine is running active models."}

# # 3. Create the prediction endpoint
# @app.post("/api/predict-kt")
# def predict_kt(data: StudentData):
#     if not expected_features.any():
#         raise HTTPException(status_code=500, detail="Model features not loaded properly.")

#     try:
#         # Convert the incoming JSON dictionary into a pandas DataFrame (1 row)
#         input_df = pd.DataFrame([data.features])
        
#         # Ensure all expected columns are present (fill missing ones with 0.0)
#         for col in expected_features:
#             if col not in input_df.columns:
#                 input_df[col] = 0.0
                
#         # Reorder columns to exactly match what the model was trained on
#         input_df = input_df[expected_features]
        
#         # Make the prediction
#         prediction = model.predict(input_df)[0]
#         probability = model.predict_proba(input_df)[0][1] # Probability of getting a KT (Class 1)
        
#         return {
#             "student_id": data.student_id,
#             "kt_risk_flag": bool(prediction),
#             "kt_probability_score": round(probability * 100, 2),
#             "message": "High Risk of KT" if prediction == 1 else "Clear trajectory"
#         }

#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))



from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import warnings

# Suppress standard sklearn warnings for clean terminal output
warnings.filterwarnings('ignore')

app = FastAPI(title="MuParse ML Engine", version="2.0")

# 1. Load BOTH trained models into memory when the server starts
print("Loading ML Models...")
try:
    # --- Load KT Predictor (Supervised) ---
    model = joblib.load('kt_predictor_model.pkl')
    expected_features = model.feature_names_in_
    
    # --- Load Persona Clustering (Unsupervised) ---
    kmeans_model = joblib.load('student_clustering_model.pkl')
    cluster_scaler = joblib.load('cluster_scaler.pkl')
    cluster_features = cluster_scaler.feature_names_in_
    
    print("Both KT Predictor and Clustering models loaded successfully!")
except Exception as e:
    print(f"Error loading models: {e}")
    expected_features = []
    cluster_features = []

# 2. Define what the incoming JSON data from Node.js should look like
class StudentData(BaseModel):
    student_id: str
    features: dict  # A dictionary of the student's current marks/data

@app.get("/")
def read_root():
    return {"status": "ML Engine is running active models."}

# 3. Create the KT prediction endpoint (Your existing code)
@app.post("/api/predict-kt")
def predict_kt(data: StudentData):
    if len(expected_features) == 0:
        raise HTTPException(status_code=500, detail="KT Model features not loaded properly.")

    try:
        # Convert the incoming JSON dictionary into a pandas DataFrame (1 row)
        input_df = pd.DataFrame([data.features])
        
        # Ensure all expected columns are present (fill missing ones with 0.0)
        for col in expected_features:
            if col not in input_df.columns:
                input_df[col] = 0.0
                
        # Reorder columns to exactly match what the model was trained on
        input_df = input_df[expected_features]
        
        # Make the prediction
        prediction = model.predict(input_df)[0]
        probability = model.predict_proba(input_df)[0][1] # Probability of getting a KT (Class 1)
        
        return {
            "student_id": data.student_id,
            "kt_risk_flag": bool(prediction),
            "kt_probability_score": round(probability * 100, 2),
            "message": "High Risk of KT" if prediction == 1 else "Clear trajectory"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 4. Create the NEW Persona Clustering endpoint
@app.post("/api/predict-persona")
def predict_persona(data: StudentData):
    if len(cluster_features) == 0:
        raise HTTPException(status_code=500, detail="Clustering models not loaded properly.")

    try:
        input_df = pd.DataFrame([data.features])
        
        # Ensure columns match the clustering model
        for col in cluster_features:
            if col not in input_df.columns:
                input_df[col] = 0.0
        
        input_df = input_df[cluster_features]
        
        # Scale the data and Predict using the scaler you exported
        scaled_data = cluster_scaler.transform(input_df)
        cluster_id = int(kmeans_model.predict(scaled_data)[0])
        
        # Map IDs to the names we discovered in your terminal earlier
        # Cluster 0 = 8.05 Avg SGPI | Cluster 1 = 0.00 Avg SGPI | Cluster 2 = 2.93 Avg SGPI
        persona_map = {
            0: {"name": "Consistent Performer", "color": "emerald"},
            1: {"name": "Critical Attention Needed", "color": "red"},
            2: {"name": "Mid-Tier / Struggling", "color": "orange"}
        }
        
        result = persona_map.get(cluster_id, {"name": "Standard Profile", "color": "gray"})
        
        return {
            "cluster_id": cluster_id,
            "persona": result["name"],
            "color": result["color"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))