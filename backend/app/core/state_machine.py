from datetime import datetime, timezone
from typing import Dict, Set, List, Optional

try:
    from backend.app.schemas.transaction import TransactionState, AuditLogEntry
except ImportError:
    from app.schemas.transaction import TransactionState, AuditLogEntry

class StateMachine:
    """
    Deterministic State Machine for ACTSE Transaction Settlement Lifecycle.
    Enforces valid state transitions and maintains complete audit logging.
    """
    
    VALID_TRANSITIONS: Dict[TransactionState, Set[TransactionState]] = {
        TransactionState.INITIATED: {
            TransactionState.LOW_RISK_SETTLED,
            TransactionState.AWAITING_CONFIRMATION,
            TransactionState.CONTROLLED_HOLD,
            TransactionState.CANCELLED,
        },
        TransactionState.AWAITING_CONFIRMATION: {
            TransactionState.FINAL_SETTLED,
            TransactionState.CANCELLED,
        },
        TransactionState.CONTROLLED_HOLD: {
            TransactionState.RECEIVER_VERIFIED,
            TransactionState.CANCELLED,
        },
        TransactionState.RECEIVER_VERIFIED: {
            TransactionState.FINAL_SETTLED,
            TransactionState.CANCELLED,
        },
        TransactionState.LOW_RISK_SETTLED: set(),  # Terminal state
        TransactionState.FINAL_SETTLED: set(),     # Terminal state
        TransactionState.CANCELLED: set(),         # Terminal state
    }

    @classmethod
    def can_transition(cls, from_state: TransactionState, to_state: TransactionState) -> bool:
        """Check if transition from `from_state` to `to_state` is valid."""
        allowed = cls.VALID_TRANSITIONS.get(from_state, set())
        return to_state in allowed

    @classmethod
    def validate_transition(cls, from_state: TransactionState, to_state: TransactionState):
        """Raise ValueError if transition is invalid."""
        if not cls.can_transition(from_state, to_state):
            allowed = [s.value for s in cls.VALID_TRANSITIONS.get(from_state, set())]
            raise ValueError(
                f"Invalid state transition: Cannot move from '{from_state.value}' to '{to_state.value}'. "
                f"Allowed target states from '{from_state.value}': {allowed if allowed else 'None (Terminal state)'}"
            )

    @classmethod
    def create_audit_entry(
        cls,
        from_state: TransactionState,
        to_state: TransactionState,
        action: str,
        reason: Optional[str] = None,
        actor: str = "ACTSE_ENGINE"
    ) -> AuditLogEntry:
        """Generate structured audit trail entry."""
        return AuditLogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            from_state=from_state.value,
            to_state=to_state.value,
            action=action,
            reason=reason,
            actor=actor
        )

state_machine = StateMachine()
