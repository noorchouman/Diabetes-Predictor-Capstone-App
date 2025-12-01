# ml/train_pima.py
# Train Random Forest model for diabetes prediction
# Uses same preprocessing as main2.py comparison script
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
)
from sklearn.ensemble import RandomForestClassifier

RANDOM_STATE = 42

# Load dataset
DATA_PATH = Path(__file__).resolve().parent / "data" / "pimadiabetes.csv"
df = pd.read_csv(DATA_PATH)

print(f"Dataset shape: {df.shape}")

# Handle zero values (treated as missing) - same as main2.py
zero_cols = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
df_clean = df.copy()
df_clean[zero_cols] = df_clean[zero_cols].replace(0, np.nan)

print("\nMissing values BEFORE imputation:")
print(df_clean.isnull().sum())

# Impute with median
for col in zero_cols:
    df_clean[col] = df_clean[col].fillna(df_clean[col].median())

print("\nMissing values AFTER median imputation:")
print(df_clean.isnull().sum(), "\n")

# Prepare features and target - EXACTLY as main2.py
X = df_clean.drop("Outcome", axis=1)
y = df_clean["Outcome"]

# Split (80/20 stratified) - EXACTLY as main2.py
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.20,
    random_state=RANDOM_STATE,
    stratify=y
)

print("Train/Test shapes:")
print("X_train:", X_train.shape, " X_test:", X_test.shape)
print("y_train:", y_train.shape, " y_test:", y_test.shape, "\n")

# Scale features - Random Forest benefits from scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Random Forest (best performing model from comparison)
print("\nTraining Random Forest model...")
model = RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE)
model.fit(X_train_scaled, y_train)

# Evaluate
y_pred = model.predict(X_test_scaled)
y_proba = model.predict_proba(X_test_scaled)[:, 1]

metrics = {
    "model": "RandomForest",
    "accuracy": float(accuracy_score(y_test, y_pred)),
    "precision": float(precision_score(y_test, y_pred, zero_division=0)),
    "recall": float(recall_score(y_test, y_pred, zero_division=0)),
    "f1": float(f1_score(y_test, y_pred, zero_division=0)),
    "roc_auc": float(roc_auc_score(y_test, y_proba)),
}

print("\nModel Performance Metrics:")
print(f"  Accuracy: {metrics['accuracy']:.4f}")
print(f"  Precision: {metrics['precision']:.4f}")
print(f"  Recall: {metrics['recall']:.4f}")
print(f"  F1-Score: {metrics['f1']:.4f}")
print(f"  ROC-AUC: {metrics['roc_auc']:.4f}")

# Save model + scaler + metrics
artifacts_dir = Path(__file__).resolve().parents[1] / "backend" / "artifacts"
artifacts_dir.mkdir(parents=True, exist_ok=True)

joblib.dump(model, artifacts_dir / "model.pkl")
joblib.dump(scaler, artifacts_dir / "scaler.pkl")
with open(artifacts_dir / "metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

print(f"\n[SUCCESS] Model saved to: {artifacts_dir / 'model.pkl'}")
print(f"[SUCCESS] Scaler saved to: {artifacts_dir / 'scaler.pkl'}")
print(f"[SUCCESS] Metrics saved to: {artifacts_dir / 'metrics.json'}")

