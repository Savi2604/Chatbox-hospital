const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// DATA MODELS
const patientsDB = {
  'P101': {
    id: 'P101',
    name: 'John Doe',
    history: ['Diabetes', 'Hypertension']
  },
  'P102': {
    id: 'P102',
    name: 'Jane Smith',
    history: ['Asthma', 'Allergies']
  },
  'P103': {
    id: 'P103',
    name: 'Robert Lee',
    history: ['Chronic Back Pain']
  }
};

const doctorsDB = [
  {
    id: 'D101',
    name: 'Dr. Sarah Johnson',
    specialty: 'Ophthalmology',
    department: 'Ophthalmology',
    slots: ['09:00', '10:00', '11:00', '14:00', '15:00']
  },
  {
    id: 'D102',
    name: 'Dr. Michael Chen',
    specialty: 'Cardiology',
    department: 'Cardiology',
    slots: ['09:30', '10:30', '11:30', '14:30', '15:30']
  },
  {
    id: 'D103',
    name: 'Dr. Emily Rodriguez',
    specialty: 'Pulmonology',
    department: 'Pulmonology',
    slots: ['09:00', '10:00', '11:00', '14:00', '15:00']
  },
  {
    id: 'D104',
    name: 'Dr. David Kim',
    specialty: 'General Medicine',
    department: 'General Medicine',
    slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30']
  },
  {
    id: 'D105',
    name: 'Dr. Lisa Anderson',
    specialty: 'General Medicine',
    department: 'General Medicine',
    slots: ['09:00', '10:00', '11:00', '14:00', '15:00']
  }
];

// SMART TRIAGE RULE ENGINE
function getSmartRecommendation(history, currentSymptoms) {
  const symptomsLower = currentSymptoms.toLowerCase();
  const historyLower = history.map(h => h.toLowerCase());

  // Rule 1: Diabetes + vision symptoms -> Ophthalmology
  if (historyLower.includes('diabetes') && 
      (symptomsLower.includes('vision') || symptomsLower.includes('blur') || symptomsLower.includes('spots'))) {
    return {
      department: 'Ophthalmology',
      reason: 'Patient history of Diabetes combined with acute visual deficits requires immediate screening for Diabetic Retinopathy.'
    };
  }

  // Rule 2: Hypertension + chest/dizzy/pain -> Cardiology
  if (historyLower.includes('hypertension') && 
      (symptomsLower.includes('chest') || symptomsLower.includes('dizzy') || symptomsLower.includes('pain'))) {
    return {
      department: 'Cardiology',
      reason: 'Co-occurring Hypertension and chest discomfort/dizziness presents elevated cardiovascular risk profile requiring specialist assessment.'
    };
  }

  // Rule 3: Asthma in history OR respiratory symptoms -> Pulmonology
  if (historyLower.includes('asthma') || 
      (symptomsLower.includes('breathe') || symptomsLower.includes('cough') || symptomsLower.includes('wheeze'))) {
    return {
      department: 'Pulmonology',
      reason: 'Respiratory symptoms matching or impacting active airway hypersensitivity history routed to Pulmonology.'
    };
  }

  // Default Fallback -> General Medicine
  return {
    department: 'General Medicine',
    reason: 'Standard presentation; routed to General Practice for baseline evaluation.'
  };
}

// API ENDPOINTS

// POST /api/triage - Evaluate patient and recommend department
app.post('/api/triage', (req, res) => {
  const { patientId, currentSymptoms } = req.body;

  if (!patientId || !currentSymptoms) {
    return res.status(400).json({ error: 'Patient ID and symptoms are required' });
  }

  // Fetch or register patient
  let patient = patientsDB[patientId];
  if (!patient) {
    // Dynamically register new patient
    patient = {
      id: patientId,
      name: `Patient ${patientId}`,
      history: []
    };
    patientsDB[patientId] = patient;
  }

  // Get recommendation from triage engine
  const recommendation = getSmartRecommendation(patient.history, currentSymptoms);

  // Find available doctors in the recommended department
  const availableDoctors = doctorsDB
    .filter(doc => doc.department === recommendation.department && doc.slots.length > 0)
    .map(doc => ({
      id: doc.id,
      name: doc.name,
      specialty: doc.specialty,
      department: doc.department,
      slots: [...doc.slots]
    }));

  // If no specialist slots available, fallback to General Medicine
  if (availableDoctors.length === 0 && recommendation.department !== 'General Medicine') {
    const generalDoctors = doctorsDB
      .filter(doc => doc.department === 'General Medicine' && doc.slots.length > 0)
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty,
        department: doc.department,
        slots: [...doc.slots]
      }));

    return res.json({
      patient,
      recommendation: {
        ...recommendation,
        department: 'General Medicine',
        reason: `${recommendation.reason} No specialist slots available; routed to General Medicine.`
      },
      doctors: generalDoctors
    });
  }

  res.json({
    patient,
    recommendation,
    doctors: availableDoctors
  });
});

// POST /api/appointments - Book an appointment
app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, slot } = req.body;

  if (!patientId || !doctorId || !slot) {
    return res.status(400).json({ error: 'Patient ID, doctor ID, and slot are required' });
  }

  // Find the doctor
  const doctorIndex = doctorsDB.findIndex(doc => doc.id === doctorId);
  if (doctorIndex === -1) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  const doctor = doctorsDB[doctorIndex];

  // Check if slot is available
  const slotIndex = doctor.slots.indexOf(slot);
  if (slotIndex === -1) {
    return res.status(400).json({ error: 'Slot not available' });
  }

  // Atomically remove the slot
  doctor.slots.splice(slotIndex, 1);

  res.json({
    success: true,
    message: `Appointment booked successfully for ${patientsDB[patientId]?.name || patientId} with ${doctor.name} at ${slot}`
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Medical Triage Server running on port ${PORT}`);
});
