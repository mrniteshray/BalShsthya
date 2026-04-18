
# Care Co-Pilot AI-Powered Medicine Finder

![Care Co-Pilot](https://img.shields.io/badge/AI-Powered-Care--Co--Pilot-blue)

## Overview

The Care Co-Pilot is an **AI-powered medicine assistant** for parents, designed to provide educational guidance about over-the-counter (OTC) medications for children. It provides intelligent guidance while ensuring strict safety protocols and disclaimers.

> ⚠️ **CRITICAL SAFETY DISCLAIMER:** This tool is for educational purposes only and is **NOT a substitute for professional medical advice**. Always consult a qualified healthcare provider before giving any medication to your child.

---

## 🚀 Quick Start Tutorial

Follow these steps to get the Care Co-Pilot feature running locally:

### 1. Clone the Repository
```bash
git clone -b main https://github.com/ErSakshiBhor/bal.git
cd bal
````

### 2. Backend Setup

```bash
cd server
# Install required packages
npm install
# ⚠️ IMPORTANT: Install the generative-ai package for AI functionality
npm install @google/generative-ai
```

### 3. Frontend Setup

```bash
cd ../client
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the `server` folder with the following:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

### 5. Start the Application

```bash
# Backend
cd ../server
npm run dev

# Frontend
cd ../client
npm run dev
```

> Your server should now run at `http://localhost:5000` and the frontend at `http://localhost:5173` (or as assigned by Vite).

---

## ⚠️ Critical Safety Features

### Mandatory Safety Disclaimers

Every response from the Care Co-Pilot includes this disclaimer:

```
⚠️ CRITICAL SAFETY DISCLAIMER ⚠️

This information is for educational purposes only and is NOT a substitute for professional medical advice. Always consult a qualified pediatrician before giving any medication.

IMPORTANT:
- Never give medication to children under 2 years without consulting a doctor
- Always verify dosage with a healthcare professional
- If symptoms worsen or persist, seek immediate medical attention
- This AI cannot diagnose conditions or provide treatment
```

### Safety Guidelines Implemented

* **Age Validation:** Only children aged 0–18 years are accepted
* **Weight Validation:** Optional, validated between 0–200 kg
* **Conservative AI Responses:** Temperature 0.3 for safe and consistent output
* **Professional Consultation Emphasis:** Always recommends consulting a doctor
* **Emergency Guidelines:** Clear instructions for urgent care

---

## Features

### 1. Intelligent Symptom Analysis

* Analyzes child's age, weight, and symptoms
* Provides age-appropriate medication suggestions
* Includes educational dosage guidance

### 2. Educational Information

* Lists active ingredients to look for in medications
* Explains potential side effects and contraindications
* Highlights important safety considerations

### 3. User-Friendly Interface

* Clean, intuitive design
* Real-time validation
* Loading states and error handling
* Fully responsive for all devices

### 4. Comprehensive Safety Information

* Emergency symptom recognition
* Guidelines for when to contact a doctor
* Clear escalation procedures

---

## Technical Implementation

### Backend (Node.js / Express)

**API Endpoints**

* `POST /carecopilot/chat` – Chat-based consultation
* `POST /carecopilot/voice` – Voice input consultation
* `POST /carecopilot/voice/reset` – Reset voice session

**Key Components**

* Gemini / OpenAI Integration for AI-powered responses
* Input validation for age, weight, and symptoms
* Logging for monitoring and safety
* Error handling for API or service failures

---

### Frontend (React)

**Components**

* `CareCoPilot.jsx` – Main page with form and response display
* `DoctorAvatar.jsx`, `CallPanel.jsx`, `ChatModal.jsx` – Supporting UI components
* Real-time validation and loading states
* Prominent safety warnings

**Usage**

* Accessible at `/care-co-pilot`
* Fill in child's age, weight (optional), symptoms, and additional notes
* Click **Get Medicine Guidance**
* Review AI-generated educational guidance

---

## API Testing

Test health endpoint:

```bash
curl http://localhost:5000/api/care-co-pilot/health
```

Test main consultation endpoint:

```bash
curl -X POST http://localhost:5000/api/care-co-pilot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "childAge": "5",
    "childWeight": "20",
    "symptoms": "fever 38°C, runny nose",
    "additionalNotes": "no known allergies"
  }'
```

---

## Data Privacy

* No personal health information is permanently stored
* API calls logged only for monitoring and safety
* All data transmitted securely over HTTPS

---

## Future Enhancements

* Multi-language support
* Symptom image recognition
* Drug interaction checking
* Emergency contact integration
* Advanced dosage calculation

---

## Contributing

1. Prioritize **child safety**
2. Ensure **medical accuracy**
3. Test thoroughly before deployment
4. Update documentation for any changes

---

## Support

* Report issues in the GitHub repository
* Contact development team
* For medical emergencies, contact emergency services immediately

---

> **Remember:** This tool is for **educational purposes only**. Always consult a qualified healthcare provider for medical advice and treatment.
