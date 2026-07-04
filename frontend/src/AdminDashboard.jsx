import { useState, useEffect, useRef } from 'react';

// ── Backend URL (same as main App) ──────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Severity Badge Component ─────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  if (severity === 'High') {
    return (
      <span className="admin-badge admin-badge--critical">
        🚨 CRITICAL OVERRIDE
      </span>
    );
  }
  if (severity === 'Medium') {
    return (
      <span className="admin-badge admin-badge--mid">
        ⚠️ MID TRIAGE
      </span>
    );
  }
  return (
    <span className="admin-badge admin-badge--standard">
      ✓ STANDARD
    </span>
  );
}

// ── ETA Display Component ────────────────────────────────────────────────────
function ETACell({ mins, severity }) {
  if (severity === 'High') return <span className="admin-eta admin-eta--urgent">⚡ Immediate</span>;
  if (mins === 0) return <span className="admin-eta admin-eta--urgent">⚡ Now</span>;
  return <span className="admin-eta">~{mins} mins</span>;
}

// ── Vitals Cell ──────────────────────────────────────────────────────────────
function VitalsCell({ pulse, spo2 }) {
  const pulseCritical = pulse && pulse > 120;
  const spo2Critical  = spo2  && spo2  < 90;
  return (
    <div className="admin-vitals">
      {pulse ? (
        <span className={`admin-vital-chip ${pulseCritical ? 'vital-critical' : ''}`}>
          💓 {pulse} BPM
        </span>
      ) : (
        <span className="admin-vital-chip vital-na">💓 —</span>
      )}
      {spo2 ? (
        <span className={`admin-vital-chip ${spo2Critical ? 'vital-critical' : ''}`}>
          🫁 {spo2}%
        </span>
      ) : (
        <span className="admin-vital-chip vital-na">🫁 —</span>
      )}
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard({ onBack }) {
  const [queue, setQueue]             = useState([]);
  const [totalActive, setTotalActive] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [pulse, setPulse]             = useState(false); // visual heartbeat indicator
  const intervalRef                   = useRef(null);
  const prevCountRef                  = useRef(0);

  // ── Fetch admin queue from backend ────────────────────────────────────────
  const fetchQueue = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/admin/queue`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      // Flash heartbeat indicator on new patient detected
      if (data.totalActive !== prevCountRef.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
        prevCountRef.current = data.totalActive;
      }

      setQueue(data.queue || []);
      setTotalActive(data.totalActive || 0);
      setLastUpdated(data.lastUpdated);
      setError('');
    } catch (err) {
      setError('⚠️ Cannot reach backend. Check your network or Render deployment.');
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-polling every 5 seconds ──────────────────────────────────────────
  useEffect(() => {
    fetchQueue(); // immediate first fetch
    intervalRef.current = setInterval(fetchQueue, 5000);
    return () => clearInterval(intervalRef.current); // cleanup on unmount
  }, []);

  // ── Critical alert count ──────────────────────────────────────────────────
  const criticalCount = queue.filter(e => e.severity === 'High').length;

  // ── Formatted timestamp ───────────────────────────────────────────────────
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="admin-root">
      {/* ── Top Navigation Bar ── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={onBack}>← Back to Patient Portal</button>
          <div className="admin-header-brand">
            <span className="admin-brand-icon">🏥</span>
            <div>
              <h1 className="admin-brand-title">Hospital Receptionist Dashboard</h1>
              <p className="admin-brand-sub">Real-Time Priority Queue Monitor</p>
            </div>
          </div>
        </div>

        <div className="admin-header-stats">
          {/* Live pulse indicator */}
          <div className={`admin-live-pill ${pulse ? 'admin-live-pill--flash' : ''}`}>
            <span className="admin-live-dot" />
            LIVE
          </div>

          <div className="admin-stat-chip">
            <span className="admin-stat-label">Active Patients</span>
            <span className="admin-stat-value">{totalActive}</span>
          </div>

          {criticalCount > 0 && (
            <div className="admin-stat-chip admin-stat-chip--critical">
              <span className="admin-stat-label">🚨 Critical</span>
              <span className="admin-stat-value">{criticalCount}</span>
            </div>
          )}

          <div className="admin-stat-chip">
            <span className="admin-stat-label">Last Sync</span>
            <span className="admin-stat-value">{formattedTime}</span>
          </div>
        </div>
      </header>

      {/* ── Critical Alert Banner ── */}
      {criticalCount > 0 && (
        <div className="admin-critical-banner">
          🚨 CRITICAL ESCALATION — {criticalCount} patient{criticalCount > 1 ? 's' : ''} with
          life-threatening vitals. Priority allocation forced. Immediate attention required!
        </div>
      )}

      {/* ── Main Table Area ── */}
      <main className="admin-main">
        {loading && (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Syncing live queue data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="admin-error-box">{error}</div>
        )}

        {!loading && !error && queue.length === 0 && (
          <div className="admin-empty">
            <span className="admin-empty-icon">🩺</span>
            <h2>Queue is Empty</h2>
            <p>No active patients in any department right now. New triage entries will appear here automatically every 5 seconds.</p>
          </div>
        )}

        {!loading && queue.length > 0 && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Department</th>
                  <th>Symptoms / Clinical Snapshot</th>
                  <th>Vitals</th>
                  <th>Severity</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((entry, idx) => (
                  <tr
                    key={`${entry.patientId}-${entry.tokenNumber}-${idx}`}
                    className={`admin-row ${entry.severity === 'High' ? 'admin-row--critical' : ''}`}
                  >
                    {/* Row number */}
                    <td className="admin-td admin-td--num">{idx + 1}</td>

                    {/* Token badge */}
                    <td className="admin-td">
                      <span className={`admin-token ${entry.isHighPriority ? 'admin-token--priority' : ''}`}>
                        {entry.isHighPriority ? '⚡' : '🎫'} {entry.tokenNumber === 0 ? 'P0' : `#${entry.tokenNumber}`}
                      </span>
                    </td>

                    {/* Patient info */}
                    <td className="admin-td">
                      <div className="admin-patient-name">{entry.patientName}</div>
                      <div className="admin-patient-id">{entry.patientId}</div>
                    </td>

                    {/* Department */}
                    <td className="admin-td">
                      <span className="admin-dept-chip">{entry.department}</span>
                    </td>

                    {/* Symptoms / Clinical snapshot */}
                    <td className="admin-td admin-td--snapshot">
                      {entry.clinicalSnapshot ? (
                        <div>
                          <p className="admin-snapshot-text">{entry.clinicalSnapshot}</p>
                          {entry.symptomsDetected && entry.symptomsDetected.length > 0 && (
                            <div className="admin-symptom-tags">
                              {entry.symptomsDetected.slice(0, 4).map((s, i) => (
                                <span key={i} className="admin-symptom-tag">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="admin-snapshot-raw">
                          {entry.symptoms ? entry.symptoms.slice(0, 80) + (entry.symptoms.length > 80 ? '…' : '') : '—'}
                        </span>
                      )}
                    </td>

                    {/* Vitals */}
                    <td className="admin-td">
                      <VitalsCell pulse={entry.pulseRate} spo2={entry.spo2} />
                    </td>

                    {/* Severity badge */}
                    <td className="admin-td">
                      <SeverityBadge severity={entry.severity} />
                    </td>

                    {/* ETA */}
                    <td className="admin-td">
                      <ETACell mins={entry.estimatedWaitMins} severity={entry.severity} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="admin-footer">
        Auto-refreshing every 5 seconds &nbsp;|&nbsp; Hospital Medical Triage System &nbsp;|&nbsp; Receptionist View
      </footer>
    </div>
  );
}
