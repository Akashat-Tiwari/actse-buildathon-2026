import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List

class MLModelService:
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            # Default to ../../../ml_research/models relative to this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
            self.models_dir = os.path.join(project_root, "ml_research", "models")
        else:
            self.models_dir = models_dir
            
        self.risk_classifier = None
        self.anomaly_detector = None
        self.feature_names = [
            "amount",
            "is_new_receiver",
            "is_new_device",
            "hour_of_day",
            "is_unusual_time"
        ]
        self.class_mapping = {
            0: "LOW_RISK",
            1: "MEDIUM_RISK",
            2: "HIGH_RISK"
        }

    def load_models(self):
        """Load serialized models from disk into memory."""
        classifier_path = os.path.join(self.models_dir, "risk_classifier.pkl")
        anomaly_path = os.path.join(self.models_dir, "anomaly_detector.pkl")
        
        if not os.path.exists(classifier_path):
            raise FileNotFoundError(f"Risk classifier model not found at: {classifier_path}")
        if not os.path.exists(anomaly_path):
            raise FileNotFoundError(f"Anomaly detector model not found at: {anomaly_path}")
            
        print(f"[MLModelService] Loading XGBoost Classifier from {classifier_path}...")
        self.risk_classifier = joblib.load(classifier_path)
        
        print(f"[MLModelService] Loading Isolation Forest Detector from {anomaly_path}...")
        self.anomaly_detector = joblib.load(anomaly_path)
        print("[MLModelService] All ML models loaded successfully.")

    def is_loaded(self) -> bool:
        return self.risk_classifier is not None and self.anomaly_detector is not None

    def predict_risk(
        self,
        amount: float,
        is_new_receiver: int,
        is_new_device: int,
        hour_of_day: int,
        is_unusual_time: int
    ) -> Dict[str, Any]:
        """
        Execute risk classification and anomaly detection on transaction features.
        """
        if not self.is_loaded():
            self.load_models()

        # Build feature DataFrame with exact column names expected by models
        input_data = pd.DataFrame([{
            "amount": float(amount),
            "is_new_receiver": int(is_new_receiver),
            "is_new_device": int(is_new_device),
            "hour_of_day": int(hour_of_day),
            "is_unusual_time": int(is_unusual_time)
        }], columns=self.feature_names)

        # 1. XGBoost Classification Probabilities
        proba = self.risk_classifier.predict_proba(input_data)[0]
        prob_dict = {
            "LOW_RISK": float(round(proba[0], 4)),
            "MEDIUM_RISK": float(round(proba[1], 4)),
            "HIGH_RISK": float(round(proba[2], 4))
        }
        pred_class_idx = int(np.argmax(proba))
        predicted_tier = self.class_mapping[pred_class_idx]

        # 2. Isolation Forest Anomaly Detection
        # predict() returns -1 for anomaly, 1 for inlier
        iso_pred = self.anomaly_detector.predict(input_data)[0]
        is_anomaly = bool(iso_pred == -1)
        
        # 3. Calculate continuous risk score (0-100) calibrated with model predictions & heuristic factors
        base_calc = 12.0
        if amount > 5000:
            base_calc += 35.0
        elif amount > 2000:
            base_calc += 22.0
        elif amount > 800:
            base_calc += 12.0
        elif amount > 250:
            base_calc += 5.0

        base_calc += (is_new_receiver * 22.0)
        base_calc += (is_new_device * 24.0)
        base_calc += (is_unusual_time * 18.0)
        base_calc += (is_new_device * is_new_receiver * 15.0) + (is_new_device * is_unusual_time * 10.0)

        ml_expected_score = (
            (prob_dict["LOW_RISK"] * 18.0) +
            (prob_dict["MEDIUM_RISK"] * 58.0) +
            (prob_dict["HIGH_RISK"] * 88.0)
        )
        
        blended_score = (0.50 * base_calc) + (0.50 * ml_expected_score)
        
        if is_anomaly:
            blended_score = max(blended_score, 78.0)
            
        calculated_risk_score = float(round(np.clip(blended_score, 0.0, 100.0), 2))

        # 4. Generate Explainability Factors
        risk_factors: List[str] = []
        if is_new_device:
            risk_factors.append("Unrecognized client device detected (High Weight)")
        if is_new_receiver:
            risk_factors.append("First-time transaction to new counterparty (Medium-High Weight)")
        if is_unusual_time or hour_of_day in [0, 1, 2, 3, 4, 5]:
            risk_factors.append(f"Off-hours transaction initiated at {hour_of_day:02d}:00")
        if amount >= 5000:
            risk_factors.append(f"High-value settlement amount: ${amount:,.2f}")
        elif amount >= 1000:
            risk_factors.append(f"Elevated settlement amount: ${amount:,.2f}")
        if is_anomaly:
            risk_factors.append("Out-of-distribution anomaly detected by Isolation Forest")
        if not risk_factors:
            risk_factors.append("Standard transaction profile with known parameters")

        return {
            "predicted_risk_level": predicted_tier,
            "risk_score": calculated_risk_score,
            "is_anomaly": is_anomaly,
            "confidence_scores": prob_dict,
            "risk_factors": risk_factors
        }

# Global singleton instance
ml_service = MLModelService()
