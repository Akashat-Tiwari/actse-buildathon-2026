from typing import Dict, Any, Tuple

try:
    from backend.app.schemas.transaction import TransactionState, RiskTier, RiskEvaluationResult
    from backend.app.ml_service.model_loader import ml_service
except ImportError:
    from app.schemas.transaction import TransactionState, RiskTier, RiskEvaluationResult
    from app.ml_service.model_loader import ml_service

class DecisionEngine:
    def __init__(self, ml_svc=None):
        self.ml_service = ml_svc or ml_service

    def evaluate_transaction(
        self,
        amount: float,
        is_new_receiver: int,
        is_new_device: int,
        hour_of_day: int,
        is_unusual_time: int
    ) -> Tuple[RiskTier, TransactionState, RiskEvaluationResult]:
        """
        Evaluate transaction features using the ML service and determine
        the applicable risk tier and initial target settlement state.
        
        Rules:
        - Risk Score < 40 and not Anomaly -> LOW_RISK -> LOW_RISK_SETTLED
        - 40 <= Risk Score < 75 and not Anomaly -> MEDIUM_RISK -> AWAITING_CONFIRMATION
        - Risk Score >= 75 OR Anomaly Flagged -> HIGH_RISK -> CONTROLLED_HOLD
        """
        pred = self.ml_service.predict_risk(
            amount=amount,
            is_new_receiver=is_new_receiver,
            is_new_device=is_new_device,
            hour_of_day=hour_of_day,
            is_unusual_time=is_unusual_time
        )
        
        risk_score = pred["risk_score"]
        is_anomaly = pred["is_anomaly"]
        
        # Policy Mapping
        if is_anomaly or risk_score >= 75.0:
            assigned_tier = RiskTier.HIGH_RISK
            initial_target_state = TransactionState.CONTROLLED_HOLD
        elif 40.0 <= risk_score < 75.0:
            assigned_tier = RiskTier.MEDIUM_RISK
            initial_target_state = TransactionState.AWAITING_CONFIRMATION
        else:
            assigned_tier = RiskTier.LOW_RISK
            initial_target_state = TransactionState.LOW_RISK_SETTLED
            
        evaluation_result = RiskEvaluationResult(
            predicted_risk_level=RiskTier(pred["predicted_risk_level"]),
            risk_score=risk_score,
            is_anomaly=is_anomaly,
            confidence_scores=pred["confidence_scores"],
            risk_factors=pred["risk_factors"]
        )
        
        return assigned_tier, initial_target_state, evaluation_result

decision_engine = DecisionEngine()
