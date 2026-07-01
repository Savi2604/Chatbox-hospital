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
  'P101': {
    id: 'P101',
    name: 'John Doe',
    history: ['Diabetes', 'Hypertension'],
    mobile: '+91-9876543210'
  },
  'P102': {
    id: 'P102',
    name: 'Jane Smith',
    history: ['Asthma', 'Allergies'],
    mobile: '+91-9876543211'
  },
  'P103': {
    id: 'P103',
    name: 'Robert Lee',
    history: ['Chronic Back Pain'],
    mobile: '+91-9876543212'
  }
};

const appointmentsDB = [];
const spawnedDoctors = new Map(); // Global cache for spawned doctors: doctorId -> doctor object
const patientTriageCache = new Map(); // Patient triage consistency cache: patientId:Symptoms -> recommendation & doctors

// HELPER TO DYNAMICALLY SPAWN INDIAN DOCTOR PROFILES
function spawnDynamicDoctors(department, hospitalName, hospitalLocation, hospitalPhone) {
  const firstNames = ['Rajesh', 'Amit', 'Sanjay', 'Vikram', 'Priya', 'Anjali', 'Sunita', 'Meera', 'Arjun', 'Deepak', 'Vijay', 'Sneha', 'Rohan', 'Neha'];
  const lastNames = ['Sharma', 'Patel', 'Verma', 'Gupta', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Choudhury', 'Joshi', 'Mehta', 'Sen', 'Das', 'Mishra'];
  
  const specialtyMap = {
    'Cardiology': 'Cardiologist',
    'Gynecology': 'Gynecologist',
    'Pulmonology': 'Pulmonologist',
    'Ophthalmology': 'Ophthalmologist',
    'General Medicine': 'General Physician'
  };
  
  const specialty = specialtyMap[department] || 'General Practitioner';
  
  // Spawn 2 to 3 doctors
  const count = Math.floor(Math.random() * 2) + 2; // 2 or 3
  const doctors = [];
  
  // Standard sequences of open calendar slots
  const slotSequences = [
    ['09:00', '11:15', '14:30'],
    ['10:00', '12:30', '15:15', '16:45'],
    ['08:30', '11:00', '13:45', '15:30'],
    ['09:30', '12:00', '14:15', '16:00'],
    ['11:15', '14:30', '17:00']
  ];
  
  for (let i = 0; i < count; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const doctorId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const slots = [...slotSequences[Math.floor(Math.random() * slotSequences.length)]];
    
    const doc = {
      id: doctorId,
      name: `Dr. ${fName} ${lName}`,
      specialty: specialty,
      department: department,
      slots: slots,
      hospitalName: hospitalName,
      hospitalLocation: hospitalLocation,
      hospitalPhone: hospitalPhone
    };
    
    // Cache the doctor details globally for lookup during booking
    spawnedDoctors.set(doctorId, doc);
    doctors.push(doc);
  }
  
  return doctors;
}

// LIVE LLM STREAMING PIPELINE USING OPENAI
async function getAIRecommendation(history, currentSymptoms) {
  // If API key is mock or empty, return simulated OpenAI response to prevent complete crash
  if (apiKey === 'mock-api-key') {
    console.log('[OPENAI] API Key is missing or default. Returning simulated recommendation.');
    return simulateTriageResult(currentSymptoms);
  }

  try {
    const systemInstruction = `You are a medical triage AI assistant. Analyze patient symptoms and medical history to recommend the appropriate medical department.
Available departments: Cardiology, Gynecology, Pulmonology, Ophthalmology, General Medicine.

You must output a strict, raw JSON block matching this structure:
{
  "department": "Cardiology / Gynecology / Pulmonology / Ophthalmology / General Medicine",
  "reasoning": "Clinical justification mapping the submitted symptoms.",
  "recommendedHospital": "Realistic premium hospital name in India.",
  "hospitalLocation": "Realistic specific metro city branch/address in India.",
  "hospitalPhone": "Realistic standard Indian hospital contact helpline number (+91 XX XXXX XXXX)"
}

Do not include any styling, markdown codeblocks (like \`\`\`json), or additional conversational text. Just output the raw JSON object.`;

    const prompt = `Patient Medical History: ${history.length > 0 ? history.join(', ') : 'None recorded'}
Current Symptoms: ${currentSymptoms}

Please analyze the details and provide the recommendation in the specified JSON format.`;

    console.log('\n--- [OPENAI STREAM START] ---');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
      stream: true
    });
    
    let completeResponse = '';
    for await (const chunk of completion) {
      const chunkText = chunk.choices[0]?.delta?.content || '';
      completeResponse += chunkText;
      process.stdout.write(chunkText); // Stream console trace
    }
    console.log('\n--- [OPENAI STREAM END] ---\n');

    let cleaned = completeResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const parsedResponse = JSON.parse(cleaned);

    // Validate structure
    if (!parsedResponse.department || !parsedResponse.reasoning || 
        !parsedResponse.recommendedHospital || !parsedResponse.hospitalLocation || !parsedResponse.hospitalPhone) {
      throw new Error('Invalid AI response structure');
    }

    const validDepartments = ['Cardiology', 'Gynecology', 'Pulmonology', 'Ophthalmology', 'General Medicine'];
    if (!validDepartments.includes(parsedResponse.department)) {
      parsedResponse.department = 'General Medicine';
    }

    return parsedResponse;
  } catch (error) {
    console.error('OpenAI Triage Error:', error.message);
    console.log('Falling back to simulated triage result due to API/quota error.');
    return simulateTriageResult(currentSymptoms);
  }
}

