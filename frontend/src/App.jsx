import { useState, useEffect, useRef } from 'react';
import diseaseMap from './diseaseMap.json';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Severity helpers ────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  High: {
    label: 'CRITICAL',
    color: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
    glowColor: 'rgba(220, 38, 38, 0.45)',
    borderColor: '#ef4444',
    icon: '🚨',
    badgeClass: 'severity-badge-high',
  },
  Medium: {
    label: 'MODERATE',
    color: '#d97706',
    bgGradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
    glowColor: 'rgba(217, 119, 6, 0.35)',
    borderColor: '#f59e0b',
    icon: '⚠️',
    badgeClass: 'severity-badge-medium',
  },
  Low: {
    label: 'STABLE',
    color: '#059669',
    bgGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    glowColor: 'rgba(5, 150, 105, 0.3)',
    borderColor: '#10b981',
    icon: '✅',
    badgeClass: 'severity-badge-low',
  },
};

// ── ETA Countdown Clock ─────────────────────────────────────────────────────
function EtaCountdown({ initialMins, severity }) {
  const [secsLeft, setSecsLeft] = useState(initialMins * 60);
  const intervalRef = useRef(null);

  useEffect(() => {
    setSecsLeft(initialMins * 60);
  }, [initialMins]);

  useEffect(() => {
    if (secsLeft <= 0) return;
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [secsLeft]);

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const cfg  = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.Low;

  if (initialMins === 0) {
    return (
      <div className="eta-clock eta-immediate">
        <div className="eta-pulse-ring" />
        <span className="eta-now-label">⚡ IMMEDIATE</span>
        <span className="eta-now-sub">Emergency override active</span>
      </div>
    );
  }

  return (
    <div className="eta-clock" style={{ '--glow': cfg.glowColor }}>
      <div className="eta-digits">
        <span className="eta-num">{String(mins).padStart(2, '0')}</span>
        <span className="eta-colon">:</span>
        <span className="eta-num">{String(secs).padStart(2, '0')}</span>
      </div>
      <span className="eta-label">
        {secsLeft === 0 ? 'Your Turn — Please Proceed' : 'Estimated Wait Time'}
      </span>
    </div>
  );
}

// ── Triage Dashboard Banner ─────────────────────────────────────────────────
function TriageDashboard({ severity, queueInfo, patientId }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.Low;

  return (
    <div className={`triage-dashboard ${severity === 'High' ? 'triage-dashboard--critical' : ''}`}
         style={{ '--severity-glow': cfg.glowColor, '--severity-border': cfg.borderColor }}>

      {/* Top urgency banner for High severity */}
      {severity === 'High' && (
        <div className="urgency-banner" role="alert" aria-live="assertive">
          <span className="urgency-pulse" />
          <span className="urgency-icon">🚨</span>
          <div className="urgency-text">
            <strong>Urgent Triage Case Detected</strong>
            <span>Slot dynamically advanced by Priority Routing System</span>
          </div>
          <span className="urgency-badge">PRIORITY #1</span>
        </div>
      )}

      <div className="triage-dashboard__body">
        {/* Token & severity strip */}
        <div className="triage-token-strip">
          <div className="token-card">
            <span className="token-label">Queue Token</span>
            <span className="token-number" style={{ color: cfg.color }}>
              {queueInfo.priorityOverride ? 'PRIORITY' : `#${queueInfo.tokenNumber}`}
            </span>
          </div>

          <div className="severity-pill-wrap">
            <div className={`severity-pill ${cfg.badgeClass}`}>
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </div>
            <span className="severity-sublabel">Risk Level</span>
          </div>

          <div className="token-card">
            <span className="token-label">Queue Position</span>
            <span className="token-number" style={{ color: cfg.color }}>
              {queueInfo.queuePosition} / {queueInfo.totalInQueue}
            </span>
          </div>
        </div>

        {/* ETA Clock */}
        <div className="eta-section">
          <EtaCountdown initialMins={queueInfo.estimatedWaitMins} severity={severity} />
          {severity !== 'High' && (
            <p className="eta-compare">
              <span className="eta-compare--standard">Standard wait for routine checkup:</span>
              <strong>~{queueInfo.totalInQueue * 15} mins</strong>
            </p>
          )}
          {severity === 'High' && (
            <p className="eta-override-note">
              ⚡ Your position was automatically advanced to the front of the queue. All other patients have been notified of their updated ETAs.
            </p>
          )}
        </div>

        {/* Live queue visualiser */}
        <div className="queue-track">
          <span className="queue-track__label">Live Queue Position</span>
          <div className="queue-dots">
            {Array.from({ length: Math.min(queueInfo.totalInQueue, 10) }).map((_, i) => (
              <div
                key={i}
                className={`queue-dot ${i === queueInfo.queuePosition - 1 ? 'queue-dot--active' : ''} ${severity === 'High' && i === 0 ? 'queue-dot--urgent' : ''}`}
                title={i === queueInfo.queuePosition - 1 ? `${patientId} — You` : `Patient ${i + 1}`}
              />
            ))}
            {queueInfo.totalInQueue > 10 && (
              <span className="queue-overflow">+{queueInfo.totalInQueue - 10}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
function App({ onOpenAdmin, onSplitScreen }) {
  const [patientId, setPatientId]     = useState('');
  const [symptoms, setSymptoms]       = useState('');
  const [patientData, setPatientData] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // Checkout flow state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientPhone, setPatientPhone] = useState('');
  const [phoneError, setPhoneError]     = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError]     = useState('');

  // Confirmation screen state — replaces alert()
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  // ── Ambient AI Scribe (Voice) & Language ───────────────────────────────────
  const [appLang, setAppLang] = useState('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support voice input. Please use Chrome or Edge.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = appLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend   = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setSymptoms(prev => {
        const base = prev.trim();
        return base ? base + ' ' + transcript : transcript;
      });
      setIsVoiceInput(true);
    };
    recognition.start();
  };

  const [isVoiceInput, setIsVoiceInput] = useState(false);

  // ── IoT Vitals Panel (pulse only, spo2 removed) ──────────────────────
  const [vitalsOpen, setVitalsOpen]   = useState(false);
  const [pulseRate,  setPulseRate]    = useState('');
  const [vitalsCritical, setVitalsCritical] = useState(false);

  // ── Quick-Select Disease Symptoms ──────────────────────────────────
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  // ── Triage ──────────────────────────────────────────────────────────────────
  const handleTriage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedSlot(null);
    setConfirmedAppointment(null);

    try {
      const response = await fetch(`${API_URL}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          currentSymptoms: symptoms,
          isVoiceInput,
          pulseRate: pulseRate !== '' ? Number(pulseRate) : null,
          selectedSymptoms,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.patient || !data.triageResult) throw new Error('Invalid response format from server');

      setPatientData(data.patient);
      setTriageResult(data.triageResult);
      setVitalsCritical(data.triageResult.diseaseOverride === true);

      // Pre-fill mobile from DB if available
      if (data.patient.mobile && data.patient.mobile !== '+91-XXXXXXXXXX') {
        setPatientPhone(data.patient.mobile);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to the server.');
      setPatientData(null);
      setTriageResult(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Book appointment ────────────────────────────────────────────────────────
  const submitBooking = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setBookingError('');

    const trimmedPhone = patientPhone.trim();
    if (!trimmedPhone) {
      setPhoneError('Mobile number is required to send confirmation.');
      return;
    }

    // Strictly validate: exactly 10 digits, starting with 6-9
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }
    const cleanPhone = trimmedPhone;

    setBookingLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          patientPhone:     trimmedPhone,
          doctorId:         selectedSlot.doctorId,
          doctorName:       selectedSlot.doctorName,
          slot:             selectedSlot.slot,
          hospitalName:     selectedSlot.hospitalName,
          hospitalLocation: selectedSlot.hospitalLocation,
          hospitalPhone:    selectedSlot.hospitalPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Booking failed (${response.status})`);
      }

      if (data.success) {
        // ── Elderly Accessibility Voice Output (TTS) ──
        if ('speechSynthesis' in window) {
          const tokenStr = triageResult?.queueInfo?.tokenNumber ?? '0';
          const deptStr = selectedSlot.specialty;
          const waitStr = triageResult?.queueInfo?.estimatedWaitMins ?? '0';
          
          let announcement = '';
          let utteranceLang = 'en-IN';
          
          if (appLang === 'hi-IN') {
            announcement = `प्रिय रोगी, आपकी नियुक्ति की पुष्टि हो गई है। ${deptStr} विभाग के लिए आपका प्राथमिकता टोकन नंबर ${tokenStr} है। आपका अनुमानित प्रतीक्षा समय ${waitStr} मिनट है।`;
            utteranceLang = 'hi-IN';
          } else if (appLang === 'ta-IN') {
            announcement = `அன்பான நோயாளியே, உங்கள் சந்திப்பு உறுதி செய்யப்பட்டுள்ளது. ${deptStr} பிரிவிற்கான உங்கள் முன்னுரிமை டோக்கன் எண் ${tokenStr}. உங்கள் உத்தேச காத்திருப்பு நேரம் ${waitStr} நிமிடங்கள்.`;
            utteranceLang = 'ta-IN';
          } else {
            announcement = `Dear Patient, your appointment is confirmed. Your priority token number is ${tokenStr} for the Department of ${deptStr}. Your estimated wait time is ${waitStr} minutes.`;
          }
          
          const utterance = new SpeechSynthesisUtterance(announcement);
          utterance.lang = utteranceLang;
          utterance.rate = 0.85; // Slower pacing for clarity
          
          // Force load voices and strictly assign the correct regional voice
          const voices = window.speechSynthesis.getVoices();
          let targetVoice = null;
          if (appLang === 'hi-IN') {
            targetVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
          } else if (appLang === 'ta-IN') {
            targetVoice = voices.find(v => v.lang.includes('ta') || v.name.toLowerCase().includes('tamil'));
          } else {
            targetVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en'));
          }
          if (targetVoice) {
            utterance.voice = targetVoice;
          }
          
          window.speechSynthesis.speak(utterance);
        }

        // Show in-app confirmation screen instead of alert()
        setConfirmedAppointment({
          doctorName:       selectedSlot.doctorName,
          specialty:        selectedSlot.specialty,
          slot:             selectedSlot.slot,
          hospitalName:     selectedSlot.hospitalName,
          hospitalLocation: selectedSlot.hospitalLocation,
          hospitalPhone:    selectedSlot.hospitalPhone,
          patientPhone:     patientPhone.trim(),
          severity:         triageResult?.severity || 'Low',
          queueInfo:        triageResult?.queueInfo || null,
          message:          data.message,
        });
        setSelectedSlot(null);
        setTriageResult(null);
        setPatientData(null);
      } else {
        setBookingError(data.error || 'Booking failed. Please try again.');
      }
    } catch (err) {
      setBookingError(err.message || 'Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetAll = () => {
    setPatientId('');
    setSymptoms('');
    setPatientData(null);
    setTriageResult(null);
    setError(null);
    setSelectedSlot(null);
    setPatientPhone('');
    setPhoneError('');
    setBookingError('');
    setBookingLoading(false);
    setConfirmedAppointment(null);
    setIsVoiceInput(false);
    setVitalsCritical(false);
    setPulseRate('');
    setSelectedSymptoms([]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="header-logo-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <span>MediTriage AI</span>
          </div>
          <h1>Intelligent Dynamic Queue-Time Triage</h1>
          <p>Priority Routing · Real-Time ETA · Severity Intelligence</p>
          {/* ── Staff / Admin Portal Button ── */}
          {onOpenAdmin && (
            <button
              className="admin-portal-btn"
              onClick={onOpenAdmin}
              title="Hospital Staff Dashboard"
            >
              🖥️ Staff Dashboard
            </button>
          )}
          {/* ── Split Screen Button ── */}
          {onSplitScreen && (
            <button
              className="admin-portal-btn"
              onClick={onSplitScreen}
              title="Split Screen: Patient + Admin side by side"
              style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}
            >
              ⚡ Split Screen
            </button>
          )}
        </div>
      </header>

      <main className="main-content">

        {/* ── CONFIRMED APPOINTMENT SCREEN ── */}
        {confirmedAppointment && (
          <section className="confirmed-section">
            {/* Confetti particles */}
            <div className="confetti-container">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="confetti-piece" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  backgroundColor: ['#0d9488', '#059669', '#0891b2', '#6366f1', '#f59e0b', '#ec4899'][i % 6],
                  width: `${6 + Math.random() * 6}px`,
                  height: `${6 + Math.random() * 6}px`,
                }} />
              ))}
            </div>

            <div className="confirmed-card">
              {/* Animated checkmark */}
              <div className="confirmed-icon-ring">
                <div className="confirmed-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" className="check-draw" />
                  </svg>
                </div>
              </div>

              <h2 className="confirmed-title">Appointment Confirmed!</h2>
              <p className="confirmed-sub">
                Your appointment has been successfully booked. A confirmation SMS has been sent to your mobile.
              </p>

              {/* Severity badge on confirmation */}
              {confirmedAppointment.severity && (
                <div className={`confirmed-severity-badge ${SEVERITY_CONFIG[confirmedAppointment.severity]?.badgeClass || ''}`}>
                  <span>{SEVERITY_CONFIG[confirmedAppointment.severity]?.icon}</span>
                  <span>Risk Level: {SEVERITY_CONFIG[confirmedAppointment.severity]?.label}</span>
                  {confirmedAppointment.severity === 'High' && (
                    <span className="priority-tag">⚡ PRIORITY QUEUE</span>
                  )}
                </div>
              )}

              {/* Booking details with staggered animations */}
              <div className="confirmed-details">
                <div className="confirmed-row fade-row" style={{ animationDelay: '0.1s' }}>
                  <span className="row-icon">👨‍⚕️</span>
                  <div className="row-content">
                    <span className="row-label">Doctor</span>
                    <strong>{confirmedAppointment.doctorName}</strong>
                  </div>
                </div>
                <div className="confirmed-row fade-row" style={{ animationDelay: '0.2s' }}>
                  <span className="row-icon">🏥</span>
                  <div className="row-content">
                    <span className="row-label">Hospital</span>
                    <strong>{confirmedAppointment.hospitalName}</strong>
                  </div>
                </div>
                <div className="confirmed-row fade-row" style={{ animationDelay: '0.3s' }}>
                  <span className="row-icon">📍</span>
                  <div className="row-content">
                    <span className="row-label">Location</span>
                    <strong>{confirmedAppointment.hospitalLocation}</strong>
                  </div>
                </div>
                <div className="confirmed-row fade-row" style={{ animationDelay: '0.4s' }}>
                  <span className="row-icon">🕐</span>
                  <div className="row-content">
                    <span className="row-label">Time Slot</span>
                    <strong className="slot-highlight">{confirmedAppointment.slot}</strong>
                  </div>
                </div>
                <div className="confirmed-row fade-row" style={{ animationDelay: '0.5s' }}>
                  <span className="row-icon">📞</span>
                  <div className="row-content">
                    <span className="row-label">Helpdesk</span>
                    <strong>{confirmedAppointment.hospitalPhone}</strong>
                  </div>
                </div>
              </div>

              {/* Queue info summary on confirmation */}
              {confirmedAppointment.queueInfo && (
                <div className="confirmed-queue-summary fade-row" style={{ animationDelay: '0.6s' }}>
                  <div className="cqs-item">
                    <span className="cqs-icon">🎫</span>
                    <div>
                      <span className="cqs-label">Queue Token</span>
                      <strong>{confirmedAppointment.queueInfo.priorityOverride ? 'PRIORITY' : `#${confirmedAppointment.queueInfo.tokenNumber}`}</strong>
                    </div>
                  </div>
                  <div className="cqs-item">
                    <span className="cqs-icon">⏱️</span>
                    <div>
                      <span className="cqs-label">Wait Time</span>
                      <strong>{confirmedAppointment.queueInfo.estimatedWaitMins === 0 ? 'Immediate' : `~${confirmedAppointment.queueInfo.estimatedWaitMins} mins`}</strong>
                    </div>
                  </div>
                  <div className="cqs-item">
                    <span className="cqs-icon">👥</span>
                    <div>
                      <span className="cqs-label">Position</span>
                      <strong>{confirmedAppointment.queueInfo.queuePosition} of {confirmedAppointment.queueInfo.totalInQueue}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulated Phone SMS Preview */}
              <div className="phone-sms-preview fade-row" style={{ animationDelay: '0.7s' }}>
                <div className="phone-frame">
                  <div className="phone-notch"></div>
                  <div className="phone-screen">
                    <div className="sms-header">
                      <div className="sms-avatar">🏥</div>
                      <div>
                        <div className="sms-sender">{confirmedAppointment.hospitalName}</div>
                        <div className="sms-time">Just now</div>
                      </div>
                    </div>
                    <div className="sms-bubble">
                      <p>Hi <strong>{patientId}</strong>,</p>
                      <p>Your appointment with <strong>{confirmedAppointment.doctorName}</strong> ({confirmedAppointment.specialty}) at <strong>{confirmedAppointment.hospitalName}</strong> ({confirmedAppointment.hospitalLocation}) for slot <strong>{confirmedAppointment.slot}</strong> is confirmed!</p>
                      <p>Helpdesk: {confirmedAppointment.hospitalPhone}</p>
                      <div className="sms-footer">
                        <span className="sms-delivered">✓✓ Delivered</span>
                        <span className="sms-timestamp">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="sms-caption">📱 SMS sent to <strong>{confirmedAppointment.patientPhone}</strong></p>
              </div>

              <button onClick={resetAll} className="btn-book-another fade-row" style={{ animationDelay: '0.9s' }}>
                ✨ Book Another Appointment
              </button>
            </div>
          </section>
        )}

        {/* ── TRIAGE FORM (hide after confirmed) ── */}
        {!confirmedAppointment && (
          <>
            {/* ── VITALS CRITICAL OVERRIDE BANNER ── */}
            {vitalsCritical && (
              <div className="vitals-critical-banner" role="alert" aria-live="assertive">
                <span className="vcb-pulse" />
                <span className="vcb-icon">🚨</span>
                <div className="vcb-text">
                  <strong>CRITICAL ESCALATION: Vital signs indicate clinical distress.</strong>
                  <span>Priority allocation forced by IoT Vitals Override Engine.</span>
                </div>
                <span className="vcb-badge">FORCED PRIORITY</span>
              </div>
            )}

            <section className="input-section">
              <form onSubmit={handleTriage} className="triage-form">
                <div className="form-group">
                  <label htmlFor="patientId">Patient ID</label>
                  <input
                    type="text"
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter Patient ID (e.g., P101)"
                    required
                  />
                  <small className="hint">Try: P101, P102, P103</small>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.4rem' }}>
                    <label htmlFor="symptoms" style={{ margin: 0 }}>Current Symptoms</label>
                    <select 
                      className="lang-selector"
                      value={appLang} 
                      onChange={(e) => setAppLang(e.target.value)}
                      title="Select Voice Language"
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: '0.8rem' }}
                    >
                      <option value="en-IN">🗣️ English</option>
                      <option value="hi-IN">🗣️ Hindi (हिंदी)</option>
                      <option value="ta-IN">🗣️ Tamil (தமிழ்)</option>
                    </select>
                  </div>
                  <div className="symptoms-input-wrapper">
                    <textarea
                      id="symptoms"
                      value={symptoms}
                      onChange={(e) => { setSymptoms(e.target.value); setIsVoiceInput(false); }}
                      placeholder="Describe the patient's current symptoms (e.g., severe chest pain, shortness of breath, blurred vision...)"
                      rows="4"
                      required
                    />
                    <button
                      type="button"
                      onClick={startVoiceInput}
                      className={`mic-btn ${isRecording ? 'mic-btn--active' : ''}`}
                      title={isRecording ? 'Stop Recording' : 'Start Voice Input (Ambient Scribe)'}
                      aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
                    >
                      {isRecording ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {isRecording && (
                    <div className="voice-recording-indicator">
                      <span className="voice-dot" /><span className="voice-dot" /><span className="voice-dot" />
                      <span>Ambient Scribe active — speak your symptoms…</span>
                    </div>
                  )}
                  {isVoiceInput && !isRecording && (
                    <div className="voice-transcribed-badge">🎙️ Voice transcript captured — AI Scribe mode active</div>
                  )}
                  <small className="hint">💡 Tip: Use the 🎙️ mic to speak symptoms. Type or voice — both trigger priority routing.</small>
                </div>

                {/* ── Quick-Select Categorized Symptoms ── */}
                <div className="vitals-panel">
                  <button
                    type="button"
                    className="vitals-toggle-btn"
                    onClick={() => setSymptomsOpen(v => !v)}
                    aria-expanded={symptomsOpen}
                  >
                    <span className="vitals-toggle-icon">{symptomsOpen ? '▼' : '▶'}</span>
                    <span>🩺 Quick-Select Categorized Symptoms</span>
                    {selectedSymptoms.length > 0 && (
                      <span className="vitals-active-badge">{selectedSymptoms.length} SELECTED</span>
                    )}
                  </button>

                  {symptomsOpen && (
                    <div className="vitals-inputs">
                      <p className="vitals-desc">
                        Click symptoms that match the patient's condition. Selected items are automatically merged into the AI analysis for precise department routing and severity detection.
                      </p>

                      {/* ── Selected chips preview ── */}
                      {selectedSymptoms.length > 0 && (
                        <div className="qs-selected-preview">
                          {selectedSymptoms.map(s => (
                            <span key={s} className="qs-chip qs-chip--selected" onClick={() => toggleSymptom(s)}>
                              ✕ {s}
                            </span>
                          ))}
                          <button type="button" className="qs-clear-btn" onClick={() => setSelectedSymptoms([])}>
                            Clear All
                          </button>
                        </div>
                      )}

                      {/* ── Category grids ── */}
                      {diseaseMap.categories.map(cat => (
                        <div key={cat.id} className="qs-category">
                          <div className={`qs-category-header qs-sev--${cat.baseline_severity.toLowerCase()}`}>
                            <span>{cat.icon} {cat.label}</span>
                            <span className="qs-dept-tag">{cat.specialist_department}</span>
                            <span className={`qs-sev-badge qs-sev-badge--${cat.baseline_severity.toLowerCase()}`}>
                              {cat.baseline_severity === 'High' ? '🚨' : cat.baseline_severity === 'Medium' ? '⚠️' : '✓'} {cat.baseline_severity}
                            </span>
                          </div>
                          <div className="qs-chips-grid">
                            {cat.sub_symptoms.map(symptom => (
                              <button
                                key={symptom}
                                type="button"
                                className={`qs-chip ${selectedSymptoms.includes(symptom) ? 'qs-chip--active' : ''}`}
                                onClick={() => toggleSymptom(symptom)}
                              >
                                {symptom}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Pulse Rate Input (kept for tachycardia detection) ── */}
                <div className="vitals-panel" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="vitals-toggle-btn"
                    onClick={() => setVitalsOpen(v => !v)}
                    aria-expanded={vitalsOpen}
                  >
                    <span className="vitals-toggle-icon">{vitalsOpen ? '▼' : '▶'}</span>
                    <span>💓 Pulse Rate Monitor (IoT Input)</span>
                    {pulseRate && <span className="vitals-active-badge">VITALS ACTIVE</span>}
                  </button>
                  {vitalsOpen && (
                    <div className="vitals-inputs">
                      <div className="vitals-field">
                        <label htmlFor="pulseRate">❤️ Pulse Rate (BPM)</label>
                        <input
                          type="number"
                          id="pulseRate"
                          value={pulseRate}
                          onChange={e => setPulseRate(e.target.value)}
                          placeholder="e.g. 72"
                          min="30"
                          max="250"
                          className={pulseRate !== '' && Number(pulseRate) > 120 ? 'vitals-input vitals-input--danger' : 'vitals-input'}
                        />
                        {pulseRate !== '' && Number(pulseRate) > 120 && (
                          <span className="vitals-warn">⚠️ Tachycardia! (&gt;120 BPM) — Auto-escalates to HIGH</span>
                        )}
                        <small className="hint">Normal: 60–100 BPM. Danger: &gt;120 BPM</small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Processing...' : '🔍 Analyse & Route Patient'}
                  </button>
                  {patientData && (
                    <button type="button" onClick={resetAll} className="btn-secondary">
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* ERROR */}
            {error && (
              <section className="error-section">
                <div className="error-message">
                  <h3>Error</h3>
                  <p>{error}</p>
                  <button onClick={resetAll} className="btn-secondary">Try Again</button>
                </div>
              </section>
            )}

            {/* LOADING */}
            {loading && (
              <section className="loading-section">
                <div className="loading-spinner">
                  <div className="spinner-icon"></div>
                  <p>Analysing symptoms and computing priority routing...</p>
                </div>
              </section>
            )}

            {/* TRIAGE RESULT */}
            {patientData && triageResult && (
              <>
                {/* ── INTELLIGENT TRIAGE DASHBOARD ── */}
                {triageResult.queueInfo && (
                  <TriageDashboard
                    severity={triageResult.severity}
                    queueInfo={triageResult.queueInfo}
                    patientId={patientId}
                  />
                )}

                <section className="recommendation-section">
                  <div className="patient-card">
                    <h2>Patient Information</h2>
                    <div className="patient-details">
                      <p><strong>Name:</strong> {patientData.name}</p>
                      <p><strong>ID:</strong> {patientData.id}</p>
                      <p><strong>Medical History:</strong></p>
                      <ul>
                        {patientData.history.length > 0
                          ? patientData.history.map((c, i) => <li key={i}>{c}</li>)
                          : <li>No recorded history</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="recommendation-card">
                    <div className="recommendation-header">
                      <h2>Triage Recommendation</h2>
                      <div className="rec-badges">
                        <span className="department-badge">{triageResult.department}</span>
                        {triageResult.severity && (
                          <span className={`severity-badge-inline ${SEVERITY_CONFIG[triageResult.severity]?.badgeClass}`}>
                            {SEVERITY_CONFIG[triageResult.severity]?.icon} {SEVERITY_CONFIG[triageResult.severity]?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="recommendation-reason">
                      <p><strong>AI Analysis &amp; Clinical Justification:</strong></p>
                      <p>{triageResult.reasoning}</p>
                    </div>

                    {/* ── Clinical Case Sheet (Voice Scribe output) ── */}
                    {triageResult.caseSheet && (
                      <div className="case-sheet-panel">
                        <div className="case-sheet-header">🩺 AI Clinical Case Sheet Snapshot</div>
                        {triageResult.caseSheet.symptoms_detected?.length > 0 && (
                          <div className="case-sheet-row">
                            <span className="cs-label">Symptoms Detected</span>
                            <div className="cs-tags">
                              {triageResult.caseSheet.symptoms_detected.map((s, i) => (
                                <span key={i} className="cs-tag cs-tag--symptom">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {triageResult.caseSheet.duration_inferred?.length > 0 && (
                          <div className="case-sheet-row">
                            <span className="cs-label">Duration Inferred</span>
                            <div className="cs-tags">
                              {triageResult.caseSheet.duration_inferred.map((d, i) => (
                                <span key={i} className="cs-tag cs-tag--duration">{d}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {triageResult.caseSheet.clinical_snapshot && (
                          <div className="case-sheet-row">
                            <span className="cs-label">Clinical Snapshot</span>
                            <p className="cs-snapshot">{triageResult.caseSheet.clinical_snapshot}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {triageResult.recommendedHospital && (
                      <div className="hospital-info">
                        <div className="hospital-title">
                          <svg className="hospital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                          </svg>
                          <span>{triageResult.recommendedHospital}</span>
                        </div>
                        <p><strong>Location:</strong> {triageResult.hospitalLocation}</p>
                        <p><strong>Contact Hotline:</strong> {triageResult.hospitalPhone}</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* DOCTOR SLOTS */}
            {triageResult && triageResult.doctors && triageResult.doctors.length > 0 && (
              <section className="doctors-section">
                <h2>Available Specialists ({triageResult.department})</h2>
                <div className="doctors-grid">
                  {triageResult.doctors.map((doctor) => (
                    <div key={doctor.id} className={`doctor-card ${triageResult.severity === 'High' ? 'doctor-card--urgent' : ''}`}>
                      <div className="doctor-info">
                        <div className="doctor-avatar">
                          {doctor.name.split(' ').slice(1).map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3>{doctor.name}</h3>
                          <p className="specialty">{doctor.specialty}</p>
                          <p className="department">{doctor.department}</p>
                        </div>
                      </div>
                      <div className="slots-grid">
                        <h4>
                          {triageResult.severity === 'High'
                            ? '⚡ Priority Time Slots'
                            : 'Available Time Slots'}
                        </h4>
                        <div className="slots-container">
                          {doctor.slots.length > 0
                            ? doctor.slots.map((slot, idx) => (
                                <button
                                  key={slot}
                                  onClick={() => {
                                    setBookingError('');
                                    setSelectedSlot({
                                      doctorId:         doctor.id,
                                      doctorName:       doctor.name,
                                      specialty:        doctor.specialty,
                                      slot,
                                      hospitalName:     triageResult.recommendedHospital,
                                      hospitalLocation: triageResult.hospitalLocation,
                                      hospitalPhone:    triageResult.hospitalPhone,
                                    });
                                  }}
                                  className={`slot-button ${triageResult.severity === 'High' && idx === 0 ? 'slot-button--priority' : ''}`}
                                >
                                  {triageResult.severity === 'High' && idx === 0 && <span className="slot-priority-tag">⚡</span>}
                                  {slot}
                                </button>
                              ))
                            : <p className="no-slots-doc">No slots left for today</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── CHECKOUT MODAL ── */}
      {selectedSlot && (
        <div className="checkout-overlay">
          <div className="checkout-modal" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setSelectedSlot(null)} aria-label="Close">&times;</button>

            <div className="checkout-header">
              <h2>Confirm Booking</h2>
              <p>Enter your mobile number to confirm this appointment</p>
            </div>

            {/* High severity alert in checkout modal */}
            {triageResult?.severity === 'High' && (
              <div className="checkout-urgency-alert">
                🚨 <strong>Priority Booking</strong> — Your slot has been advanced to front of queue by the Priority Routing System.
              </div>
            )}

            <div className="checkout-summary-box">
              <div className="summary-item">
                <span className="summary-label">Doctor</span>
                <span className="summary-value highlight">{selectedSlot.doctorName}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Specialty</span>
                <span className="summary-value">{selectedSlot.specialty}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Hospital</span>
                <span className="summary-value">{selectedSlot.hospitalName}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Location</span>
                <span className="summary-value">{selectedSlot.hospitalLocation}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Time Slot</span>
                <span className="summary-badge">{selectedSlot.slot}</span>
              </div>
              {triageResult?.queueInfo && (
                <div className="summary-item">
                  <span className="summary-label">Wait Time</span>
                  <span className="summary-badge" style={{ background: triageResult.severity === 'High' ? '#fef2f2' : undefined }}>
                    {triageResult.queueInfo.estimatedWaitMins === 0
                      ? '⚡ Immediate'
                      : `~${triageResult.queueInfo.estimatedWaitMins} mins`}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={submitBooking} className="checkout-form">
              <div className="form-group">
                <label htmlFor="checkoutPhone">Patient Mobile Number *</label>
                <input
                  type="tel"
                  id="checkoutPhone"
                  value={patientPhone}
                  maxLength={10}
                  onChange={(e) => {
                    // Only allow digits, max 10 chars
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPatientPhone(digits);
                    if (digits.length > 0 && digits.length < 10) {
                      setPhoneError(`${10 - digits.length} more digit${10 - digits.length > 1 ? 's' : ''} needed`);
                    } else if (digits.length === 10 && !/^[6-9]/.test(digits)) {
                      setPhoneError('Number must start with 6, 7, 8 or 9');
                    } else {
                      setPhoneError('');
                    }
                  }}
                  className={phoneError ? 'input-error' : ''}
                  placeholder="10-digit mobile number"
                  required
                />
                {phoneError && <small className="field-error">{phoneError}</small>}
                <small className="hint">Enter your 10-digit Indian mobile number. An SMS will be sent on confirmation.</small>
              </div>

              <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <label>Voice Announcement Language</label>
                <select 
                  className="lang-selector"
                  value={appLang} 
                  onChange={(e) => setAppLang(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem' }}
                >
                  <option value="en-IN">🗣️ Play Audio in English</option>
                  <option value="hi-IN">🗣️ Play Audio in Hindi (हिंदी)</option>
                  <option value="ta-IN">🗣️ Play Audio in Tamil (தமிழ்)</option>
                </select>
                <small className="hint">The confirmation will be spoken aloud in this language.</small>
              </div>

              {bookingError && (
                <div className="booking-error-box">{bookingError}</div>
              )}

              <div className="checkout-actions">
                <button type="submit" className="btn-confirm" disabled={bookingLoading}>
                  {bookingLoading ? 'Confirming...' : 'Confirm Appointment'}
                </button>
                <button type="button" onClick={() => setSelectedSlot(null)} className="btn-cancel">
                  Go Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>&copy; 2026 MediTriage AI — Intelligent Dynamic Queue-Time Triage System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
