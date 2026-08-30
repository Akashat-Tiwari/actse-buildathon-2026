from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class TransactionState(str, Enum):
    INITIATED = "INITIATED"
    LOW_RISK_SETTLED = "LOW_RISK_SETTLED"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"
    CONTROLLED_HOLD = "CONTROLLED_HOLD"
    RECEIVER_VERIFIED = "RECEIVER_VERIFIED"
    FINAL_SETTLED = "FINAL_SETTLED"
    CANCELLED = "CANCELLED"

class RiskTier(str, Enum):
    LOW_RISK = "LOW_RISK"
    MEDIUM_RISK = "MEDIUM_RISK"
    HIGH_RISK = "HIGH_RISK"

class TransactionInitiateRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Payment transaction amount in USD")
    is_new_receiver: int = Field(..., ge=0, le=1, description="1 if counterparty is new, else 0")
    is_new_device: int = Field(..., ge=0, le=1, description="1 if initiated from unrecognized device, else 0")
    hour_of_day: Optional[int] = Field(None, ge=0, le=23, description="Hour of transaction (0-23). Defaults to current hour if omitted.")
    is_unusual_time: Optional[int] = Field(None, ge=0, le=1, description="1 if transaction occurs during off-hours (00:00-05:00)")
    sender_id: Optional[str] = Field(None, description="Sender Account / Identifier")
    receiver_id: Optional[str] = Field(None, description="Receiver Account / Identifier")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context metadata")

class ReceiverVerifyRequest(BaseModel):
    verification_method: str = Field(..., description="Method used (e.g. OTP, Micro-deposit, Video KYC, Call Confirmation)")
    verified_by: Optional[str] = Field("SYSTEM_AUTH", description="User or agent identifier who completed verification")
    notes: Optional[str] = Field(None, description="Verification notes or reference tokens")

class AuditLogEntry(BaseModel):
    timestamp: str
    from_state: str
    to_state: str
    action: str
    reason: Optional[str] = None
    actor: Optional[str] = "ACTSE_ENGINE"

class RiskEvaluationResult(BaseModel):
    predicted_risk_level: RiskTier
    risk_score: float = Field(..., description="Estimated risk score (0-100)")
    is_anomaly: bool = Field(..., description="Isolation Forest anomaly flag")
    confidence_scores: Dict[str, float] = Field(..., description="Model class probabilities")
    risk_factors: List[str] = Field(default_factory=list, description="Explainability contributing factors")

class TransactionResponse(BaseModel):
    transaction_id: str
    amount: float
    is_new_receiver: int
    is_new_device: int
    hour_of_day: int
    is_unusual_time: int
    sender_id: Optional[str] = None
    receiver_id: Optional[str] = None
    state: TransactionState
    risk_tier: RiskTier
    risk_evaluation: RiskEvaluationResult
    created_at: str
    updated_at: str
    audit_trail: List[AuditLogEntry]
    metadata: Dict[str, Any] = Field(default_factory=dict)
