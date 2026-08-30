import React from 'react';
import { CheckCircle, AlertTriangle, ShieldAlert, ArrowRight, Clock, UserCheck, CheckCheck } from 'lucide-react';

export default function AuditTrail({ auditTrail = [] }) {
  if (!auditTrail || auditTrail.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm italic">
        No state transition events recorded yet.
      </div>
    );
  }

  const getStateStyle = (state) => {
    switch (state) {
      case 'LOW_RISK_SETTLED':
      case 'FINAL_SETTLED':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500 ring-emerald-500/20',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'AWAITING_CONFIRMATION':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500 ring-amber-500/20',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'CONTROLLED_HOLD':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500 ring-rose-500/20',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        };
      case 'RECEIVER_VERIFIED':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          dot: 'bg-cyan-500 ring-cyan-500/20',
          icon: <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
        };
      case 'INITIATED':
      default:
        return {
          bg: 'bg-slate-700/30 text-slate-300 border-slate-700',
          dot: 'bg-slate-400 ring-slate-400/20',
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />
        };
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {auditTrail.map((entry, idx) => {
        const toStateStyle = getStateStyle(entry.to_state);
        const dateObj = new Date(entry.timestamp);
        const formattedTime = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
          : entry.timestamp;

        return (
          <div key={idx} className="relative group">
            {/* Timeline node icon */}
            <div className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border border-slate-800 bg-slate-900 ring-4 ${toStateStyle.dot.split(' ')[1]}`}>
              {toStateStyle.icon}
            </div>

            {/* Entry Box */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 transition-all duration-200 hover:border-slate-700">
              
              {/* Header: Action & Timestamp */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold font-mono tracking-wide text-slate-200 uppercase">
                    {entry.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {entry.actor || 'ACTSE_ENGINE'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {formattedTime}
                </span>
              </div>

              {/* State Transition Flow */}
              <div className="flex items-center space-x-2 my-2 text-xs">
                <span className="px-2 py-1 rounded bg-slate-800/80 text-slate-400 font-mono text-[11px]">
                  {entry.from_state}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] border ${toStateStyle.bg}`}>
                  {entry.to_state}
                </span>
              </div>

              {/* Reason / Notes */}
              {entry.reason && (
                <p className="mt-2 text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 font-mono">
                  {entry.reason}
                </p>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
}
