# 🎓 Intelligent Placement Management System (IPMS Elite v3.0)

> **Next-Generation Autonomous Campus Placement, AI Assessment & Recruitment Intelligence Ecosystem**

[![Vercel Deployment](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://intelligent-placement-management-sy.vercel.app)
[![React 18](https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8E75FF?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20v3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-43%20Passed-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev/)

---

## 🌟 Overview

The **Intelligent Placement Management System (IPMS)** transforms university campus placements from fragmented spreadsheets and manual email threads into an autonomous, forensic-grade, AI-orchestrated ecosystem.

Built with **Stitch v3 "Engineered Futurism & Deep Space Void"** aesthetic, IPMS unites university administrators, visiting company recruiters, and student candidates into a single synchronized platform.

---

## 🚀 Key Features

### 1. 👑 Admin Placement Operations Command Center
- **3D Glassmorphic Bento Grid**: Real-time metrics with luminous glowing borders, placement velocity charts, and active drive timelines.
- **Live Assessment Telemetry**: Real-time candidate proctoring feed tracking tab switches, fullscreen departures, and auto-submissions.
- **Company Invitation Engine**: Tokenized invitation workflow dispatching branded invitation emails directly from the admin's Gmail to corporate recruiters.

### 2. 🎙️ Placement Oracle Voice AI Assistant
- **Google Gemini 2.5 Flash Brain**: Live real-time natural language reasoning over candidate records, CGPA rankings, backlogs, company drives, and integrity logs.
- **Speech-to-Text (STT)**: Browser-native microphone voice dictation.
- **Text-to-Speech (TTS)**: Reads analytical reports and queries aloud with dynamic soundwave equalizer visualization.

### 3. 🏢 Dedicated Recruiter Portal (`/company`)
- **Self-Service Recruiter Onboarding**: Tokenized registration link (`/company/register?token=...`) auto-provisions company profiles and permissions.
- **Custom Assessment Builder**: Recruiters can construct tailored rounds with customizable cutoffs and registration windows.
- **Strict Registration Deadlines & Lockout**: Enforces strict cutoffs where unregistered candidates are barred from accessing tests.
- **Forensic Drive Reports**: Exportable CSV candidate rosters and print views strictly scoped to each company's drives.

### 4. 🎓 Student Hub & Anti-Cheat Assessment Engine
- **Automated Eligibility Engine**: Real-time qualification screening against company CGPA, backlog, and branch criteria.
- **AI-Powered Proctoring**: Live webcam monitoring with object/person detection, tab switch counters, and automatic timeouts.
- **Personalized AI Career Feedback**: Gemini-generated 3-part improvement plans highlighting concepts to revise after tests.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (SPA), TypeScript, Vite 5 |
| **UI & Styling** | Tailwind CSS v3, shadcn/ui, Framer Motion, Lucide Icons |
| **AI Intelligence** | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| **Database & Auth** | Supabase (PostgreSQL, Row-Level Security, Realtime, OAuth) |
| **Email Delivery** | Gmail SMTP (Nodemailer) + Vercel Serverless Function Relay |
| **Computer Vision** | TensorFlow.js, COCO-SSD (Webcam proctoring) |
| **Voice Processing** | Web Speech API (`SpeechRecognition`, `SpeechSynthesisUtterance`) |
| **Testing Suite** | Vitest, React Testing Library, jsdom (43/43 unit tests passing) |
| **Hosting & CI/CD** | Vercel (Production Cloud Edge) |

---

## 📂 Project Structure

```
├── api/
│   └── send-email.ts          # Vercel serverless Gmail SMTP relay
├── public/                    # Static assets & 3D hero imagery
├── src/
│   ├── components/
│   │   ├── 3d/                # GlassCard & AnimatedBackground components
│   │   ├── admin/             # InviteCompanyDialog & admin widgets
│   │   ├── assistant/         # AdminAIAssistant (Voice STT/TTS + Gemini)
│   │   ├── landing/           # 3D landing page sections
│   │   └── ui/                # shadcn/ui component library
│   ├── hooks/
│   │   ├── useAuth.tsx        # Role-based authentication & auto-provisioning
│   │   ├── useSpeech.ts       # Voice AI Speech-to-Text & Text-to-Speech
│   │   └── useSessionTimeout  # Admin inactivity session guards
│   ├── lib/
│   │   └── gemini.ts          # Google Gemini 2.5 Flash AI client & helpers
│   ├── pages/
│   │   ├── admin/             # Command Center, Analytics, Reports, Tests, Leaderboard
│   │   ├── company/           # Recruiter Dashboard, Tests, Candidates, Reports, Register
│   │   └── student/           # Dashboard, My Tests, Results, Schedule, Profile, Companies
│   ├── test/                  # Automated Vitest test suites (43 tests)
│   └── App.tsx                # Role-gated route architecture
└── supabase/                  # PostgreSQL migrations & Edge Functions
```

---

## ⚙️ Quickstart & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/RoshanGowdaR/Intelligent-Placement-Management-System.git
cd Intelligent-Placement-Management-System
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_PROJECT_ID="xvkswalqrepcdwkanxaz"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_185TMklN9X-lL4Ds2wv2IA_F4J_VFJE"
VITE_SUPABASE_URL="https://xvkswalqrepcdwkanxaz.supabase.co"
VITE_GEMINI_API_KEY="your-gemini-api-key"
GEMINI_API_KEY="your-gemini-api-key"
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-google-app-password"
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### 5. Run Test Suite
```bash
npm test
```

---

## 🌐 Production Deployment (Vercel)

1. Connect repository on **[Vercel](https://vercel.com)**.
2. Add the environment variables from `.env` in **Vercel > Settings > Environment Variables**.
3. Deploy!

---

## 👥 Contributors & Authors

- **Lead Developer & Maintainer**: [Roshan Gowda R](https://github.com/RoshanGowdaR) (`gowdaroshan49@gmail.com`)

---

## 📄 License
This project is licensed under the MIT License.
