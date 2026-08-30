import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, Zap, 
  Smartphone, User, RefreshCw, Layers, CheckCircle2, FileText, Info
} from 'lucide-react';
import apiService from '../services/api';
import AuditTrail from './AuditTrail';

export default function SenderDashboard() {
  const navigate = useNavigate();

  // Form State
  const [amount, setAmount] = useState('25.00');
  const [isNewReceiver, setIsNewReceiver] = useState(0);
  const [isNewDevice, setIsNewDevice] = useState(0);
  const [hourOfDay, setHourOfDay] = useState(14);
  const [senderId, setSenderId] = useState('ACC_USER_101');
  const [receiverId, setReceiverId] = useState('ACC_MERCHANT_505');

  // Execution State
  const [loading, setLoading] = useState(false);
  const [currentTx, setCurrentTx] = useState(null);
  const [error, setError] = useState(null);
  const [recentTxs, setRecentTxs] = useState([]);

  // Auto detect unusual time from hour
  const isUnusualTime = hourOfDay >= 0 && hourOfDay <= 5 ? 1 : 0;

  // Load recent transactions on mount
  const fetchRecent = async () => {
    try {
      const data = await apiService.listTransactions(8);
      setRecentTxs(data);
    } catch (err) {
      console.error('Failed to load recent transactions:', err);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  // Quick Preset Handlers
  const applyPreset = (presetType) => {
    if (presetType === 'LOW') {
      setAmount('25.00');
      setIsNewReceiver(0);
      setIsNewDevice(0);
      setHourOfDay(14);
      setSenderId('ACC_USER_101');
      setReceiverId('ACC_MERCHANT_505');
    } else if (presetType === 'MEDIUM') {
      setAmount('85.00');
      setIsNewReceiver(1);
      setIsNewDevice(1);
      setHourOfDay(15);
      setSenderId('ACC_USER_102');
      setReceiverId('ACC_NEW_RECIPIENT_888');
    } else if (presetType === 'HIGH') {
      setAmount('9500.00');
      setIsNewReceiver(1);
      setIsNewDevice(1);
      setHourOfDay(3);
      setSenderId('ACC_USER_103');
      setReceiverId('ACC_UNKNOWN_DEST_999');
    }
  };

  // Submit Payment Initiation
  const handleInitiate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        amount: parseFloat(amount),
        is_new_receiver: parseInt(isNewReceiver, 10),
        is_new_device: parseInt(isNewDevice, 10),
        hour_of_day: parseInt(hourOfDay, 10),
        is_unusual_time: isUnusualTime,
        sender_id: senderId,
        receiver_id: receiverId,
        metadata: {
          client_app: 'ACTSE_WEB_SIMULATOR',
          submitted_at: new Date().toISOString()
        }
      };

      const result = await apiService.initiateTransaction(payload);
      setCurrentTx(result);
      fetchRecent();
    } catch (err) {
      console.error('Initiation failed:', err);
      setError(err.response?.data?.detail || 'Failed to initiate transaction. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Settle Medium Risk (Confirmation Step)
  const handleSettle = async () => {
    if (!currentTx) return;
    setLoading(true);
    try {
      const updated = await apiService.finalSettle(currentTx.transaction_id, 'User_2FA_Confirmation_Authorized');
      setCurrentTx(updated);
      fetchRecent();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to settle transaction.');
    } finally {
      setLoading(false);
    }
  };

  // Get Styling for Risk Level
  const getRiskDetails = (tier, score) => {
    if (tier === 'HIGH_RISK' || score >= 75) {
      return {
        badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        bar: 'bg-rose-500',
        glow: 'glow-rose',
        label: 'HIGH RISK (QUARANTINED)',
        icon: <ShieldAlert className="w-5 h-5 text-rose-400" />
      };
    }
    if (tier === 'MEDIUM_RISK' || (score >= 40 && score < 75)) {
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        bar: 'bg-amber-500',
        glow: 'glow-amber',
        label: 'MEDIUM RISK (STEP-UP 2FA)',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
      };
    }
    return {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      bar: 'bg-emerald-500',
      glow: 'glow-emerald',
      label: 'LOW RISK (INSTANT SETTLED)',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Zap className="h-7 w-7 text-emerald-400 fill-emerald-400/20" />
            Adaptive Settlement & Friction Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulate payment vectors, evaluate real-time ML risk inference, and observe dynamic state machine controls.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('LOW')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60 transition-all"
          >
            $25 Low Risk
          </button>
          <button
            type="button"
            onClick={() => applyPreset('MEDIUM')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60 hover:bg-amber-900/60 transition-all"
          >
            $85 Medium Risk
          </button>
          <button
            type="button"
            onClick={() => applyPreset('HIGH')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-800/60 hover:bg-rose-900/60 transition-all"
          >
            $9.5k High Risk
          </button>
        </div>
      </div>

      {/* Main Grid: Form + Realtime Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Transaction Input Form (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Payment Parameters
            </h2>
            <span className="text-xs font-mono text-slate-500">INGESTION_VECTOR</span>
          </div>

          <form onSubmit={handleInitiate} className="space-y-5">
            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Settlement Amount ($ USD)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-lg font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Counterparty & Device Status Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Receiver Toggle */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Counterparty Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isNewReceiver ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                    {isNewReceiver ? 'NEW' : 'EXISTING'}
                  </span>
                </div>
                <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewReceiver(0)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${!isNewReceiver ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400'}`}
                  >
                    Known
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewReceiver(1)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${isNewReceiver ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50 shadow-sm' : 'text-slate-400'}`}
                  >
                    New (First-time)
                  </button>
                </div>
              </div>

              {/* Device Toggle */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Client Device</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isNewDevice ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                    {isNewDevice ? 'NEW DEVICE' : 'TRUSTED'}
                  </span>
                </div>
                <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewDevice(0)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${!isNewDevice ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400'}`}
                  >
                    Trusted
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewDevice(1)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${isNewDevice ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50 shadow-sm' : 'text-slate-400'}`}
                  >
                    Unrecognized
                  </button>
                </div>
              </div>

            </div>

            {/* Hour of Day Slider */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Transaction Timestamp Hour
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 bg-slate-900 rounded border border-slate-700">
                    {String(hourOfDay).padStart(2, '0')}:00
                  </span>
                  {isUnusualTime ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                      OFF-HOURS
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      NORMAL
                    </span>
                  )}
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="23"
                value={hourOfDay}
                onChange={(e) => setHourOfDay(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>00:00 (Midnight)</span>
                <span>12:00 (Noon)</span>
                <span>23:00 (Night)</span>
              </div>
            </div>

            {/* Sender / Receiver Identifier Fields */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sender Account</label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Receiver Account</label>
                <input
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating ML Risk & State Routing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 fill-slate-950" />
                  <span>Execute Settlement Request</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Real-Time Risk Receipt & Telemetry (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {currentTx ? (
            <div className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md transition-all ${getRiskDetails(currentTx.risk_tier, currentTx.risk_evaluation.risk_score).glow}`}>
              
              {/* Receipt Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      Settlement Evaluation
                    </h3>
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800 font-bold">
                      {currentTx.transaction_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Amount: <strong className="text-white">${currentTx.amount.toFixed(2)} USD</strong> | Counterparty: <strong className="text-slate-300">{currentTx.receiver_id}</strong>
                  </p>
                </div>

                {/* State Machine Status Badge */}
                <div className="flex items-center space-x-2">
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${getRiskDetails(currentTx.risk_tier, currentTx.risk_evaluation.risk_score).badge}`}>
                    {getRiskDetails(currentTx.risk_tier, currentTx.risk_evaluation.risk_score).icon}
                    <span>{currentTx.state}</span>
                  </div>
                </div>
              </div>

              {/* Risk Score & Anomaly Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                
                {/* Risk Score Meter */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Calculated Risk Score
                  </span>
                  <div className="flex items-baseline space-x-2 my-1">
                    <span className="text-3xl font-black font-mono text-white">
                      {currentTx.risk_evaluation.risk_score.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">/ 100</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getRiskDetails(currentTx.risk_tier, currentTx.risk_evaluation.risk_score).bar}`}
                      style={{ width: `${Math.min(currentTx.risk_evaluation.risk_score, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Anomaly Detection Status */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Isolation Forest
                  </span>
                  <div className="my-1">
                    {currentTx.risk_evaluation.is_anomaly ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        ANOMALY DETECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        NORMAL DISTRIBUTION
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Unsupervised outlier check</span>
                </div>

                {/* Model Confidence Breakdown */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    XGBoost Class Probabilities
                  </span>
                  <div className="space-y-1 my-1 text-[11px] font-mono">
                    <div className="flex justify-between text-emerald-400">
                      <span>Low:</span>
                      <span>{(currentTx.risk_evaluation.confidence_scores.LOW_RISK * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Med:</span>
                      <span>{(currentTx.risk_evaluation.confidence_scores.MEDIUM_RISK * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>High:</span>
                      <span>{(currentTx.risk_evaluation.confidence_scores.HIGH_RISK * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Explainability Contributing Factors */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  Explainability & Risk Factor Attribution
                </span>
                <ul className="space-y-1.5">
                  {currentTx.risk_evaluation.risk_factors.map((factor, idx) => (
                    <li key={idx} className="text-xs text-slate-300 font-mono flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dynamic Action Controls based on State */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                
                {/* When in AWAITING_CONFIRMATION: Allow Settle */}
                {currentTx.state === 'AWAITING_CONFIRMATION' && (
                  <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-amber-300">
                      <strong>Friction Action Required:</strong> Moderate risk tier requires user 2FA confirmation before ledger commitment.
                    </div>
                    <button
                      onClick={handleSettle}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shrink-0 flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm 2FA & Settle</span>
                    </button>
                  </div>
                )}

                {/* When in CONTROLLED_HOLD: Direct to Receiver Step-Up */}
                {currentTx.state === 'CONTROLLED_HOLD' && (
                  <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-rose-300">
                      <strong>Controlled Quarantine:</strong> Transaction is locked. Counterparty biometric/KYC verification is required in the Receiver Portal.
                    </div>
                    <button
                      onClick={() => navigate(`/receiver/${currentTx.transaction_id}`)}
                      className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shrink-0 flex items-center gap-1.5 transition-all"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Open Receiver Portal</span>
                    </button>
                  </div>
                )}

                {/* When in LOW_RISK_SETTLED or FINAL_SETTLED */}
                {(currentTx.state === 'LOW_RISK_SETTLED' || currentTx.state === 'FINAL_SETTLED') && (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Transaction successfully settled and committed to the immutable ACTSE ledger.</span>
                  </div>
                )}

              </div>

              {/* State Machine Audit Trail */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Deterministic State Machine Audit Trail
                </h4>
                <AuditTrail auditTrail={currentTx.audit_trail} />
              </div>

            </div>
          ) : (
            <div className="h-full min-h-[420px] bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-300">No Transaction Active</h3>
              <p className="text-xs max-w-sm text-slate-500 leading-relaxed">
                Configure payment parameters or choose one of the quick presets on the left, then click <strong>Execute Settlement Request</strong> to run live ML scoring.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Feed: Recent Simulated Transactions */}
      {recentTxs.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Recent Settlement Feed
            </h3>
            <button
              onClick={fetchRecent}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[11px] uppercase">
                  <th className="pb-3 font-semibold">Tx ID</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Risk Score</th>
                  <th className="pb-3 font-semibold">Risk Tier</th>
                  <th className="pb-3 font-semibold">State</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {recentTxs.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-emerald-400">{tx.transaction_id}</td>
                    <td className="py-3">${tx.amount.toFixed(2)}</td>
                    <td className="py-3 font-bold">{tx.risk_evaluation.risk_score.toFixed(1)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskDetails(tx.risk_tier, tx.risk_evaluation.risk_score).badge}`}>
                        {tx.risk_tier}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                        {tx.state}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setCurrentTx(tx)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
