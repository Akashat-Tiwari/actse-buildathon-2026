import os
import numpy as np
import pandas as pd

def generate_synthetic_transactions(num_samples: int = 5000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic payment transactions with risk features and heuristic risk scores.
    """
    np.random.seed(random_seed)
    
    # 1. Transaction IDs
    txn_ids = [f"TXN_{i+1:06d}" for i in range(num_samples)]
    
    # 2. Transaction Amounts (log-normal distribution with mix of typical and high-value payments)
    # Median around $80-$150, long tail up to $15,000+
    amounts = np.random.lognormal(mean=4.5, sigma=1.2, size=num_samples)
    amounts = np.clip(amounts, a_min=1.0, a_max=25000.0)
    amounts = np.round(amounts, 2)
    
    # 3. Behavioral and Contextual Features
    # is_new_receiver: ~25% chance
    is_new_receiver = np.random.binomial(n=1, p=0.25, size=num_samples)
    
    # is_new_device: ~18% chance
    is_new_device = np.random.binomial(n=1, p=0.18, size=num_samples)
    
    # hour_of_day: weighted towards daytime/evening (0-23)
    # Peak hours around 12:00-20:00, trough around 02:00-05:00
    hour_probs = np.array([
        0.015, 0.010, 0.008, 0.005, 0.007, 0.015,  # 00-05
        0.030, 0.045, 0.060, 0.065, 0.070, 0.070,  # 06-11
        0.075, 0.075, 0.070, 0.065, 0.070, 0.075,  # 12-17
        0.070, 0.060, 0.050, 0.040, 0.030, 0.020   # 18-23
    ])
    hour_probs = hour_probs / hour_probs.sum()
    hour_of_day = np.random.choice(np.arange(24), size=num_samples, p=hour_probs)
    
    # is_unusual_time: 1 if between 00:00 and 05:00 inclusive, else 0
    is_unusual_time = np.isin(hour_of_day, [0, 1, 2, 3, 4, 5]).astype(int)
    
    # 4. Calculate Heuristic Risk Score (0 - 100)
    # Baseline normal operational risk: base ~ 5-15 points
    base_score = np.random.normal(loc=12.0, scale=4.0, size=num_samples)
    
    # Amount contribution (scaled non-linearly: high values contribute significantly)
    amount_risk = np.where(
        amounts > 5000, 35.0,
        np.where(
            amounts > 2000, 22.0,
            np.where(
                amounts > 800, 12.0,
                np.where(amounts > 250, 5.0, 0.0)
            )
        )
    )
    
    # Flag contributions
    receiver_risk = is_new_receiver * 22.0
    device_risk = is_new_device * 24.0
    time_risk = is_unusual_time * 18.0
    
    # Interaction / compounding multiplier (e.g., new device + new receiver is very risky)
    compound_risk = (is_new_device * is_new_receiver * 15.0) + (is_new_device * is_unusual_time * 10.0)
    
    # Gaussian noise for real-world fuzziness
    noise = np.random.normal(loc=0.0, scale=3.5, size=num_samples)
    
    # Total risk score clamped to [0, 100]
    total_risk_score = base_score + amount_risk + receiver_risk + device_risk + time_risk + compound_risk + noise
    risk_score = np.clip(np.round(total_risk_score, 2), 0.0, 100.0)
    
    # 5. Assign Target Risk Levels
    # LOW_RISK (<40), MEDIUM_RISK (40-74), HIGH_RISK (>=75)
    risk_level = np.where(
        risk_score < 40.0,
        "LOW_RISK",
        np.where(
            risk_score < 75.0,
            "MEDIUM_RISK",
            "HIGH_RISK"
        )
    )
    
    # Assemble DataFrame
    df = pd.DataFrame({
        "transaction_id": txn_ids,
        "amount": amounts,
        "is_new_receiver": is_new_receiver,
        "is_new_device": is_new_device,
        "hour_of_day": hour_of_day,
        "is_unusual_time": is_unusual_time,
        "risk_score": risk_score,
        "risk_level": risk_level
    })
    
    return df

def main():
    output_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "actse_transactions.csv")
    
    print("=" * 60)
    print("ACTSE: Generating Synthetic Transaction Data")
    print("=" * 60)
    
    df = generate_synthetic_transactions(num_samples=5000, random_seed=42)
    df.to_csv(output_path, index=False)
    
    print(f"Successfully generated {len(df):,} transactions.")
    print(f"Saved dataset to: {output_path}\n")
    
    print("--- Distribution of Risk Levels ---")
    counts = df["risk_level"].value_counts()
    percentages = df["risk_level"].value_counts(normalize=True) * 100
    summary = pd.DataFrame({"Count": counts, "Percentage (%)": percentages.round(2)})
    print(summary.to_string())
    
    print("\n--- Sample Records ---")
    print(df.head(5).to_string(index=False))
    print("=" * 60)

if __name__ == "__main__":
    main()
