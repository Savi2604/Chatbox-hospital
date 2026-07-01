# Medical Triage and Appointment Scheduling System

A full-stack application for intelligent patient routing and appointment scheduling.

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** React, Vite
- **Styling:** Custom CSS with modern healthcare UI

## Local Development

### Backend Setup
```bash
cd backend
npm install
node server.js
```
Server runs on http://localhost:5000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

## Deployment

### Option 1: Render (Backend) + Vercel (Frontend) - Recommended Free Option

#### Backend on Render
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect your GitHub repository
5. Configure:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:**
     - `PORT=5000`
     - `NODE_ENV=production`
6. Deploy - you'll get a URL like `https://medical-triage-backend.onrender.com`

#### Frontend on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Output Directory:** `frontend/dist`
4. Add Environment Variable:
   - `VITE_API_URL=https://medical-triage-backend.onrender.com` (use your actual backend URL)
5. Deploy - you'll get a URL like `https://medical-triage.vercel.app`

### Option 2: Heroku (Backend) + Netlify (Frontend)

#### Backend on Heroku
```bash
# Install Heroku CLI
heroku create medical-triage-backend
heroku buildpacks:set heroku/nodejs
git push heroku main
```

#### Frontend on Netlify
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command:** `cd frontend && npm install && npm run build`
   - **Publish directory:** `frontend/dist`
3. Add environment variable: `VITE_API_URL=https://medical-triage-backend.herokuapp.com`

### Option 3: Single Platform (Railway)

Railway can host both frontend and backend in one project:
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add two services:
   - Backend service: Node.js, start with `node server.js`
   - Frontend service: Vite, build with `npm run build`
4. Railway will provide URLs for both

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=production
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.com
```

## API Endpoints

### POST /api/triage
Evaluates patient symptoms and recommends department.
```json
{
  "patientId": "P101",
  "currentSymptoms": "Blurry vision and seeing spots"
}
```

### POST /api/appointments
Books an appointment with a doctor.
```json
{
  "patientId": "P101",
  "doctorId": "D101",
  "slot": "09:00"
}
```

## Features

- **Smart Triage Engine:** Clinical rule-based routing to appropriate specialists
- **Patient Management:** In-memory database with patient history tracking
- **Appointment Scheduling:** Real-time slot availability and booking
- **Modern UI:** Clean healthcare-themed interface with responsive design
- **Cross-Origin Support:** CORS enabled for seamless frontend-backend communication

## Test Patients

- **P101:** John Doe (Diabetes, Hypertension)
- **P102:** Jane Smith (Asthma, Allergies)
- **P103:** Robert Lee (Chronic Back Pain)

## License

ISC
