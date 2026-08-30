import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SenderDashboard from './components/SenderDashboard';
import ReceiverPortal from './components/ReceiverPortal';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<SenderDashboard />} />
            <Route path="/receiver" element={<ReceiverPortal />} />
            <Route path="/receiver/:txId" element={<ReceiverPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-600 font-mono">
          ACTSE • Adaptive Controlled Transaction Settlement Engine • High-Throughput Risk Automation
        </footer>
      </div>
    </BrowserRouter>
  );
}
