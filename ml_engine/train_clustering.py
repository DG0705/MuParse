import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib
import warnings

warnings.filterwarnings('ignore')

# 1. Load the cleaned data you generated in Phase 1
df = pd.read_csv('cleaned_academic_data.csv')

# 2. Select Features for Clustering
# We drop identifiers and labels. We want the AI to group students 
# based ONLY on their numerical marks across all subjects.
cols_to_drop = ['prn', 'isKT', 'finalResult', 'ABCID', 'Is_Diploma_Student', 'category', 'semester']
X = df.drop(columns=[col for col in cols_to_drop if col in df.columns])

# Keep only numeric columns and fill missing values with 0
X = X.select_dtypes(include=['number'])
X = X.fillna(0)

# 3. Standardize the Data (Crucial for K-Means)
# Because K-Means uses "distance," we must scale everything so a 
# 100-mark subject doesn't count more than a 10-point SGPI.
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 4. Train the K-Means Model
# We are asking the AI to divide the batch into 3 "Personas"
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
df['Cluster'] = kmeans.fit_predict(X_scaled)

# 5. Analyze the Results (The Interpretation)
print("--- AI Generated Student Personas ---")
# We group by the new 'Cluster' column to see the average performance of each group
profile_summary = df.groupby('Cluster')['sgpi'].agg(['mean', 'count']).reset_index()
profile_summary.rename(columns={'mean': 'Average SGPI', 'count': 'Number of Students'}, inplace=True)
print(profile_summary)

# 6. Export the "Brain" and the "Scale"
# You need the scaler later to format new student data before clustering it
joblib.dump(kmeans, 'student_clustering_model.pkl')
joblib.dump(scaler, 'cluster_scaler.pkl')

print("\nSuccess! student_clustering_model.pkl and cluster_scaler.pkl generated.")