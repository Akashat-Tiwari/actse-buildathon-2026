import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.ensemble import IsolationForest
import xgboost as xgb

def load_data(data_path: str) -> pd.DataFrame:
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data file not found at: {data_path}. Please run synthetic_gen.py first.")
    df = pd.read_csv(data_path)
    return df

def train_risk_classifier(df: pd.DataFrame, feature_cols: list, target_col: str):
    """
    Train an XGBoost multiclass classifier to predict transaction risk tier.
    """
    label_mapping = {
        "LOW_RISK": 0,
        "MEDIUM_RISK": 1,
        "HIGH_RISK": 2
    }
    inverse_mapping = {v: k for k, v in label_mapping.items()}
    
    X = df[feature_cols]
    y = df[target_col].map(label_mapping)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print("\n" + "=" * 60)
    print("1. Training Supervised XGBoost Risk Classifier")
    print("=" * 60)
    print(f"Training set size: {len(X_train)} | Test set size: {len(X_test)}")
    
    model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        eval_metric="mlogloss"
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    target_names = [inverse_mapping[i] for i in range(3)]
    
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=target_names, digits=4, output_dict=True)
    report_text = classification_report(y_test, y_pred, target_names=target_names, digits=4)
    
    print("\n--- Model Evaluation (Test Set) ---")
    print(f"Overall Accuracy: {acc * 100:.2f}%\n")
    print(report_text)
    
    print("--- Confusion Matrix ---")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=[f"Actual {n}" for n in target_names], columns=[f"Pred {n}" for n in target_names])
    print(cm_df.to_string())
    
    print("\n--- Feature Importances ---")
    importances = pd.Series(model.feature_importances_, index=feature_cols).sort_values(ascending=False)
    for feat, imp in importances.items():
        print(f"  {feat:20s}: {imp:.4f}")
        
    classifier_payload = {
        "model": model,
        "feature_cols": feature_cols,
        "label_mapping": label_mapping,
        "inverse_mapping": inverse_mapping,
        "metrics": report
    }
    
    return classifier_payload

def train_anomaly_detector(df: pd.DataFrame, feature_cols: list):
    """
    Train an Isolation Forest model to detect anomalous transactions.
    """
    print("\n" + "=" * 60)
    print("2. Training Unsupervised Isolation Forest Anomaly Detector")
    print("=" * 60)
    
    X = df[feature_cols]
    
    # Contamination set to ~6% expected anomalous behavior
    iso_forest = IsolationForest(
        n_estimators=150,
        contamination=0.06,
        random_state=42,
        n_jobs=-1
    )
    
    iso_forest.fit(X)
    
    # Predict anomalies: -1 = Anomaly, 1 = Normal
    preds = iso_forest.predict(X)
    anomaly_flags = np.where(preds == -1, 1, 0)
    
    df_eval = df.copy()
    df_eval["is_anomaly"] = anomaly_flags
    
    anomaly_count = np.sum(anomaly_flags)
    anomaly_pct = (anomaly_count / len(df)) * 100
    
    print(f"Detected Anomalies: {anomaly_count:,} out of {len(df):,} transactions ({anomaly_pct:.2f}%)")
    
    print("\n--- Anomaly Cross-Tabulation with Heuristic Risk Level ---")
    ct = pd.crosstab(df_eval["risk_level"], df_eval["is_anomaly"], rownames=["Risk Level"], colnames=["Is Anomaly (1=Yes)"], margins=True)
    print(ct.to_string())
    
    anomaly_payload = {
        "model": iso_forest,
        "feature_cols": feature_cols,
        "contamination": 0.06
    }
    
    return anomaly_payload

def main():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "data", "actse_transactions.csv")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    feature_cols = [
        "amount",
        "is_new_receiver",
        "is_new_device",
        "hour_of_day",
        "is_unusual_time"
    ]
    target_col = "risk_level"
    
    # 1. Load Data
    df = load_data(data_path)
    print(f"Loaded {len(df):,} transactions from {data_path}")
    
    # 2. Train XGBoost Classifier
    classifier_data = train_risk_classifier(df, feature_cols, target_col)
    classifier_path = os.path.join(models_dir, "risk_classifier.pkl")
    joblib.dump(classifier_data["model"], classifier_path)
    print(f"\nSaved XGBoost Risk Classifier to: {classifier_path}")
    
    # 3. Train Isolation Forest Anomaly Detector
    anomaly_data = train_anomaly_detector(df, feature_cols)
    anomaly_path = os.path.join(models_dir, "anomaly_detector.pkl")
    joblib.dump(anomaly_data["model"], anomaly_path)
    print(f"Saved Isolation Forest Anomaly Detector to: {anomaly_path}")
    
    print("\n" + "=" * 60)
    print("Training pipeline successfully completed.")
    print("=" * 60)

if __name__ == "__main__":
    main()
