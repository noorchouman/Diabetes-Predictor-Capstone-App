import sys
import json
import argparse
import os
import numpy as np
import joblib
import warnings

FEATURES = [
    "pregnancies",
    "glucose",
    "blood_pressure",
    "skin_thickness",
    "insulin",
    "bmi",
    "diabetes_pedigree_function",
    "age",
]

def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", required=True)
    return ap.parse_args()

def load_artifact(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing {path}")
    return joblib.load(path)

def main():
    args = parse_args()
    model_path = os.path.join(args.artifacts, "model.pkl")
    scaler_path = os.path.join(args.artifacts, "scaler.pkl")

    try:
        model = load_artifact(model_path)
        # Check if model has built-in scaler (TabTransformer)
        has_builtin_scaler = hasattr(model, 'scaler') and model.scaler is not None
        
        # Load external scaler only if model doesn't have built-in scaler
        if not has_builtin_scaler:
            scaler = load_artifact(scaler_path)
        else:
            scaler = None  # TabTransformer uses its own scaler
    except Exception as e:
        print(json.dumps({"error": "Model load failed", "details": str(e)}))
        sys.exit(1)

    try:
        data = json.loads(sys.stdin.read())
    except:
        print(json.dumps({"error": "Invalid JSON"}))
        sys.exit(1)

    try:
        row = [float(data[k]) for k in FEATURES]
    except Exception as e:
        print(json.dumps({"error": "Bad input", "details": str(e)}))
        sys.exit(1)

    X = np.array(row).reshape(1, -1)
    
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore")
        
        # TabTransformer handles scaling internally, others need external scaler
        if has_builtin_scaler:
            # TabTransformer: pass raw data, model scales internally
            proba = model.predict_proba(X)
        else:
            # Other models: scale first, then predict
            X_scaled = scaler.transform(X)
            proba = model.predict_proba(X_scaled)
    
    # Handle probability output (should be 2D array with shape (1, 2) for binary classification)
    if proba.ndim == 2 and proba.shape[1] == 2:
        proba_value = float(proba[0, 1])  # Probability of positive class
    elif proba.ndim == 1:
        proba_value = float(proba[0])
    else:
        proba_value = float(proba[0, 1] if proba.shape[1] > 1 else proba[0, 0])
    
    pred = int(proba_value >= 0.5)

    print(json.dumps({"probability": proba_value, "predicted": pred}), flush=True)

if __name__ == "__main__":
    main()
