import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
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
        body: JSON.stringify({ patientId, currentSymptoms: symptoms }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.patient || !data.triageResult) throw new Error('Invalid response format from server');

      setPatientData(data.patient);
      setTriageResult(data.triageResult);

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

    // Clean phone number by removing spaces, hyphens, and parentheses
    const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setPhoneError('Please enter a valid 10-digit mobile number (e.g. +91 98765 43210).');
      return;
    }

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
        // Show in-app confirmation screen instead of alert()
        setConfirmedAppointment({
          doctorName:       selectedSlot.doctorName,
          specialty:        selectedSlot.specialty,
          slot:             selectedSlot.slot,
          hospitalName:     selectedSlot.hospitalName,
          hospitalLocation: selectedSlot.hospitalLocation,
          hospitalPhone:    selectedSlot.hospitalPhone,
          patientPhone:     patientPhone.trim(),
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
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Medical Triage System</h1>
        <p>Intelligent Patient Routing &amp; Appointment Scheduling</p>
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
                  <label htmlFor="symptoms">Current Symptoms</label>
                  <textarea
                    id="symptoms"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe the patient's current symptoms (e.g., severe chest pain, shortness of breath, blurred vision...)"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Processing...' : 'Get Triage Recommendation'}
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
                  <p>Analyzing symptoms and finding premium healthcare recommendations...</p>
                </div>
              </section>
            )}

            {/* TRIAGE RESULT */}
            {patientData && triageResult && (
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
                    <span className="department-badge">{triageResult.department}</span>
                  </div>
                  <div className="recommendation-reason">
                    <p><strong>AI Analysis &amp; Clinical Justification:</strong></p>
                    <p>{triageResult.reasoning}</p>
                  </div>
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
            )}

            {/* DOCTOR SLOTS */}
            {triageResult && triageResult.doctors && triageResult.doctors.length > 0 && (
              <section className="doctors-section">
                <h2>Available Specialists ({triageResult.department})</h2>
                <div className="doctors-grid">
                  {triageResult.doctors.map((doctor) => (
                    <div key={doctor.id} className="doctor-card">
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
                        <h4>Available Time Slots</h4>
                        <div className="slots-container">
                          {doctor.slots.length > 0
                            ? doctor.slots.map((slot) => (
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
                                  className="slot-button"
                                >
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
          <div className="checkout-modal">
            <button className="close-btn" onClick={() => setSelectedSlot(null)} aria-label="Close">&times;</button>

            <div className="checkout-header">
              <h2>Confirm Booking</h2>
              <p>Enter your mobile number to confirm this appointment</p>
            </div>

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
            </div>

            <form onSubmit={submitBooking} className="checkout-form">
              <div className="form-group">
                <label htmlFor="checkoutPhone">Patient Mobile Number *</label>
                <input
                  type="tel"
                  id="checkoutPhone"
                  value={patientPhone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9+\s\-()]/g, '');
                    setPatientPhone(cleaned);
                    setPhoneError('');
                  }}
                  className={phoneError ? 'input-error' : ''}
                  placeholder="e.g. +91 98765 43210"
                  required
                />
                {phoneError && <small className="field-error">{phoneError}</small>}
                <small className="hint">An SMS confirmation will be dispatched to this number.</small>
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
        <p>&copy; 2026 Medical Triage System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
