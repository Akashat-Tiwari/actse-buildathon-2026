# ACTSE: Engineering Retrospective & Failure Log

> A look back at the actual roadblocks I hit while building this engine, the trade-offs I had to weigh, and how I ultimately solved them.

---

## Challenge 1: The Security vs. Friction Nightmare

### The Problem
When I first started tightening the security rules to prevent fraudulent transactions, I ran into a massive UX problem: I accidentally ruined the user experience. 

In my attempt to make the system bulletproof, the engine started treating every transaction with maximum suspicion. A user trying to send a $15 routine payment was getting hit with the exact same heavy verification barriers as someone trying to wire $45,000 to an unrecognized device at 3 AM. By maximizing security, I maximized friction. If this were a real banking app, users would delete it on day one.

### The Solution: Dynamic Security Routing
I realized that security couldn't be a monolith; it had to scale proportionally with the AI's confidence. I ripped out the static verification barrier and engineered a **Dynamic Friction Engine**:
1. **Low Risk (< 40):** Auto-clears. The UI swaps to a "Standard Clearance" state and skips manual verification entirely.
2. **Medium Risk (40 - 74):** Introduces a standard "Step-Up Authentication" (like a simple OTP). It's a minor speedbump, but easily cleared by a legitimate user.
3. **High Risk (75+ or Anomaly):** Triggers a full "Security Lockdown." This puts the transaction into a hard quarantine requiring an Admin Override or biometric counterparty verification. 

By making the security dynamic, I kept the system mathematically secure without punishing normal users.

---

## Challenge 2: The UI Bypass Vulnerability

### The Problem
During early integration testing, I noticed something terrifying. I had built this beautiful control node in React that forced users to wait during a `CONTROLLED_HOLD`. But when I opened Postman and manually fired a `POST /final_settle` request to the backend, the transaction settled immediately. 

The security was entirely on the frontend. The React UI was doing its job, but the Python backend was just blindly accepting the settlement command regardless of the transaction's current state.

### The Solution: A Deterministic Backend State Machine
I had to completely lock down the backend API. I implemented a strict state transition matrix in FastAPI. Now, the backend explicitly checks the state before doing anything:
* You cannot move from `INITIATED` to `FINAL_SETTLED` if the AI flagged it as High Risk.
* The API will throw an immediate `HTTP 400 Bad Request` if you try to settle a transaction that isn't in a `VERIFIED` state.
The lesson here was clear: UI friction is for user experience; backend state machines are for actual security.

---

## Challenge 3: Frontend-Backend Schema Disconnects

### The Problem
When I finally hooked the React frontend up to the FastAPI backend, the app kept crashing or rendering blank boxes. 

I spent hours debugging before realizing the issue: my React states were looking for flat JSON variables like `prediction.risk_level` and `prediction.risk_score`. However, the Python backend was returning deeply nested objects—specifically, the score was buried inside `risk_evaluation.risk_score`, and the tier was named `risk_tier`.

### The Solution: Exact Schema Mapping
I had to refactor the React `App.jsx` state logic to perfectly mirror the backend's Pydantic/Swagger schema. This wasn't just a naming fix; it fundamentally changed how the frontend parsed data. Once the mapping was aligned, the dynamic risk badges, anomaly flags, and control nodes started reacting perfectly in real time. 

---

## Key Takeaways
1. **Friction is a tool, not a default.** If you treat every user like a fraudster, you lose your users. Dynamic security is the only way to balance safety and usability.
2. **Never trust the client.** Frontend locks are cosmetic. If the backend doesn't enforce the state machine, you don't actually have a secure application.
3. **Log your API responses during dev.** Assuming the shape of your JSON payload will break your app every single time.
