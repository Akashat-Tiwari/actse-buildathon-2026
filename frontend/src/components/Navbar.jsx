import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Activity, Smartphone, Send, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import apiService from '../services/api';

export default function Navbar() {
  const [health, setHealth] = useState({ status: 'CHECKING', models_loaded: false });

  const fetchHealth = async () => {
    const data = await apiService.checkHealth();
    setHealth(data);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health.status === 'HEALTHY' && health.models_loaded;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="h-6 w-6 text-slate-950 font-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
                  ACTSE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Engine v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Adaptive Controlled Settlement</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Send className="h-4 w-4" />
              <span>Sender Simulator</span>
            </NavLink>

            <NavLink
              to="/receiver"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Smartphone className="h-4 w-4" />
              <span>Receiver Portal</span>
            </NavLink>
          </nav>

          {/* Engine Status Pill */}
          <div className="flex items-center space-x-2.5 bg-slate-950/70 border border-slate-800 rounded-full px-3.5 py-1.5 shadow-inner">
            <div className="relative flex h-2.5 w-2.5">
              {isHealthy ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-300">ML Pipeline:</span>
              <span className={isHealthy ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                {isHealthy ? "Online" : "Disconnected"}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
