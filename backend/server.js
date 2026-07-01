require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY &&
               process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' &&
               process.env.OPENAI_API_KEY.trim() !== ''
  ? process.env.OPENAI_API_KEY
  : 'mock-api-key';

const openai = new OpenAI({
  apiKey: apiKey === 'mock-api-key' ? 'dummy' : apiKey
});

app.use(cors());
app.use(express.json());

// DATA MODELS & IN-MEMORY DATASTORES
const patientsDB = {
  'P101': { id: 'P101', name: 'John Doe',    history: ['Diabetes', 'Hypertension'], mobile: '+91-9876543210' },
  'P102': { id: 'P102', name: 'Jane Smith',  history: ['Asthma', 'Allergies'],      mobile: '+91-9876543211' },
  'P103': { id: 'P103', name: 'Robert Lee',  history: ['Chronic Back Pain'],        mobile: '+91-9876543212' }
};

const appointmentsDB = [];

// HELPER TO DYNAMICALLY SPAWN INDIAN DOCTOR PROFILES
function spawnDynamicDoctors(department, hospitalName, hospitalLocation, hospitalPhone) {
  const firstNames  = ['Rajesh','Amit','Sanjay','Vikram','Priya','Anjali','Sunita','Meera','Arjun','Deepak','Vijay','Sneha','Rohan','Neha','Kavitha','Suresh'];
  const lastNames   = ['Sharma','Patel','Verma','Gupta','Iyer','Nair','Reddy','Rao','Choudhury','Joshi','Mehta','Sen','Das','Mishra','Kumar','Singh'];

  const specialtyMap = {
    'Cardiology':       'Cardiologist',
    'Gynecology':       'Gynecologist',
    'Pulmonology':      'Pulmonologist',
    'Ophthalmology':    'Ophthalmologist',
    'General Medicine': 'General Physician'
  };

  const specialty = specialtyMap[department] || 'General Practitioner';
  const count = Math.floor(Math.random() * 2) + 2; // 2 or 3 doctors
  const doctors = [];

  const slotSequences = [
    ['09:00', '11:15', '14:30'],
    ['10:00', '12:30', '15:15', '16:45'],
    ['08:30', '11:00', '13:45', '15:30'],
    ['09:30', '12:00', '14:15', '16:00'],
    ['11:15', '14:30', '17:00']
  ];

  for (let i = 0; i < count; i++) {
    const fName    = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName    = lastNames [Math.floor(Math.random() * lastNames.length)];
    const doctorId = `DOC-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const slots    = [...slotSequences[Math.floor(Math.random() * slotSequences.length)]];

    doctors.push({
      id: doctorId,
      name: `Dr. ${fName} ${lName}`,
      specialty,
      department,
      slots,
      hospitalName,
      hospitalLocation,
      hospitalPhone
    });
  }

  return doctors;
}

// COMPREHENSIVE SYMPTOM -> DEPARTMENT/HOSPITAL MAPPING
function simulateTriageResult(currentSymptoms) {
  const s = currentSymptoms.toLowerCase();

  // Cardiology
  if (s.includes('chest') || s.includes('heart') || s.includes('palpitation') ||
      s.includes('cardiac') || s.includes('angina') || s.includes('blood pressure') ||
      s.includes('hypertension') || s.includes('breathless') || s.includes('pressure in chest') ||
      s.includes('arm pain') || s.includes('jaw pain') || s.includes('dizzy') ||
      s.includes('fainting') || s.includes('arrhythmia') || s.includes('tachycardia')) {
    return {
      department: 'Cardiology',
      reasoning: 'Cardiovascular symptoms detected. Patient requires immediate cardiac evaluation and specialist assessment.',
      recommendedHospital: 'Fortis Escorts Heart Institute',
      hospitalLocation: 'Okhla Road, New Delhi, Delhi – 110025',
      hospitalPhone: '+91 11 4713 5000'
    };
  }

  // Gynecology
  if (s.includes('pregnan') || s.includes('period') || s.includes('menstrual') ||
      s.includes('gynecol') || s.includes('obstetric') || s.includes('uterus') ||
      s.includes('ovarian') || s.includes('vaginal') || s.includes('pcos') ||
      s.includes('fertility') || s.includes('discharge') || s.includes('breast pain') ||
      s.includes('missed period') || s.includes('cramps')) {
    return {
      department: 'Gynecology',
      reasoning: 'Gynecological or maternity-related symptoms identified. Referred to specialist care.',
      recommendedHospital: 'Apollo Cradle & Childrens Hospital',
      hospitalLocation: 'Koramangala, Bengaluru, Karnataka – 560034',
      hospitalPhone: '+91 80 4424 4424'
    };
  }

  // Pulmonology
  if (s.includes('cough') || s.includes('breath') || s.includes('asthma') ||
      s.includes('lung') || s.includes('wheez') || s.includes('pneumonia') ||
      s.includes('tuberculosis') || s.includes('tb') || s.includes('sputum') ||
      s.includes('bronchitis') || s.includes('inhaler') || s.includes('oxygen') ||
      s.includes('shortness of breath') || s.includes('chest tightness')) {
    return {
      department: 'Pulmonology',
      reasoning: 'Respiratory distress or chronic pulmonary symptoms detected. Referred to Pulmonology.',
      recommendedHospital: 'Medanta - The Medicity',
      hospitalLocation: 'Sector 38, Gurugram, Haryana – 122001',
      hospitalPhone: '+91 124 414 1414'
    };
  }

  // Ophthalmology
  if (s.includes('eye') || s.includes('vision') || s.includes('blur') ||
      s.includes('blind') || s.includes('cataract') || s.includes('glaucoma') ||
      s.includes('retina') || s.includes('itchy eye') || s.includes('red eye') ||
      s.includes('watering eye') || s.includes('sight') || s.includes('double vision')) {
    return {
      department: 'Ophthalmology',
      reasoning: 'Ocular discomfort or vision-related symptoms detected. Referred to Ophthalmology.',
      recommendedHospital: 'Sankara Nethralaya Eye Hospital',
      hospitalLocation: 'Nungambakkam, Chennai, Tamil Nadu – 600006',
      hospitalPhone: '+91 44 2827 1616'
    };
  }

  // General Medicine (default)
  return {
    department: 'General Medicine',
    reasoning: 'General symptoms detected. Routed to General Medicine for baseline evaluation and treatment.',
    recommendedHospital: 'Max Super Speciality Hospital',
    hospitalLocation: 'Saket, New Delhi, Delhi – 110017',
    hospitalPhone: '+91 11 2651 5050'
  };
}

// LIVE LLM PIPELINE USING OPENAI (with graceful fallback)
async function getAIRecommendation(history, currentSymptoms) {
  if (apiKey === 'mock-api-key') {
    console.log('[OPENAI] No API key configured — using simulated triage.');
    return simulateTriageResult(currentSymptoms);
  }

  try {
    const systemInstruction = `You are a medical triage AI assistant. Analyze patient symptoms and medical history to recommend the appropriate medical department.
Available departments: Cardiology, Gynecology, Pulmonology, Ophthalmology, General Medicine.

Output ONLY a raw JSON object — no markdown, no extra text — matching this structure exactly:
{
  "department": "one of the five departments above",
  "reasoning": "Clinical justification mapping the submitted symptoms.",
  "recommendedHospital": "Realistic premium hospital name in India.",
  "hospitalLocation": "Realistic specific metro city branch/address in India.",
  "hospitalPhone": "Realistic Indian hospital helpline number in format +91 XX XXXX XXXX"
}`;

    const prompt = `Patient Medical History: ${history.length > 0 ? history.join(', ') : 'None recorded'}
Current Symptoms: ${currentSymptoms}

Provide the triage recommendation as a raw JSON object.`;

    console.log('\n--- [OPENAI STREAM START] ---');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      stream: true
    });

    let completeResponse = '';
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || '';
      completeResponse += text;
      process.stdout.write(text);
    }
    console.log('\n--- [OPENAI STREAM END] ---\n');

    let cleaned = completeResponse.trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const validDepts = ['Cardiology', 'Gynecology', 'Pulmonology', 'Ophthalmology', 'General Medicine'];
    if (!parsed.department || !validDepts.includes(parsed.department)) parsed.department = 'General Medicine';
    if (!parsed.reasoning)           throw new Error('Missing reasoning field');
    if (!parsed.recommendedHospital) throw new Error('Missing recommendedHospital field');
    if (!parsed.hospitalLocation)    throw new Error('Missing hospitalLocation field');
    if (!parsed.hospitalPhone)       throw new Error('Missing hospitalPhone field');

    return parsed;
  } catch (err) {
    console.error('[OPENAI] Error:', err.message, '— falling back to simulated triage.');
    return simulateTriageResult(currentSymptoms);
  }
}

// ─── API ENDPOINTS ────────────────────────────────────────────────────────────

// POST /api/triage
app.post('/api/triage', async (req, res) => {
  const { patientId, currentSymptoms } = req.body;
  if (!patientId || !currentSymptoms) {
    return res.status(400).json({ error: 'Patient ID and symptoms are required.' });
  }

  try {
    let patient = patientsDB[patientId];
    if (!patient) {
      patient = { id: patientId, name: `Patient ${patientId}`, history: [], mobile: '+91-XXXXXXXXXX' };
      patientsDB[patientId] = patient;
    }

    const recommendation = await getAIRecommendation(patient.history, currentSymptoms);
    const doctors = spawnDynamicDoctors(
      recommendation.department,
      recommendation.recommendedHospital,
      recommendation.hospitalLocation,
      recommendation.hospitalPhone
    );

    res.json({
      patient,
      triageResult: {
        department:          recommendation.department,
        reasoning:           recommendation.reasoning,
        recommendedHospital: recommendation.recommendedHospital,
        hospitalLocation:    recommendation.hospitalLocation,
        hospitalPhone:       recommendation.hospitalPhone,
        doctors
      }
    });
  } catch (err) {
    console.error('Triage Error:', err);
    res.status(500).json({ error: 'Failed to process triage request: ' + err.message });
  }
});

// POST /api/appointments  ← STATELESS: all details come from the request body
app.post('/api/appointments', (req, res) => {
  const { patientId, patientPhone, doctorId, doctorName, slot,
          hospitalName, hospitalLocation, hospitalPhone } = req.body;

  if (!patientPhone || patientPhone.trim() === '') {
    return res.status(400).json({ error: 'Patient Mobile Number is mandatory for booking confirmation.' });
  }
  if (!patientId || !doctorId || !slot) {
    return res.status(400).json({ error: 'Patient ID, Doctor ID, and slot are required.' });
  }

  const resolvedDoctorName    = doctorName    || 'the selected doctor';
  const resolvedHospitalName  = hospitalName  || 'the recommended hospital';
  const resolvedHospitalLoc   = hospitalLocation || 'the hospital';
  const resolvedHospitalPhone = hospitalPhone || 'N/A';

  // ── SMS Gateway confirmation trace ──────────────────────────────────────────
  const smsMessage = `Hi ${patientId}, your appointment with ${resolvedDoctorName} at ${resolvedHospitalName} (${resolvedHospitalLoc}) for slot ${slot} is confirmed! Helpdesk: ${resolvedHospitalPhone}.`;
  console.log(`[SMS GATEWAY] Sending confirmation text to ${patientPhone}: ${smsMessage}`);

  const appointment = {
    id:             `APT${Date.now()}`,
    patientId,
    patientPhone,
    doctorId,
    doctorName:     resolvedDoctorName,
    hospitalName:   resolvedHospitalName,
    hospitalLocation: resolvedHospitalLoc,
    hospitalPhone:  resolvedHospitalPhone,
    slot,
    bookingDate:    new Date().toISOString(),
    smsConfirmation: smsMessage
  };

  appointmentsDB.push(appointment);

  res.json({
    success: true,
    message: `Appointment confirmed with ${resolvedDoctorName} at ${slot}. A confirmation SMS has been sent to ${patientPhone}.`,
    appointment
  });
});

// GET /api/appointments
app.get('/api/appointments', (req, res) => {
  res.json({ total: appointmentsDB.length, appointments: appointmentsDB });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Medical Triage Server running on port ${PORT}`);
  console.log(`OpenAI: ${apiKey !== 'mock-api-key' ? 'Enabled' : 'Mock Mode'}`);
});
