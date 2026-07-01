import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [patientId, setPatientId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Added state for appointment booking checkout flow
  const [selectedSlot, setSelectedSlot] = useState(null); // { doctorId, doctorName, specialty, slot, hospitalName }
  const [patientPhone, setPatientPhone] = useState('');

  const handleTriage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedSlot(null); // Clear active slot booking on new triage
    
    try {
      const response = await fetch(`${API_URL}/api/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId, currentSymptoms: symptoms }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.patient || !data.triageResult) {
        throw new Error('Invalid response format from server');
      }

      setPatientData(data.patient);
      setTriageResult(data.triageResult);
      // Pre-fill patient's mobile number if it's already in the database and not standard placeholder
      if (data.patient.mobile && data.patient.mobile !== '+91-XXXXXXXXXX') {
        setPatientPhone(data.patient.mobile);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to connect to the server. Please ensure the backend is running.');
      setPatientData(null);
      setTriageResult(null);
    } finally {
      setLoading(false);
    }
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    
    // UI Validation Check
    if (!patientPhone.trim()) {
      alert('Patient Mobile Number is mandatory for confirmation SMS.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          patientPhone: patientPhone.trim(),
          doctorId: selectedSlot.doctorId,
          doctorName: selectedSlot.doctorName,
          slot: selectedSlot.slot,
          hospitalName: selectedSlot.hospitalName,
          hospitalLocation: selectedSlot.hospitalLocation,
          hospitalPhone: selectedSlot.hospitalPhone
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setSelectedSlot(null);
        
        // Refresh triage data to update available slots in real-time
        try {
          const triageResponse = await fetch(`${API_URL}/api/triage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ patientId, currentSymptoms: symptoms }),
          });

          if (triageResponse.ok) {
            const triageData = await triageResponse.json();
            setPatientData(triageData.patient);
            setTriageResult(triageData.triageResult);
          }
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
          setPatientId('');
          setSymptoms('');
          setPatientData(null);
          setTriageResult(null);
        }
      } else {
        alert('Error booking appointment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error booking appointment: ' + (error.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatientId('');
    setSymptoms('');
    setPatientData(null);
    setTriageResult(null);
    setError(null);
    setSelectedSlot(null);
    setPatientPhone('');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Medical Triage System</h1>
        <p>Intelligent Patient Routing & Appointment Scheduling</p>
      </header>

      <main className="main-content">
        {/* INPUT BLOCK */}
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
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Reset
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ERROR MESSAGE */}
        {error && (
          <section className="error-section">
            <div className="error-message">
              <h3>Error</h3>
              <p>{error}</p>
              <button onClick={resetForm} className="btn-secondary">Try Again</button>
            </div>
          </section>
        )}

        {/* LOADING STATE */}
        {loading && !selectedSlot && (
          <section className="loading-section">
            <div className="loading-spinner">
              <div className="spinner-icon"></div>
              <p>Analyzing symptoms and finding premium healthcare recommendations...</p>
            </div>
          </section>
        )}

        {/* TRIAGE RECOMMENDATION CARD */}
        {patientData && triageResult && (
          <section className="recommendation-section">
            <div className="patient-card">
              <h2>Patient Information</h2>
              <div className="patient-details">
                <p><strong>Name:</strong> {patientData.name}</p>
                <p><strong>ID:</strong> {patientData.id}</p>
                <p><strong>Medical History:</strong></p>
                <ul>
                  {patientData.history.length > 0 ? (
                    patientData.history.map((condition, index) => (
                      <li key={index}>{condition}</li>
                    ))
                  ) : (
                    <li>No recorded history</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="recommendation-card">
              <div className="recommendation-header">
                <h2>Triage Recommendation</h2>
                <span className="department-badge">{triageResult.department}</span>
              </div>
              <div className="recommendation-reason">
                <p><strong>AI Analysis & Clinical Justification:</strong></p>
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

        {/* DOCTOR SLOTS SELECTION MATRIX */}
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
                      {doctor.slots.length > 0 ? (
                        doctor.slots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => {
                              setSelectedSlot({
                                doctorId: doctor.id,
                                doctorName: doctor.name,
                                specialty: doctor.specialty,
                                slot: slot,
                                hospitalName: triageResult.recommendedHospital,
                                hospitalLocation: triageResult.hospitalLocation,
                                hospitalPhone: triageResult.hospitalPhone
                              });
                            }}
                            className="slot-button"
                          >
                            {slot}
                          </button>
                        ))
                      ) : (
                        <p className="no-slots-doc">No slots left for today</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NO SLOTS AT ALL */}
        {patientData && triageResult && (!triageResult.doctors || triageResult.doctors.length === 0) && (
          <section className="no-slots-section">
            <div className="no-slots-message">
              <h2>No Available Appointments</h2>
              <p>Unfortunately, there are no specialist calendar slots left for today in this department. Please contact our helpline.</p>
            </div>
          </section>
        )}
      </main>

      {/* CHECKOUT MODAL OVERLAY */}
      {selectedSlot && (
        <div className="checkout-overlay">
          <div className="checkout-modal">
            <button className="close-btn" onClick={() => setSelectedSlot(null)} aria-label="Close modal">&times;</button>
            
            <div className="checkout-header">
              <h2>Confirm Booking</h2>
              <p>Enter your contact number to schedule this appointment</p>
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
                <span className="summary-value">{triageResult.hospitalLocation}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Selected Slot</span>
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
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                />
                <small className="hint">Mandatory. An SMS confirmation will be sent here.</small>
              </div>

              <div className="checkout-actions">
                <button type="submit" className="btn-confirm" disabled={loading}>
                  {loading ? 'Confirming Booking...' : 'Confirm Appointment'}
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
