import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

try:
    from backend.app.schemas.transaction import (
        TransactionInitiateRequest,
        ReceiverVerifyRequest,
        TransactionResponse,
        TransactionState,
        AuditLogEntry
    )
    from backend.app.core.decision_engine import decision_engine
    from backend.app.core.state_machine import state_machine
    from backend.app.db.memory_db import db
except ImportError:
    from app.schemas.transaction import (
        TransactionInitiateRequest,
        ReceiverVerifyRequest,
        TransactionResponse,
        TransactionState,
        AuditLogEntry
    )
    from app.core.decision_engine import decision_engine
    from app.core.state_machine import state_machine
    from app.db.memory_db import db

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post(
    "/initiate",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Transaction & Evaluate Risk"
)
async def initiate_transaction(payload: TransactionInitiateRequest):
    """
    Score incoming payment with ML models, execute decision policy,
    initialize the ACTSE state machine, and persist the record.
    """
    # 1. Resolve timing defaults if not provided
    now_utc = datetime.now(timezone.utc)
    hour = payload.hour_of_day if payload.hour_of_day is not None else now_utc.hour
    is_unusual = payload.is_unusual_time if payload.is_unusual_time is not None else int(hour in [0, 1, 2, 3, 4, 5])
    
    # 2. Evaluate with ML Decision Engine
    assigned_tier, initial_target_state, eval_result = decision_engine.evaluate_transaction(
        amount=payload.amount,
        is_new_receiver=payload.is_new_receiver,
        is_new_device=payload.is_new_device,
        hour_of_day=hour,
        is_unusual_time=is_unusual
    )
    
    # 3. Initialize State Machine Lifecycle
    tx_id = f"ACTSE_{uuid.uuid4().hex[:10].upper()}"
    now_iso = now_utc.isoformat()
    
    # Initial audit entry (Creation)
    audit_init = state_machine.create_audit_entry(
        from_state=TransactionState.INITIATED,
        to_state=TransactionState.INITIATED,
        action="TRANSACTION_CREATED",
        reason="Transaction submitted for risk analysis and settlement routing",
        actor="CLIENT_INGESTION"
    )
    
    # Route transition entry
    try:
        state_machine.validate_transition(TransactionState.INITIATED, initial_target_state)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    audit_route = state_machine.create_audit_entry(
        from_state=TransactionState.INITIATED,
        to_state=initial_target_state,
        action="RISK_EVALUATION_ROUTING",
        reason=(
            f"Risk Score: {eval_result.risk_score} | Tier: {assigned_tier.value} | "
            f"Anomaly: {eval_result.is_anomaly} | Target: {initial_target_state.value}"
        ),
        actor="ACTSE_DECISION_ENGINE"
    )
    
    txn_record = TransactionResponse(
        transaction_id=tx_id,
        amount=payload.amount,
        is_new_receiver=payload.is_new_receiver,
        is_new_device=payload.is_new_device,
        hour_of_day=hour,
        is_unusual_time=is_unusual,
        sender_id=payload.sender_id,
        receiver_id=payload.receiver_id,
        state=initial_target_state,
        risk_tier=assigned_tier,
        risk_evaluation=eval_result,
        created_at=now_iso,
        updated_at=now_iso,
        audit_trail=[audit_init, audit_route],
        metadata=payload.metadata or {}
    )
    
    db.save(txn_record)
    return txn_record

@router.post(
    "/{tx_id}/verify_receiver",
    response_model=TransactionResponse,
    summary="Verify Counterparty / Step-Up KYC"
)
async def verify_receiver(tx_id: str, payload: ReceiverVerifyRequest):
    """
    Enforce state == CONTROLLED_HOLD and transition to RECEIVER_VERIFIED.
    """
    txn = db.get(tx_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID '{tx_id}' not found."
        )
        
    # State Machine Validation
    if txn.state != TransactionState.CONTROLLED_HOLD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot verify receiver: Transaction '{tx_id}' is in state '{txn.state.value}'. "
                f"Receiver verification is only valid when state is '{TransactionState.CONTROLLED_HOLD.value}'."
            )
        )
        
    target_state = TransactionState.RECEIVER_VERIFIED
    state_machine.validate_transition(txn.state, target_state)
    
    audit_entry = state_machine.create_audit_entry(
        from_state=txn.state,
        to_state=target_state,
        action="RECEIVER_VERIFIED",
        reason=f"Method: {payload.verification_method}. Notes: {payload.notes or 'None'}",
        actor=payload.verified_by or "SYSTEM_AUTH"
    )
    
    now_iso = datetime.now(timezone.utc).isoformat()
    txn.state = target_state
    txn.updated_at = now_iso
    txn.audit_trail.append(audit_entry)
    if payload.notes:
        txn.metadata["verification_notes"] = payload.notes
    txn.metadata["verification_method"] = payload.verification_method
    
    db.save(txn)
    return txn

@router.post(
    "/{tx_id}/final_settle",
    response_model=TransactionResponse,
    summary="Execute Final Settlement"
)
async def final_settle(tx_id: str, reason: Optional[str] = Query(None, description="Settlement authorization notes")):
    """
    Enforce state in [RECEIVER_VERIFIED, AWAITING_CONFIRMATION] and transition to FINAL_SETTLED.
    """
    txn = db.get(tx_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID '{tx_id}' not found."
        )
        
    if txn.state not in [TransactionState.RECEIVER_VERIFIED, TransactionState.AWAITING_CONFIRMATION]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot execute final settlement: Transaction '{tx_id}' is in state '{txn.state.value}'. "
                f"Settlement is only allowed from '{TransactionState.RECEIVER_VERIFIED.value}' "
                f"or '{TransactionState.AWAITING_CONFIRMATION.value}'."
            )
        )
        
    target_state = TransactionState.FINAL_SETTLED
    state_machine.validate_transition(txn.state, target_state)
    
    audit_entry = state_machine.create_audit_entry(
        from_state=txn.state,
        to_state=target_state,
        action="FINAL_SETTLEMENT_EXECUTED",
        reason=reason or "Final settlement authorized and funds committed to ledger",
        actor="SETTLEMENT_CORE"
    )
    
    now_iso = datetime.now(timezone.utc).isoformat()
    txn.state = target_state
    txn.updated_at = now_iso
    txn.audit_trail.append(audit_entry)
    
    db.save(txn)
    return txn

@router.get(
    "/{tx_id}",
    response_model=TransactionResponse,
    summary="Get Transaction by ID"
)
async def get_transaction(tx_id: str):
    """
    Retrieve full transaction state and complete audit trail.
    """
    txn = db.get(tx_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID '{tx_id}' not found."
        )
    return txn

@router.get(
    "",
    response_model=List[TransactionResponse],
    summary="List Transactions"
)
async def list_transactions(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    """
    List all transactions ordered by most recent first.
    """
    return db.list_all(limit=limit, offset=offset)
