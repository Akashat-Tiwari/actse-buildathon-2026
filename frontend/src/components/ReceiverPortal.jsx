import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Smartphone, ShieldAlert, CheckCircle2, RefreshCw, Fingerprint, 
  UserCheck, AlertTriangle, ArrowLeft, Send, Lock, Unlock, Layers 
} from 'lucide-react';
import apiService from '../services/api';
import AuditTrail from './AuditTrail';

export default function ReceiverPortal() {
  const { txId } = useParams();
  const navigate = useNavigate();

  const [inputTxId, setInputTxId] = useState(txId || '');
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Verification Form Data
  const [method, setMethod] = useState('BIOMETRIC_VIDEO_KYC');
  const [verifiedBy, setVerifiedBy] = useState('RECEIVER_MOBILE_AUTH');
  const [notes, setNotes] = useState('Real-time biometric match + GPS geolocation confirmed');

  // Load transaction details
  const fetchTx = async (idToFetch) => {
    const id = idToFetch || inputTxId;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getTransaction(id.trim());
      setTransaction(data);
    } catch (err) {
      console.error('Fetch transaction failed:', err);
      setError(err.response?.data?.detail || `Transaction '${id}' not found.`);
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  };

  // Find latest hold transaction if none specified
  const findHoldTransaction = async () => {
    setLoading(true);
    setError(null);
    try {
      const txs = await apiService.listTransactions(50);
      const holdTx = txs.find(t => t.state === 'CONTROLLED_HOLD' || t.state === 'RECEIVER_VERIFIED');
      if (holdTx) {
        setInputTxId(holdTx.transaction_id);
        setTransaction(holdTx);
      } else if (txs.length > 0) {
        setInputTxId(txs[0].transaction_id);
        setTransaction(txs[0]);
      } else {
        setError('No transactions found in system. Please initiate one first.');
      }
    } catch (err) {
      setError('Failed to query transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (txId) {
      setInputTxId(txId);
      fetchTx(txId);
    } else {
      findHoldTransaction();
    }
  }, [txId]);

  // Execute Biometric Verification
  const handleVerifyReceiver = async () => {
    if (!transaction) return;
    setVerifying(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        verification_method: method,
        verified_by: verifiedBy,
        notes: notes
      };
      const updated = await apiService.verifyReceiver(transaction.transaction_id, payload);
      setTransaction(updated);
      setSuccessMsg('Biometric verification successful! Counterparty status confirmed.');
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.response?.data?.detail || 'Verification rejected by ACTSE state machine.');
    } finally {
      setVerifying(false);
    }
  };

  // Execute Final Settlement
  const handleFinalSettle = async () => {
    if (!transaction) return;
    setSettling(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiService.finalSettle(transaction.transaction_id, 'Receiver_Verified_Compliance_Settlement');
      setTransaction(updated);
      setSuccessMsg('Transaction successfully settled and committed to immutable ledger.');
    } catch (err) {
      console.error('Final settle failed:', err);
      setError(err.response?.data?.detail || 'Settlement failed.');
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-2 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sender Simulator
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Smartphone className="h-7 w-7 text-cyan-400" />
            Counterparty Receiver Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulated mobile authentication client for high-risk friction step-ups and biometric verification.
          </p>
        </div>

        {/* Transaction Lookup Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="ACTSE_XXXXXXXXXX"
            value={inputTxId}
            onChange={(e) => setInputTxId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            onClick={() => fetchTx()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow transition-all"
          >
            Load
          </button>
          <button
            onClick={findHoldTransaction}
            title="Auto-load latest hold transaction"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Mobile Frame Simulator Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left: Mobile Mockup Frame (5 cols) */}
        <div className="md:col-span-6 flex justify-center">
          <div className="w-full max-w-sm bg-slate-900 border-4 border-slate-700 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden ring-1 ring-slate-800">
            
            {/* Phone Speaker Notch */}
            <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
            </div>

            {/* Mobile Screen Content */}
            <div className="bg-slate-950 rounded-[1.8rem] p-5 border border-slate-800/80 space-y-5 text-slate-100">
              
              {/* App Status Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                  <span className="font-bold text-[11px] text-slate-300">ACTSE Authenticator</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">SECURE_CHANNEL</span>
              </div>

              {transaction ? (
                <>
                  {/* Incoming Transfer Card */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Incoming Transfer Request
                    </span>
                    <div className="text-3xl font-extrabold text-white font-mono">
                      ${transaction.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">
                      From: <span className="font-mono text-slate-200">{transaction.sender_id || 'ACC_USER'}</span>
                    </div>
                    
                    {/* Status Pill */}
                    <div className="pt-2">
                      {transaction.state === 'CONTROLLED_HOLD' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono">
                          <Lock className="w-3.5 h-3.5" />
                          CONTROLLED HOLD
                        </div>
                      )}
                      {transaction.state === 'RECEIVER_VERIFIED' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono">
                          <Unlock className="w-3.5 h-3.5" />
                          RECEIVER VERIFIED
                        </div>
                      )}
                      {transaction.state === 'FINAL_SETTLED' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          FINAL SETTLED
                        </div>
                      )}
                    </div>
                  </div>

                  {/* High Risk Alert Details */}
                  {transaction.state === 'CONTROLLED_HOLD' && (
                    <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 space-y-2 text-xs text-rose-200">
                      <div className="flex items-center gap-2 font-bold text-rose-300">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>Security Quarantine Triggered</span>
                      </div>
                      <p className="text-[11px] text-rose-300/80 leading-tight">
                        Our ML risk model identified high-risk payment vectors (Risk Score: {transaction.risk_evaluation.risk_score}). Biometric identity proof is required before release.
                      </p>
                    </div>
                  )}

                  {/* Verification Action Buttons */}
                  {transaction.state === 'CONTROLLED_HOLD' && (
                    <div className="space-y-3">
                      <button
                        onClick={handleVerifyReceiver}
                        disabled={verifying}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {verifying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Simulating Facial Scan...</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-4 h-4" />
                            <span>Simulate Biometric Verification</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-center text-slate-500">
                        Simulates face match + liveness telemetry sent to ACTSE
                      </p>
                    </div>
                  )}

                  {/* Final Settle Step after Verification */}
                  {transaction.state === 'RECEIVER_VERIFIED' && (
                    <div className="space-y-3">
                      <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-3.5 text-xs text-cyan-200">
                        <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
                          <UserCheck className="w-4 h-4" />
                          <span>Identity Authenticated</span>
                        </div>
                        <p className="text-[11px] text-cyan-300/80">
                          State transitioned to <strong>RECEIVER_VERIFIED</strong>. You may now commit final ledger settlement.
                        </p>
                      </div>

                      <button
                        onClick={handleFinalSettle}
                        disabled={settling}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {settling ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Committing Ledger State...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Execute Final Settlement</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {transaction.state === 'FINAL_SETTLED' && (
                    <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-4 text-center space-y-2 text-emerald-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="font-bold text-sm">Settlement Complete</div>
                      <p className="text-[11px] text-emerald-300/80">
                        Funds credited to recipient ledger account. State is terminal.
                      </p>
                    </div>
                  )}

                </>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <Smartphone className="w-8 h-8 mx-auto text-slate-700" />
                  <p>No transaction loaded</p>
                </div>
              )}

              {/* Status messages */}
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

            </div>

            {/* Bottom Bar indicator */}
            <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-4"></div>
          </div>
        </div>

        {/* Right: Technical Inspector & State Audit Trail (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          
          {transaction ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  State Machine Lifecycle Telemetry
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Target ID: <strong className="text-emerald-400">{transaction.transaction_id}</strong>
                </span>
              </div>

              {/* Live Status Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-semibold block mb-1 uppercase text-[10px]">Risk Tier</span>
                  <span className="font-bold text-white font-mono">{transaction.risk_tier}</span>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-semibold block mb-1 uppercase text-[10px]">Current State</span>
                  <span className="font-bold text-cyan-400 font-mono">{transaction.state}</span>
                </div>
              </div>

              {/* Step-Up Verification Settings */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Verification Parameters
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Verification Method</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      disabled={transaction.state !== 'CONTROLLED_HOLD'}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="BIOMETRIC_VIDEO_KYC">BIOMETRIC_VIDEO_KYC (Liveness Facial Match)</option>
                      <option value="HARDWARE_KEY_FIDO2">HARDWARE_KEY_FIDO2 (WebAuthn YubiKey)</option>
                      <option value="COMPLIANCE_OPERATOR_OVERRIDE">COMPLIANCE_OPERATOR_OVERRIDE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Compliance Notes</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={transaction.state !== 'CONTROLLED_HOLD'}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Full Audit History
                </h4>
                <AuditTrail auditTrail={transaction.audit_trail} />
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Load a transaction to view real-time state telemetry.
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
