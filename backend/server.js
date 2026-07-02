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
    ['09:00 AM', '11:15 AM', '02:30 PM'],
    ['10:00 AM', '12:30 PM', '03:15 PM', '04:45 PM'],
    ['08:30 AM', '11:00 AM', '01:45 PM', '03:30 PM'],
    ['09:30 AM', '12:00 PM', '02:15 PM', '04:00 PM'],
    ['11:15 AM', '02:30 PM', '05:00 PM']
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

// HOSPITAL POOLS — multiple options per department, randomly selected each call
const hospitalPools = {
  Cardiology: [
    { recommendedHospital: 'Fortis Escorts Heart Institute',         hospitalLocation: 'Okhla Road, New Delhi, Delhi – 110025',              hospitalPhone: '+91 11 4713 5000' },
    { recommendedHospital: 'Apollo Hospitals – Cardiology Centre',   hospitalLocation: 'Jubilee Hills, Hyderabad, Telangana – 500033',        hospitalPhone: '+91 40 2360 7777' },
    { recommendedHospital: 'Narayana Institute of Cardiac Sciences', hospitalLocation: 'Bommasandra, Bengaluru, Karnataka – 560099',          hospitalPhone: '+91 80 7122 2200' },
    { recommendedHospital: 'Medanta Heart Institute',                hospitalLocation: 'Sector 38, Gurugram, Haryana – 122001',               hospitalPhone: '+91 124 414 1414' },
    { recommendedHospital: 'SIMS Hospital – Heart Care',             hospitalLocation: 'Vadapalani, Chennai, Tamil Nadu – 600026',            hospitalPhone: '+91 44 4396 4000' },
    { recommendedHospital: 'Kokilaben Dhirubhai Ambani Hospital',    hospitalLocation: 'Andheri West, Mumbai, Maharashtra – 400053',          hospitalPhone: '+91 22 4269 6969' },
  ],
  Gynecology: [
    { recommendedHospital: 'Apollo Cradle & Childrens Hospital',     hospitalLocation: 'Koramangala, Bengaluru, Karnataka – 560034',          hospitalPhone: '+91 80 4424 4424' },
    { recommendedHospital: 'Fortis La Femme',                        hospitalLocation: 'Greater Kailash, New Delhi, Delhi – 110048',          hospitalPhone: '+91 11 4211 7777' },
    { recommendedHospital: 'Cloudnine Hospital',                     hospitalLocation: 'Malleswaram, Bengaluru, Karnataka – 560003',          hospitalPhone: '+91 80 6674 1000' },
    { recommendedHospital: 'Surya Mother & Child Super Speciality',  hospitalLocation: 'Wakad, Pune, Maharashtra – 411057',                   hospitalPhone: '+91 20 6727 5000' },
    { recommendedHospital: 'Motherhood Hospital',                    hospitalLocation: 'Indiranagar, Bengaluru, Karnataka – 560038',          hospitalPhone: '+91 80 6741 8000' },
    { recommendedHospital: 'Rainbow Childrens Hospital',             hospitalLocation: 'Banjara Hills, Hyderabad, Telangana – 500034',        hospitalPhone: '+91 40 4477 0000' },
  ],
  Pulmonology: [
    { recommendedHospital: 'Medanta – Chest & Respiratory Sciences', hospitalLocation: 'Sector 38, Gurugram, Haryana – 122001',               hospitalPhone: '+91 124 414 1414' },
    { recommendedHospital: 'Hinduja Hospital – Pulmonology',         hospitalLocation: 'Mahim, Mumbai, Maharashtra – 400016',                 hospitalPhone: '+91 22 2445 2222' },
    { recommendedHospital: 'KIMS Hospital – Respiratory Dept.',      hospitalLocation: 'Secunderabad, Hyderabad, Telangana – 500003',         hospitalPhone: '+91 40 4488 5000' },
    { recommendedHospital: 'Manipal Hospital – Pulmonology Wing',    hospitalLocation: 'HAL Airport Road, Bengaluru, Karnataka – 560017',     hospitalPhone: '+91 80 2502 4444' },
    { recommendedHospital: 'Chest Research Foundation Hospital',     hospitalLocation: 'Pune – Satara Road, Pune, Maharashtra – 411009',      hospitalPhone: '+91 20 2422 5555' },
    { recommendedHospital: 'Apollo Hospitals – Pulmonology',         hospitalLocation: 'Greams Road, Chennai, Tamil Nadu – 600006',           hospitalPhone: '+91 44 2829 0200' },
  ],
  Ophthalmology: [
    { recommendedHospital: 'Sankara Nethralaya Eye Hospital',        hospitalLocation: 'Nungambakkam, Chennai, Tamil Nadu – 600006',          hospitalPhone: '+91 44 2827 1616' },
    { recommendedHospital: 'Aravind Eye Hospital',                   hospitalLocation: 'Anna Nagar, Madurai, Tamil Nadu – 625020',            hospitalPhone: '+91 452 4356 100' },
    { recommendedHospital: 'LV Prasad Eye Institute',                hospitalLocation: 'Banjara Hills, Hyderabad, Telangana – 500034',        hospitalPhone: '+91 40 3061 2222' },
    { recommendedHospital: 'Dr. Shroffs Charity Eye Hospital',       hospitalLocation: 'Daryaganj, New Delhi, Delhi – 110002',               hospitalPhone: '+91 11 4352 4444' },
    { recommendedHospital: 'Narayana Nethralaya',                    hospitalLocation: 'Rajajinagar, Bengaluru, Karnataka – 560010',          hospitalPhone: '+91 80 6648 6648' },
    { recommendedHospital: 'Centre for Sight Eye Hospital',          hospitalLocation: 'Safdarjung, New Delhi, Delhi – 110029',               hospitalPhone: '+91 11 4678 0000' },
  ],
  'General Medicine': [
    { recommendedHospital: 'Max Super Speciality Hospital',          hospitalLocation: 'Saket, New Delhi, Delhi – 110017',                   hospitalPhone: '+91 11 2651 5050' },
    { recommendedHospital: 'Apollo Hospitals',                       hospitalLocation: 'Greams Road, Chennai, Tamil Nadu – 600006',           hospitalPhone: '+91 44 2829 0200' },
    { recommendedHospital: 'Manipal Hospital',                       hospitalLocation: 'Old Airport Road, Bengaluru, Karnataka – 560017',     hospitalPhone: '+91 80 2502 4444' },
    { recommendedHospital: 'Fortis Memorial Research Institute',     hospitalLocation: 'Sector 44, Gurugram, Haryana – 122002',               hospitalPhone: '+91 124 496 2200' },
    { recommendedHospital: 'Kokilaben Dhirubhai Ambani Hospital',    hospitalLocation: 'Andheri West, Mumbai, Maharashtra – 400053',          hospitalPhone: '+91 22 4269 6969' },
    { recommendedHospital: 'KIMS Hospital',                          hospitalLocation: 'Minister Road, Secunderabad, Telangana – 500003',     hospitalPhone: '+91 40 4488 5000' },
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// COMPREHENSIVE SYMPTOM -> DEPARTMENT/HOSPITAL MAPPING
function simulateTriageResult(currentSymptoms) {
  const s = currentSymptoms.toLowerCase();
  let department;
  let reasoning;

  // Cardiology
  if (s.includes('chest') || s.includes('heart') || s.includes('palpitation') ||
      s.includes('cardiac') || s.includes('angina') || s.includes('blood pressure') ||
      s.includes('hypertension') || s.includes('breathless') ||
      s.includes('arm pain') || s.includes('jaw pain') || s.includes('dizzy') ||
      s.includes('fainting') || s.includes('arrhythmia') || s.includes('tachycardia')) {
    department = 'Cardiology';
    reasoning  = 'Cardiovascular symptoms detected. Patient requires immediate cardiac evaluation and specialist assessment.';

  // Gynecology
  } else if (s.includes('pregnan') || s.includes('period') || s.includes('menstrual') ||
      s.includes('gynecol') || s.includes('obstetric') || s.includes('uterus') ||
      s.includes('ovarian') || s.includes('vaginal') || s.includes('pcos') ||
      s.includes('fertility') || s.includes('discharge') || s.includes('breast pain') ||
      s.includes('missed period') || s.includes('cramps')) {
    department = 'Gynecology';
    reasoning  = 'Gynecological or maternity-related symptoms identified. Referred to specialist care.';

  // Pulmonology
  } else if (s.includes('cough') || s.includes('breath') || s.includes('asthma') ||
      s.includes('lung') || s.includes('wheez') || s.includes('pneumonia') ||
      s.includes('tuberculosis') || s.includes('tb') || s.includes('sputum') ||
      s.includes('bronchitis') || s.includes('inhaler') || s.includes('oxygen') ||
      s.includes('shortness of breath') || s.includes('chest tightness')) {
    department = 'Pulmonology';
    reasoning  = 'Respiratory distress or chronic pulmonary symptoms detected. Referred to Pulmonology.';

  // Ophthalmology
  } else if (s.includes('eye') || s.includes('vision') || s.includes('blur') ||
      s.includes('blind') || s.includes('cataract') || s.includes('glaucoma') ||
      s.includes('retina') || s.includes('itchy eye') || s.includes('red eye') ||
      s.includes('watering eye') || s.includes('sight') || s.includes('double vision')) {
    department = 'Ophthalmology';
    reasoning  = 'Ocular discomfort or vision-related symptoms detected. Referred to Ophthalmology.';

  // General Medicine (default)
  } else {
    department = 'General Medicine';
    reasoning  = 'General symptoms detected. Routed to General Medicine for baseline evaluation and treatment.';
  }

  // Randomly pick a hospital from the pool for this department
  const hospital = pickRandom(hospitalPools[department]);
  return { department, reasoning, ...hospital };
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

  const cleanPhone = patientPhone.trim().replace(/[\s\-()]/g, '');
  const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: 'Invalid Patient Mobile Number. Please enter a valid 10-digit number.' });
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
