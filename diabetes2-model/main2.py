
import numpy as np
import pandas as pd
import json
from pathlib import Path
import shutil
import matplotlib
matplotlib.use('Agg')  #
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
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
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

# Median imputation:
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
    X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
)

print("Train/Test shapes:")
print("X_train:", X_train.shape, " X_test:", X_test.shape)
print("y_train:", y_train.shape, " y_test:", y_test.shape, "\n")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

class TabTransformerModel(nn.Module):
    """Transformer-based model for tabular data using self-attention."""
    def __init__(self, num_features, embed_dim=32, num_heads=4, num_layers=3, 
                 dim_feedforward=128, dropout=0.1, num_classes=2):
        super(TabTransformerModel, self).__init__()
        
        self.num_features = num_features
        self.embed_dim = embed_dim
        
        self.feature_embeddings = nn.ModuleList([
            nn.Linear(1, embed_dim) for _ in range(num_features)
        ])
        self.pos_encoding = nn.Parameter(torch.randn(1, num_features, embed_dim))
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        self.classifier = nn.Sequential(
            nn.Linear(embed_dim * num_features, dim_feedforward),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(dim_feedforward, dim_feedforward // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(dim_feedforward // 2, num_classes)
        )
        
    def forward(self, x):
        batch_size = x.size(0)
        embedded = torch.stack([
            self.feature_embeddings[i](x[:, i:i+1]) 
            for i in range(self.num_features)
        ], dim=1)
        embedded = embedded + self.pos_encoding
        transformer_out = self.transformer(embedded)
        flattened = transformer_out.view(batch_size, -1)
        output = self.classifier(flattened)
        return output


class TabTransformerWrapper:
    """Wrapper for sklearn-style interface."""
    def __init__(self, num_features, embed_dim=32, num_heads=4, num_layers=3,
                 dim_feedforward=128, dropout=0.1, learning_rate=1e-3,
                 batch_size=64, max_epochs=200, patience=30, random_state=42):
        self.num_features = num_features
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.num_layers = num_layers
        self.dim_feedforward = dim_feedforward
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.batch_size = batch_size
        self.max_epochs = max_epochs
        self.patience = patience
        self.random_state = random_state
        
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.scaler = None
        self.best_val_loss = float('inf')
        self.patience_counter = 0
        
    def fit(self, X, y, eval_set=None):
        torch.manual_seed(self.random_state)
        np.random.seed(self.random_state)
        
        from sklearn.preprocessing import StandardScaler
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        X_train = torch.FloatTensor(X_scaled).to(self.device)
        y_train = torch.LongTensor(y).to(self.device)
        
        if eval_set is not None:
            if isinstance(eval_set, list) and len(eval_set) > 0:
                X_val, y_val = eval_set[0]
            else:
                X_val, y_val = eval_set
            X_val_scaled = self.scaler.transform(X_val)
            X_val_tensor = torch.FloatTensor(X_val_scaled).to(self.device)
            y_val_tensor = torch.LongTensor(y_val).to(self.device)
        self.model = TabTransformerModel(
            num_features=self.num_features,
            embed_dim=self.embed_dim,
            num_heads=self.num_heads,
            num_layers=self.num_layers,
            dim_feedforward=self.dim_feedforward,
            dropout=self.dropout
        ).to(self.device)
        
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(self.model.parameters(), lr=self.learning_rate)
        scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=20, gamma=0.9)
        
        train_dataset = torch.utils.data.TensorDataset(X_train, y_train)
        train_loader = DataLoader(train_dataset, batch_size=self.batch_size, shuffle=True)
        
        for epoch in range(self.max_epochs):
            self.model.train()
            train_loss = 0.0
            
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                train_loss += loss.item()
            
            scheduler.step()
            
            if eval_set is not None:
                self.model.eval()
                with torch.no_grad():
                    val_outputs = self.model(X_val_tensor)
                    val_loss = criterion(val_outputs, y_val_tensor).item()
                    
                    if val_loss < self.best_val_loss:
                        self.best_val_loss = val_loss
                        self.patience_counter = 0
                        self.best_model_state = self.model.state_dict().copy()
                    else:
                        self.patience_counter += 1
                        if self.patience_counter >= self.patience:
                            print(f"Early stopping at epoch {epoch+1}")
                            self.model.load_state_dict(self.best_model_state)
                            break
        
        if eval_set is not None and hasattr(self, 'best_model_state'):
            self.model.load_state_dict(self.best_model_state)
    
    def predict(self, X):
        probs = self.predict_proba(X)
        return (probs[:, 1] >= 0.5).astype(int)
    
    def predict_proba(self, X):
        self.model.eval()
        X_scaled = self.scaler.transform(X)
        X_tensor = torch.FloatTensor(X_scaled).to(self.device)
        with torch.no_grad():
            outputs = self.model(X_tensor)
            probs = torch.softmax(outputs, dim=1)
            return probs.cpu().numpy()


models = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
    "SVM (RBF)": SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE),
    "Random Forest": RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE),
    "TabTransformer": TabTransformerWrapper(
        num_features=8,
        embed_dim=32,
        num_heads=4,
        num_layers=3,
        dim_feedforward=128,
        dropout=0.1,
        learning_rate=1e-3,
        batch_size=64,
        max_epochs=200,
        patience=30,
        random_state=RANDOM_STATE
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
            y_train.values,
            eval_set=[(X_test.values, y_test.values)]
        )
        y_pred = model.predict(X_test.values)
        proba = model.predict_proba(X_test.values)
        
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
    y_pred_best = models["TabTransformer"].predict(X_test.values)
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
    joblib.dump(best_model.scaler, "scaler.pkl")
    print(f"\n✓ Best model ({best_model_name}) saved to 'final_best_model.pkl'")
    print("✓ Scaler saved to 'scaler.pkl'")
else:
    best_model = models[best_model_name]
    joblib.dump(best_model, "final_best_model.pkl")
    joblib.dump(scaler, "scaler.pkl")
   

WEB_APP_ARTIFACTS = Path(__file__).parent.parent / "Diabetes-Predictor-Capstone-App-main" / "backend" / "artifacts"

if WEB_APP_ARTIFACTS.parent.exists():
    WEB_APP_ARTIFACTS.mkdir(parents=True, exist_ok=True)
    
    shutil.copy2("final_best_model.pkl", WEB_APP_ARTIFACTS / "model.pkl")
    
    shutil.copy2("scaler.pkl", WEB_APP_ARTIFACTS / "scaler.pkl")
    
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
else:
    print(f"\n⚠ Warning: Web app artifacts directory not found at {WEB_APP_ARTIFACTS}")

plt.figure(figsize=(8, 6))
for name, (fpr, tpr) in roc_curves.items():
    plt.plot(fpr, tpr, label=name)
plt.plot([0, 1], [0, 1], "k--", label="Random (AUC = 0.5)")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve Comparison – All Models")
plt.legend(loc="lower right")
plt.tight_layout()
plt.savefig("roc_curves.png", dpi=150, bbox_inches='tight')
plt.close()
