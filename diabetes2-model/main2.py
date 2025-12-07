
import numpy as np
import pandas as pd
import json
from pathlib import Path
import shutil
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, classification_report
)
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from pytorch_tabnet.tab_model import TabNetClassifier
import torch
import joblib

RANDOM_STATE = 42
sns.set(style="whitegrid", font_scale=1.0)


DATA_PATH = "pimadiabetes.csv"
df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)
print(df.head(), "\n")

print("\nInfo:")
print(df.info(), "\n")

print("\nDescriptive statistics:")
print(df.describe().T, "\n")


zero_cols = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]

df_clean = df.copy()
df_clean[zero_cols] = df_clean[zero_cols].replace(0, np.nan)

print("\nMissing values BEFORE imputation:")
print(df_clean.isnull().sum())

for col in zero_cols:
    df_clean[col] = df_clean[col].fillna(df_clean[col].median())

print("\nMissing values AFTER median imputation:")
print(df_clean.isnull().sum(), "\n")


plt.figure(figsize=(4, 4))
sns.countplot(x="Outcome", data=df_clean)
plt.title("Outcome Distribution (0 = No diabetes, 1 = Diabetes)")
plt.savefig("outcome_distribution.png", dpi=150, bbox_inches='tight')
plt.close()

plt.figure(figsize=(8, 6))
sns.heatmap(df_clean.corr(), annot=False, cmap="coolwarm")
plt.title("Correlation Heatmap")
plt.savefig("correlation_heatmap.png", dpi=150, bbox_inches='tight')
plt.close()


X = df_clean.drop("Outcome", axis=1)
y = df_clean["Outcome"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.20,
    random_state=RANDOM_STATE,
    stratify=y
)

print("Train/Test shapes:")
print("X_train:", X_train.shape, " X_test:", X_test.shape)
print("y_train:", y_train.shape, " y_test:", y_test.shape, "\n")


scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


models = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
    "SVM (RBF)": SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE),
    "Random Forest": RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE),

    "TabTransformer": TabNetClassifier(
        optimizer_fn=torch.optim.Adam,
        optimizer_params=dict(lr=1e-3),
        scheduler_params={"step_size": 20, "gamma": 0.9},
        scheduler_fn=torch.optim.lr_scheduler.StepLR,
        mask_type='entmax',
        seed=RANDOM_STATE
    )
}


def compute_metrics(y_true, y_pred, y_proba):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    auc = roc_auc_score(y_true, y_proba)
    return acc, prec, rec, f1, auc


results = []
roc_curves = {}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

for name, model in models.items():
    print(f"\nTraining {name} ...")

    if name == "TabTransformer":
        model.fit(
            X_train.values,
            y_train.values,  # 1D labels
            eval_set=[(X_test.values, y_test.values)],
            patience=30,
            max_epochs=200,
            batch_size=64,
            virtual_batch_size=32
        )

        y_pred = np.array(model.predict(X_test.values)).ravel()
        proba = np.array(model.predict_proba(X_test.values))
        if proba.ndim == 1:
            y_proba = proba
        elif proba.shape[1] == 1:
            y_proba = proba[:, 0]
        else:
            y_proba = proba[:, 1]
        cv_mean = np.nan
        cv_std = np.nan
    else:
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
        y_proba = model.predict_proba(X_test_scaled)[:, 1]

        cv_scores = cross_val_score(
            model, X_train_scaled, y_train,
            cv=cv, scoring="roc_auc"
        )
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()

    acc, prec, rec, f1, auc = compute_metrics(y_test, y_pred, y_proba)

    results.append({
        "Model": name,
        "Accuracy": acc,
        "Precision": prec,
        "Recall": rec,
        "F1-score": f1,
        "ROC-AUC (test)": auc,
        "CV ROC-AUC (mean)": cv_mean,
        "CV ROC-AUC (std)": cv_std
    })

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    roc_curves[name] = (fpr, tpr)

print("\nModels added to results:", [r["Model"] for r in results])


results_df = pd.DataFrame(results)
results_df = results_df.sort_values(by="ROC-AUC (test)", ascending=False).reset_index(drop=True)

print("\n=== Model Comparison (sorted by test ROC-AUC) ===")
print(results_df, "\n")

