# ACTSE Engineering Failure Log & Retrospective

> **Documenting key technical challenges, failure modes encountered, and architectural solutions implemented during the ACTSE build.**

---

## 🛑 Challenge 1: The False-Negative Risk & Friction Balance Dilemma

### The Problem
During early experimentation with supervised classification, relying solely on standard softmax probability thresholds created a severe vulnerability: **zero-day attacks with subtle feature combinations** (e.g., moderate amount transfer initiated at 03:00 AM from a brand-new device to an unfamiliar recipient) were occasionally classified as `LOW_RISK` by the supervised model due to class imbalance in standard payment distributions. In real-time payments, a false negative (settling fraud instantly) causes permanent capital loss, while excessive false positives (quarantining legitimate payments) frustrates users.

### Failure Mode Observed
```
Input: Amount=$1,250, NewReceiver=1, NewDevice=1, Hour=03:00 (Off-Hours)
Supervised Only: P(LOW) = 0.58, P(MED) = 0.38, P(HIGH) = 0.04
Output State -> LOW_RISK_SETTLED (CRITICAL ESCAPE!)
```

### The Solution: Hybrid Dual-Model Ensemble & Anomaly Gating
We architected a **dual-model evaluation pipeline** combining **XGBoost** with an **unsupervised Isolation Forest**:
1. **Unsupervised Outlier Veto**: If the Isolation Forest flags a transaction as an out-of-distribution anomaly ($is\_anomaly = true$), it overrides the supervised prediction and automatically gates the transaction into `HIGH_RISK` $\rightarrow$ `CONTROLLED_HOLD`.
2. **Continuous Calibrated Score**: We implemented a blended continuous scoring formula combining domain heuristic weights and model probabilities, ensuring safety margins at the tier boundaries.
3. **Outcome**: Zero high-risk false negatives escaped into `LOW_RISK_SETTLED` across our test holdout.

---

## 🛑 Challenge 2: Deterministic State Machine Enforcement & Illegal Skip Prevention

### The Problem
In early backend drafts, API endpoints directly modified the transaction status without validating the prior state. This created potential race conditions where a client could bypass quarantine (e.g. calling `/final_settle` on a transaction currently in `CONTROLLED_HOLD` without completing the required counterparty biometric verification).

### Failure Mode Observed
```
Transaction State: CONTROLLED_HOLD
Client Call: POST /api/v1/transactions/{id}/final_settle
Early Behavior: State transitioned to FINAL_SETTLED (Bypassing Receiver Verification!)
```

### The Solution: Explicit Transition Matrix & Rejection Layer
We implemented a strict, deterministic **State Machine (`StateMachine`)**:
1. **Explicit Whitelist of Transitions**:
   ```python
   VALID_TRANSITIONS = {
       TransactionState.INITIATED: {TransactionState.LOW_RISK_SETTLED, TransactionState.AWAITING_CONFIRMATION, TransactionState.CONTROLLED_HOLD, TransactionState.CANCELLED},
       TransactionState.AWAITING_CONFIRMATION: {TransactionState.FINAL_SETTLED, TransactionState.CANCELLED},
       TransactionState.CONTROLLED_HOLD: {TransactionState.RECEIVER_VERIFIED, TransactionState.CANCELLED}, # Direct settlement blocked!
       TransactionState.RECEIVER_VERIFIED: {TransactionState.FINAL_SETTLED, TransactionState.CANCELLED},
   }
   ```
2. **Pre-Transition Validation Hook**: Every endpoint calls `state_machine.validate_transition(current_state, target_state)` before executing mutations. Any invalid attempt raises `ValueError`, converted to `HTTP 400 Bad Request` with an exact explanation of allowed states.
3. **Structured Audit Trail**: Every legal transition generates an immutable ISO-8601 log entry detailing `from_state`, `to_state`, `action`, `actor`, and `reason`.

---

## 🛑 Challenge 3: Cross-Portal Synchronization for Counterparty Friction

### The Problem
When a transaction enters `CONTROLLED_HOLD`, the sender cannot resolve the friction on their own; the counterparty receiver must authenticate through an out-of-band mobile verification channel. Initially, passing state between the sender's dashboard and the receiver's mobile mockup required manual copy-pasting of 16-character transaction UUIDs, leading to 404 errors during demo flows.

### Failure Mode Observed
Operator initiates a $9,500 payment in the Sender Dashboard $\rightarrow$ Transaction enters `CONTROLLED_HOLD` $\rightarrow$ User switches to Receiver Portal $\rightarrow$ No active transaction loaded, causing broken demo friction experience.

### The Solution: Deep-Linked Routing & Intelligent Auto-Discovery
1. **Dynamic Deep Linking**: When the sender dashboard detects `CONTROLLED_HOLD`, it renders a direct navigation action button (`navigate('/receiver/' + tx.transaction_id)`).
2. **Auto-Discovery Query**: In the `ReceiverPortal` component, if no ID is passed in the URL parameters, the client automatically queries `/api/v1/transactions` to discover and pre-fill the most recent active `CONTROLLED_HOLD` or `RECEIVER_VERIFIED` transaction.
3. **Biometric Simulator Controls**: Added interactive biometric facial scan and hardware token simulation with real-time feedback, enabling a complete, seamless 3-step quarantine-to-settlement walkthrough.

---

## 🏆 Key Takeaways & Architectural Principles

1. **Defense-in-Depth AI**: Unsupervised anomaly detection is essential alongside supervised classifiers for financial fraud prevention.
2. **State Machines are Non-Negotiable**: State transitions in financial systems must be enforced by invariant code, not left to client-side logic.
3. **Friction is a UX Feature**: Contextual, graduated friction builds trust when users understand *why* a transaction is paused through transparent explainability factors.
