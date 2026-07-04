import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import './App.css';

// ── Simple client-side router ─────────────────────────────────────────────────
function Root() {
  const [view, setView] = useState('patient'); // 'patient' | 'admin' | 'split'

  // ── Split Screen View ──────────────────────────────────────────────────────
  if (view === 'split') {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Split control bar at top */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'rgba(3,7,18,0.97)',
          borderBottom: '1px solid rgba(20,184,166,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
          padding: '0.4rem 1rem', height: '42px'
        }}>
          <span style={{ color: '#14b8a6', fontWeight: 700, fontSize: '0.82rem', letterSpacing: 1 }}>
            ⚡ SPLIT SCREEN MODE
          </span>
          <span style={{ color: '#334155', fontSize: '0.75rem' }}>
            Patient Portal ← | → Receptionist Dashboard
          </span>
          <button onClick={() => setView('patient')} style={{
            background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)',
            color: '#14b8a6', padding: '0.2rem 0.75rem', borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
          }}>✕ Exit Split</button>
        </div>

        {/* Left pane — Patient Portal */}
        <div style={{
          width: '50%', height: '100vh', overflowY: 'auto',
          borderRight: '2px solid rgba(20,184,166,0.25)',
          paddingTop: '42px', boxSizing: 'border-box'
        }}>
          <App onOpenAdmin={() => setView('admin')} />
        </div>

        {/* Right pane — Admin Dashboard */}
        <div style={{
          width: '50%', height: '100vh', overflowY: 'auto',
          paddingTop: '42px', boxSizing: 'border-box'
        }}>
          <AdminDashboard onBack={() => setView('patient')} />
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return <AdminDashboard onBack={() => setView('patient')} />;
  }

  return <App onOpenAdmin={() => setView('admin')} onSplitScreen={() => setView('split')} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
