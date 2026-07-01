# Medical Triage System - AI-Powered Backend

## Overview
This is an AI-powered medical triage system that uses OpenAI's GPT-4o-mini model to analyze patient symptoms and recommend appropriate medical departments, hospitals, and doctors.

## Features
- **AI-Powered Triage**: Uses OpenAI API for intelligent symptom analysis and department recommendation
- **Fallback System**: Automatically falls back to rule-based triage if AI fails
- **Hospital Recommendations**: AI generates realistic Indian hospital recommendations based on specialty
- **Appointment Booking**: In-memory appointment system with mobile confirmation logging
- **Dynamic Doctor Slots**: Real-time slot availability management

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure OpenAI API Key
Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Note**: Without an API key, the system will automatically use the fallback rule-based system.

### 3. Start the Server
```bash
node server.js
```

The server will start on port 5000 and display:
```
Medical Triage Server running on port 5000
AI Triage Engine: Enabled (OpenAI)  # or Fallback Mode (Rule-based)
```

## API Endpoints

### POST /api/triage
Analyzes patient symptoms and recommends department, hospital, and available doctors.

**Request Body:**
```json
{
  "patientId": "P101",
  "currentSymptoms": "chest pain and shortness of breath"
}
```

**Response:**
```json
{
  "patient": {
    "id": "P101",
    "name": "John Doe",
    "history": ["Diabetes", "Hypertension"],
    "mobile": "+91-9876543210"
  },
  "triageResult": {
    "department": "Cardiology",
    "reasoning": "Cardiovascular symptoms detected. Patient requires immediate cardiac evaluation...",
    "recommendedHospital": "Apollo Hospitals",
    "hospitalLocation": "Chennai, Tamil Nadu",
    "hospitalPhone": "+91-44-28294444",
    "doctors": [
      {
        "id": "D102",
        "name": "Dr. Michael Chen",
        "specialty": "Cardiology",
        "department": "Cardiology",
        "slots": ["09:30", "10:30", "11:30", "14:30", "15:30"]
      }
    ]
  }
}
```

### POST /api/appointments
Books an appointment with a doctor.

**Request Body:**
```json
{
  "patientId": "P101",
  "doctorId": "D102",
  "slot": "09:30"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment booked successfully for John Doe with Dr. Michael Chen at 09:30",
  "appointment": {
    "id": "APT1234567890",
    "patientId": "P101",
    "patientName": "John Doe",
    "patientMobile": "+91-9876543210",
    "doctorId": "D102",
    "doctorName": "Dr. Michael Chen",
    "slot": "09:30",
    "bookingDate": "2026-07-01T09:30:00.000Z",
    "confirmationSent": true,
    "confirmationMessage": "SMS sent to +91-9876543210: Appointment confirmed with Dr. Michael Chen at 09:30"
  },
  "confirmation": "Confirmation sent to +91-9876543210"
}
```

### GET /api/appointments
Retrieves all appointments (for admin/debugging).

**Response:**
```json
{
  "total": 1,
  "appointments": [...]
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "Server is running",
  "timestamp": "2026-07-01T09:30:00.000Z"
}
```

## Available Departments
- Cardiology
- Gynecology
- Ophthalmology
- Pulmonology
- General Medicine

## Available Doctors
- **Ophthalmology**: Dr. Sarah Johnson
- **Cardiology**: Dr. Michael Chen
- **Pulmonology**: Dr. Emily Rodriguez
- **General Medicine**: Dr. David Kim, Dr. Lisa Anderson
- **Gynecology**: Dr. Maria Garcia, Dr. Jennifer Lee

## AI Triage System

### How It Works
1. Patient submits symptoms through the frontend
2. Backend sends symptoms to OpenAI GPT-4o-mini
3. AI analyzes symptoms and medical history
4. AI returns structured JSON with:
   - Recommended department
   - Clinical reasoning
   - Recommended hospital (Indian)
   - Hospital location (Indian)
   - Hospital contact number
5. System matches department with available doctors
6. Returns complete triage result to frontend

### Fallback System
If AI API fails or returns invalid data, the system automatically falls back to a rule-based triage system with predefined rules for common symptoms.

## Appointment System
- In-memory storage for appointments
- Mobile confirmation logging
- Real-time slot availability updates
- Appointment ID generation with timestamp

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required for AI features)

## Production Considerations
- Replace in-memory databases with persistent storage (MongoDB, PostgreSQL)
- Implement actual SMS gateway for confirmations
- Add authentication and authorization
- Implement rate limiting for API calls
- Add comprehensive logging and monitoring
- Use environment-specific configurations
