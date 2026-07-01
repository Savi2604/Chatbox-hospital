import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [patientId, setPatientId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleTriage = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId, currentSymptoms: symptoms }),
      });

      const data = await response.json();
      setPatientData(data.patient);
      setRecommendation(data.recommendation);
      setDoctors(data.doctors);
    } catch (error) {
      console.error('Error:', error);
      alert('Error connecting to the server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (doctorId, slot) => {
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId, doctorId, slot }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        // Clear the triage view for the next patient
        setPatientId('');
        setSymptoms('');
        setPatientData(null);
        setRecommendation(null);
        setDoctors([]);
      } else {
        alert('Error booking appointment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error booking appointment. Please try again.');
    }
  };

  const resetForm = () => {
    setPatientId('');
    setSymptoms('');
    setPatientData(null);
    setRecommendation(null);
    setDoctors([]);
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
                placeholder="Describe the patient's current symptoms..."
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

        {/* TRIAGE RECOMMENDATION CARD */}
        {patientData && recommendation && (
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
                <span className="department-badge">{recommendation.department}</span>
              </div>
              <div className="recommendation-reason">
                <p><strong>Reasoning:</strong></p>
                <p>{recommendation.reason}</p>
              </div>
            </div>
          </section>
        )}

        {/* DOCTOR SLOTS SELECTION MATRIX */}
        {doctors.length > 0 && (
          <section className="doctors-section">
            <h2>Available Appointments</h2>
            <div className="doctors-grid">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="doctor-card">
                  <div className="doctor-info">
                    <h3>{doctor.name}</h3>
                    <p className="specialty">{doctor.specialty}</p>
                    <p className="department">{doctor.department}</p>
                  </div>
                  <div className="slots-grid">
                    <h4>Available Time Slots</h4>
                    <div className="slots-container">
                      {doctor.slots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => handleBookAppointment(doctor.id, slot)}
                          className="slot-button"
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {patientData && doctors.length === 0 && (
          <section className="no-slots-section">
            <div className="no-slots-message">
              <h2>No Available Appointments</h2>
              <p>Unfortunately, there are no available time slots at the moment. Please try again later.</p>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 Medical Triage System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
