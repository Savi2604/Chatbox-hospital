import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import './App.css';

// ── Simple client-side router ─────────────────────────────────────────────────
// Navigates between Patient Triage App and Admin Receptionist Dashboard
// without any external router library dependency.
function Root() {
  const [view, setView] = useState('patient'); // 'patient' | 'admin'

  if (view === 'admin') {
    return <AdminDashboard onBack={() => setView('patient')} />;
  }

  return <App onOpenAdmin={() => setView('admin')} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