// Fallback simulator for when OPENAI_API_KEY is not configured
function simulateTriageResult(currentSymptoms) {
  const symptomsLower = currentSymptoms.toLowerCase();
  let result = {
    department: 'General Medicine',
    reasoning: 'Symptoms evaluated by the baseline triage system. Advised general assessment.',
    recommendedHospital: 'Max Super Speciality Hospital',
    hospitalLocation: 'Saket, New Delhi, Delhi 110017',
    hospitalPhone: '+91 11 2651 5050'
  };

  if (symptomsLower.includes('heart') || symptomsLower.includes('chest') || symptomsLower.includes('palpitation')) {
    result = {
      department: 'Cardiology',
      reasoning: 'Cardiovascular symptoms detected. Recommended immediately to cardiology specialists.',
      recommendedHospital: 'Fortis Escorts Heart Institute',
      hospitalLocation: 'Okhla Road, New Delhi, Delhi 110025',
      hospitalPhone: '+91 11 4713 5000'
    };
  } else if (symptomsLower.includes('pregnan') || symptomsLower.includes('period') || symptomsLower.includes('gynecol')) {
    result = {
      department: 'Gynecology',
      reasoning: 'Gynecological or maternity symptoms identified.',
      recommendedHospital: 'Apollo Cradle & Children’s Hospital',
      hospitalLocation: 'Koramangala, Bengaluru, Karnataka 560034',
      hospitalPhone: '+91 80 4424 4424'
    };
  } else if (symptomsLower.includes('breath') || symptomsLower.includes('cough') || symptomsLower.includes('asthma') || symptomsLower.includes('lung')) {
    result = {
      department: 'Pulmonology',
      reasoning: 'Respiratory distress or pulmonary symptoms detected.',
      recommendedHospital: 'Medanta - The Medicity',
      hospitalLocation: 'Sector 38, Gurugram, Haryana 122001',
      hospitalPhone: '+91 12 4414 1414'
    };
  } else if (symptomsLower.includes('eye') || symptomsLower.includes('vision') || symptomsLower.includes('blind') || symptomsLower.includes('blur')) {
    result = {
      department: 'Ophthalmology',
      reasoning: 'Ocular discomfort or vision-related symptoms detected.',
      recommendedHospital: 'Dr. Shroff\'s Charity Eye Hospital',
      hospitalLocation: 'Daryaganj, New Delhi, Delhi 110002',
      hospitalPhone: '+91 11 4352 4444'
    };
  }

  return result;
}

// API ENDPOINTS

