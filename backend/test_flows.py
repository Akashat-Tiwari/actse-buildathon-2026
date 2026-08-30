import os
import sys
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

def run_integration_tests():
    print("=" * 80)
    print("ACTSE Backend & State Machine: Integration Test Suite")
    print("=" * 80)
    
    with TestClient(app) as client:
        # 0. Health check
        res = client.get("/")
        print(f"\n[0. Health Check] Status: {res.status_code} | Body: {res.json()}")
        assert res.status_code == 200
        assert res.json()["models_loaded"] is True
        
        # 1. LOW RISK FLOW (Instant Settlement)
        print("\n" + "-" * 70)
        print("1. TEST CASE: LOW RISK TRANSACTION (Instant Settlement)")
        print("-" * 70)
        low_req = {
            "amount": 25.50,
            "is_new_receiver": 0,
            "is_new_device": 0,
            "hour_of_day": 14,
            "is_unusual_time": 0,
            "sender_id": "ACC_USER_101",
            "receiver_id": "ACC_MERCHANT_505",
            "metadata": {"channel": "POS_TERMINAL"}
        }
        res_low = client.post("/api/v1/transactions/initiate", json=low_req)
        print(f"Initiate Status: {res_low.status_code}")
        low_data = res_low.json()
        print(f"Transaction ID: {low_data['transaction_id']}")
        print(f"State: {low_data['state']}")
        print(f"Risk Tier: {low_data['risk_tier']}")
        print(f"Risk Score: {low_data['risk_evaluation']['risk_score']}")
        print(f"Confidence: {low_data['risk_evaluation']['confidence_scores']}")
        print(f"Risk Factors: {low_data['risk_evaluation']['risk_factors']}")
        print(f"Audit Trail Count: {len(low_data['audit_trail'])}")
        
        assert res_low.status_code == 201
        assert low_data["state"] == "LOW_RISK_SETTLED"
        assert low_data["risk_tier"] == "LOW_RISK"
        
        # 2. MEDIUM RISK FLOW (Awaiting Confirmation -> Final Settle)
        print("\n" + "-" * 70)
        print("2. TEST CASE: MEDIUM RISK TRANSACTION (Confirmation -> Settle)")
        print("-" * 70)
        med_req = {
            "amount": 85.00,
            "is_new_receiver": 1,
            "is_new_device": 1,
            "hour_of_day": 15,
            "is_unusual_time": 0,
            "sender_id": "ACC_USER_102",
            "receiver_id": "ACC_NEW_RECIPIENT_888",
            "metadata": {"channel": "WEB_PORTAL"}
        }
        res_med = client.post("/api/v1/transactions/initiate", json=med_req)
        print(f"Initiate Status: {res_med.status_code}")
        med_data = res_med.json()
        med_id = med_data["transaction_id"]
        print(f"Transaction ID: {med_id}")
        print(f"Initial State: {med_data['state']}")
        print(f"Risk Tier: {med_data['risk_tier']}")
        print(f"Risk Score: {med_data['risk_evaluation']['risk_score']}")
        print(f"Confidence: {med_data['risk_evaluation']['confidence_scores']}")
        print(f"Risk Factors: {med_data['risk_evaluation']['risk_factors']}")
        
        assert res_med.status_code == 201
        assert med_data["state"] == "AWAITING_CONFIRMATION"
        assert med_data["risk_tier"] == "MEDIUM_RISK"
        
        # Settle medium risk transaction
        res_med_settle = client.post(f"/api/v1/transactions/{med_id}/final_settle?reason=User_2FA_Confirmed")
        print(f"\nFinal Settle Status: {res_med_settle.status_code}")
        med_settled_data = res_med_settle.json()
        print(f"Updated State: {med_settled_data['state']}")
        print(f"Audit Trail:")
        for log in med_settled_data["audit_trail"]:
            print(f"  - [{log['timestamp']}] {log['from_state']} -> {log['to_state']} ({log['action']}): {log['reason']}")
            
        assert res_med_settle.status_code == 200
        assert med_settled_data["state"] == "FINAL_SETTLED"
        
        # 3. HIGH RISK / ANOMALY FLOW (Controlled Hold -> Verify Receiver -> Settle)
        print("\n" + "-" * 70)
        print("3. TEST CASE: HIGH RISK TRANSACTION (Controlled Hold -> Verify -> Settle)")
        print("-" * 70)
        high_req = {
            "amount": 9500.00,
            "is_new_receiver": 1,
            "is_new_device": 1,
            "hour_of_day": 3,
            "is_unusual_time": 1,
            "sender_id": "ACC_USER_103",
            "receiver_id": "ACC_UNKNOWN_DEST_999",
            "metadata": {"channel": "MOBILE_API", "ip_country": "UNKNOWN"}
        }
        res_high = client.post("/api/v1/transactions/initiate", json=high_req)
        print(f"Initiate Status: {res_high.status_code}")
        high_data = res_high.json()
        high_id = high_data["transaction_id"]
        print(f"Transaction ID: {high_id}")
        print(f"Initial State: {high_data['state']}")
        print(f"Risk Tier: {high_data['risk_tier']}")
        print(f"Risk Score: {high_data['risk_evaluation']['risk_score']}")
        print(f"Is Anomaly: {high_data['risk_evaluation']['is_anomaly']}")
        print(f"Confidence: {high_data['risk_evaluation']['confidence_scores']}")
        print(f"Risk Factors: {high_data['risk_evaluation']['risk_factors']}")
        
        assert res_high.status_code == 201
        assert high_data["state"] == "CONTROLLED_HOLD"
        assert high_data["risk_tier"] == "HIGH_RISK"
        
        # Step 3a: Verify Receiver
        verify_req = {
            "verification_method": "BIOMETRIC_VIDEO_KYC",
            "verified_by": "COMPLIANCE_AGENT_07",
            "notes": "Verified counterparty identity via real-time video session"
        }
        res_verify = client.post(f"/api/v1/transactions/{high_id}/verify_receiver", json=verify_req)
        print(f"\nVerify Receiver Status: {res_verify.status_code}")
        verify_data = res_verify.json()
        print(f"Updated State: {verify_data['state']}")
        assert res_verify.status_code == 200
        assert verify_data["state"] == "RECEIVER_VERIFIED"
        
        # Step 3b: Final Settle
        res_high_settle = client.post(f"/api/v1/transactions/{high_id}/final_settle?reason=Compliance_Override_Approved")
        print(f"\nFinal Settle Status: {res_high_settle.status_code}")
        high_settled_data = res_high_settle.json()
        print(f"Final State: {high_settled_data['state']}")
        print(f"Audit Trail:")
        for log in high_settled_data["audit_trail"]:
            print(f"  - [{log['timestamp']}] {log['from_state']} -> {log['to_state']} ({log['action']}): {log['reason']}")
            
        assert res_high_settle.status_code == 200
        assert high_settled_data["state"] == "FINAL_SETTLED"
        
        # 4. INVALID TRANSITION TEST
        print("\n" + "-" * 70)
        print("4. TEST CASE: STATE MACHINE TRANSITION ENFORCEMENT")
        print("-" * 70)
        res_hold = client.post("/api/v1/transactions/initiate", json=high_req)
        hold_id = res_hold.json()["transaction_id"]
        
        # Try invalid direct settle
        res_invalid = client.post(f"/api/v1/transactions/{hold_id}/final_settle")
        print(f"Direct Settle from CONTROLLED_HOLD -> Expected HTTP 400 | Actual Status: {res_invalid.status_code}")
        print(f"Error Detail: {res_invalid.json()['detail']}")
        assert res_invalid.status_code == 400
        
        # 5. GET TRANSACTION BY ID
        res_get = client.get(f"/api/v1/transactions/{high_id}")
        assert res_get.status_code == 200
        assert res_get.json()["transaction_id"] == high_id
        print(f"\n[5. GET Transaction] Status: {res_get.status_code} | State: {res_get.json()['state']}")
        
        # 6. LIST TRANSACTIONS
        res_list = client.get("/api/v1/transactions")
        assert res_list.status_code == 200
        print(f"[6. LIST Transactions] Total Count: {len(res_list.json())}")

    print("\n" + "=" * 80)
    print("ALL INTEGRATION TESTS PASSED PERFECTLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_integration_tests()
