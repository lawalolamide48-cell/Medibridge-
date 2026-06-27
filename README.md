# MediBridge Full-Stack Healthcare Portal

MediBridge is a responsive healthcare web project by **lawalolamide48-cell**. It includes a public landing page, authentication screens, a patient dashboard, clickable medical departments, appointment support, and a backend-powered medical AI assistant.

The AI assistant gives general medical information only. It does not diagnose, prescribe, or replace a doctor.

## Features

- Responsive landing page, authentication flow, and patient dashboard
- Node.js backend with no external packages required
- Clickable departments with readable service details, doctors, and visit reasons
- Medical AI support endpoint for symptom, medication, appointment, and general health questions
- Demo login and real generated OTP activation flow
- Appointment API for creating and listing appointments
- Visible project attribution for the owner
- Privacy Policy and Terms of Service pages

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Node.js HTTP server
- JSON data for departments
- No database setup required for the demo version

## Project Structure

```text
medibridge-complete/
├── assets/
│   ├── hero-doctor.png
│   ├── hero-image.png
│   ├── medibridge-api.js
│   └── medibridge-enhancements.css
├── data/
│   └── departments.json
├── auth.html
├── dashboard.html
├── index.html
├── privacy.html
├── terms.html
├── package.json
├── server.js
└── README.md
```

## How To Run

1. Open the project folder in a terminal.
2. Start the backend and frontend server:

```bash
npm start
```

3. Open:

```text
http://localhost:3000
```

Demo login:

```text
Patient ID: MB-2026-001
Password: password123
```

Demo OTP:

```text
The backend now generates a fresh 6-digit OTP for each request.
```

## Real OTP Email and SMS Setup

MediBridge generates real OTP codes on the backend and verifies them with `/api/auth/verify-otp`. To deliver those codes to real email addresses and phone numbers, add provider credentials before running the server.

Email delivery uses SendGrid:

```bash
set SENDGRID_API_KEY=your_sendgrid_api_key
set SENDGRID_FROM=verified_sender@example.com
```

SMS delivery uses Twilio:

```bash
set TWILIO_ACCOUNT_SID=your_twilio_account_sid
set TWILIO_AUTH_TOKEN=your_twilio_auth_token
set TWILIO_FROM=your_twilio_phone_number
```

Then start the app:

```bash
npm start
```

If these variables are not set, the backend will still generate OTP sessions, but it will report that provider setup is required instead of pretending a message was sent.

## Backend API

```text
GET  /api/health
GET  /api/departments
GET  /api/departments/:slug
POST /api/ai/chat
POST /api/auth/login
POST /api/auth/activate
POST /api/auth/verify-otp
POST /api/auth/reset-password
GET  /api/appointments
POST /api/appointments
```

Example AI request:

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"I have a headache and fever\"}"
```

## Notes

This is a professional demo backend. For production, add a real database, password hashing, secure sessions, rate limits, stronger input validation, audit logs, provider webhook handling, and a medically reviewed AI safety layer.

## Author

Built by **lawalolamide48-cell** as the MediBridge full-stack healthcare project.