// POST /api/triage - Get triage recommendation & dynamically spawn doctors
app.post('/api/triage', async (req, res) => {
  const { patientId, currentSymptoms } = req.body;

  if (!patientId || !currentSymptoms) {
    return res.status(400).json({ error: 'Patient ID and symptoms are required' });
  }

  try {
    // Fetch or register patient
    let patient = patientsDB[patientId];
    if (!patient) {
      patient = {
        id: patientId,
        name: `Patient ${patientId}`,
        history: [],
        mobile: '+91-XXXXXXXXXX'
      };
      patientsDB[patientId] = patient;
    }

    // Cache lookup key to preserve doctor lists on slot refresh
    const cacheKey = `${patientId}:${currentSymptoms.trim()}`;
    let recommendation;
    let doctors;

    if (patientTriageCache.has(cacheKey)) {
      const cached = patientTriageCache.get(cacheKey);
      recommendation = cached.recommendation;
      // Get the current live doctor states (preserving slots remaining)
      doctors = cached.doctors.map(doc => spawnedDoctors.get(doc.id)).filter(Boolean);
    } else {
      recommendation = await getAIRecommendation(patient.history, currentSymptoms);
      doctors = spawnDynamicDoctors(
        recommendation.department,
        recommendation.recommendedHospital,
        recommendation.hospitalLocation,
        recommendation.hospitalPhone
      );
      patientTriageCache.set(cacheKey, { recommendation, doctors });
    }

    res.json({
      patient,
      triageResult: {
        department: recommendation.department,
        reasoning: recommendation.reasoning,
        recommendedHospital: recommendation.recommendedHospital,
        hospitalLocation: recommendation.hospitalLocation,
        hospitalPhone: recommendation.hospitalPhone,
        doctors: doctors
      }
    });
  } catch (error) {
    console.error('Triage Processing Error:', error);
    res.status(500).json({ error: 'Failed to process triage request: ' + error.message });
  }
});

// POST /api/appointments - Book appointment & trigger confirmation
app.post('/api/appointments', (req, res) => {
  const { patientId, patientPhone, doctorId, slot, hospitalName } = req.body;

  if (!patientPhone || patientPhone.trim() === '') {
    return res.status(400).json({ error: 'Patient Mobile Number (patientPhone) is mandatory for booking confirmation.' });
  }
  if (!patientId || !doctorId || !slot) {
    return res.status(400).json({ error: 'Patient ID, Doctor ID, and appointment slot are required.' });
  }

  // Look up the dynamically spawned doctor
  const doctor = spawnedDoctors.get(doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found or session has expired.' });
  }

  // Verify and book slot
  const slotIndex = doctor.slots.indexOf(slot);
  if (slotIndex === -1) {
    return res.status(400).json({ error: 'Selected time slot is no longer available.' });
  }

  // Atomically remove slot
  doctor.slots.splice(slotIndex, 1);

  const doctorName = doctor.name;
  const hospitalLocation = doctor.hospitalLocation;
  const hospitalPhone = doctor.hospitalPhone;

  // Strict console validation trace simulation for SMS gateway
  console.log(`[SMS GATEWAY] Sending confirmation text to ${patientPhone}: Hi ${patientId}, your appointment with ${doctorName} at ${hospitalName} (${hospitalLocation}) for slot ${slot} is confirmed! Helpdesk: ${hospitalPhone}.`);

  const appointment = {
    id: `APT${Date.now()}`,
    patientId,
    patientPhone,
    doctorId,
    doctorName,
    doctorSpecialty: doctor.specialty,
    department: doctor.department,
    hospitalName,
    hospitalLocation,
    hospitalPhone,
    slot,
    bookingDate: new Date().toISOString(),
    confirmationTrace: `[SMS GATEWAY] Sent confirmation to ${patientPhone}`
  };

  appointmentsDB.push(appointment);

  res.json({
    success: true,
    message: `Appointment booked successfully with ${doctorName} at ${slot}`,
    appointment
  });
});

// GET /api/appointments - View appointments
app.get('/api/appointments', (req, res) => {
  res.json({
    total: appointmentsDB.length,
    appointments: appointmentsDB
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Medical Triage Server running on port ${PORT}`);
  console.log(`OpenAI API Client: ${apiKey !== 'mock-api-key' ? 'Enabled (OpenAI)' : 'Mock Mode (Simulated)'}`);
});
