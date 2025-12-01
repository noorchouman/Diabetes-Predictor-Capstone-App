import sys, json, argparse, os
import numpy as np
import joblib

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
        scaler = load_artifact(scaler_path)
    except Exception as e:
        print(json.dumps({"error": "Model load failed", "details": str(e)}))
        sys.exit(1)

    # Read JSON from stdin
    try:
        data = json.loads(sys.stdin.read())
    except:
        print(json.dumps({"error": "Invalid JSON"}))
        sys.exit(1)

    # Build feature vector
    try:
        row = [float(data[k]) for k in FEATURES]
    except Exception as e:
        print(json.dumps({"error": "Bad input", "details": str(e)}))
        sys.exit(1)

    X = np.array(row).reshape(1, -1)
    # Suppress feature name warning - we're using the correct order
    import warnings
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UserWarning)
        X_scaled = scaler.transform(X)

    proba = float(model.predict_proba(X_scaled)[0, 1])
    pred = int(proba >= 0.5)

    print(json.dumps({"probability": proba, "predicted": pred}))

if __name__ == "__main__":
    main()