# Save results to CSV for easy viewing
results_df.to_csv("model_comparison_results.csv", index=False)
print("Results saved to model_comparison_results.csv")


best_model_name = results_df.loc[0, "Model"]
best_model_metrics = results_df.loc[0]
print(f"\n{'='*60}")
print(f"BEST MODEL: {best_model_name}")
print(f"{'='*60}")
print(f"Accuracy: {best_model_metrics['Accuracy']:.4f}")
print(f"Precision: {best_model_metrics['Precision']:.4f}")
print(f"Recall: {best_model_metrics['Recall']:.4f}")
print(f"F1-Score: {best_model_metrics['F1-score']:.4f}")
print(f"ROC-AUC (test): {best_model_metrics['ROC-AUC (test)']:.4f}")
print(f"{'='*60}\n")

if best_model_name == "TabTransformer":
    y_pred_best = np.array(models["TabTransformer"].predict(X_test.values)).ravel()
else:
    y_pred_best = models[best_model_name].predict(X_test_scaled)

cm = confusion_matrix(y_test, y_pred_best)

plt.figure(figsize=(4.5, 4))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
plt.title(f"Confusion Matrix – {best_model_name}")
plt.xlabel("Predicted label")
plt.ylabel("True label")
plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=150, bbox_inches='tight')
plt.close()

print("\nClassification report for best model:")
print(classification_report(y_test, y_pred_best, digits=3))

if best_model_name == "TabTransformer":
    best_model = models["TabTransformer"]
    joblib.dump(best_model, "final_best_model.pkl")
    print(f"\n✓ Best model ({best_model_name}) saved to 'final_best_model.pkl'")
    print("  Note: TabTransformer doesn't require a scaler")
else:
    best_model = models[best_model_name]
    joblib.dump(best_model, "final_best_model.pkl")
    joblib.dump(scaler, "scaler.pkl")
    print(f"\n✓ Best model ({best_model_name}) saved to 'final_best_model.pkl'")
    print("✓ Scaler saved to 'scaler.pkl'")

# ============================================================
# 12b. DEPLOY BEST MODEL TO WEB APP
# ============================================================

WEB_APP_ARTIFACTS = Path(__file__).parent.parent / "Diabetes-Predictor-Capstone-App-main" / "backend" / "artifacts"

if WEB_APP_ARTIFACTS.parent.exists():
    WEB_APP_ARTIFACTS.mkdir(parents=True, exist_ok=True)
    
    shutil.copy2("final_best_model.pkl", WEB_APP_ARTIFACTS / "model.pkl")
    print(f"✓ Deployed model to: {WEB_APP_ARTIFACTS / 'model.pkl'}")
    
    if best_model_name != "TabTransformer":
        shutil.copy2("scaler.pkl", WEB_APP_ARTIFACTS / "scaler.pkl")
        print(f"✓ Deployed scaler to: {WEB_APP_ARTIFACTS / 'scaler.pkl'}")
    
    metrics = {
        "model": best_model_name,
        "accuracy": float(best_model_metrics['Accuracy']),
        "precision": float(best_model_metrics['Precision']),
        "recall": float(best_model_metrics['Recall']),
        "f1": float(best_model_metrics['F1-score']),
        "roc_auc": float(best_model_metrics['ROC-AUC (test)'])
    }
    
    with open(WEB_APP_ARTIFACTS / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"✓ Deployed metrics to: {WEB_APP_ARTIFACTS / 'metrics.json'}")
    print(f"\n✅ Web app now uses the best model: {best_model_name} (ROC-AUC: {best_model_metrics['ROC-AUC (test)']:.4f})")
else:
    print(f"\n⚠ Warning: Web app artifacts directory not found at {WEB_APP_ARTIFACTS}")
    print("  Model saved locally but not deployed to web app.")


plt.figure(figsize=(8, 6))

for name, (fpr, tpr) in roc_curves.items():
    plt.plot(fpr, tpr, label=name)

plt.plot([0, 1], [0, 1], "k--", label="Random (AUC = 0.5)")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve Comparison – Classical vs Transformer")
plt.legend(loc="lower right")
plt.tight_layout()
plt.savefig("roc_curves.png", dpi=150, bbox_inches='tight')
plt.close()
