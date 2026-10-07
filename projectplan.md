# 📋 Project Plan & Roadmap (IPMS Elite)

## Current Version: v3.6 Production Ready

---

## 🏁 Completed Milestones

### Phase 1: Authentication & Role Provisioning
- [x] Supabase Auth integration (Google OAuth + Email/Password).
- [x] Auto-provisioning for `admin`, `company`, and `student` roles.
- [x] Recruiter invitation tokens with automated company profile association.

### Phase 2: Recruiter Portal & Drive Orchestration
- [x] Multi-step recruiter onboarding and profile editing (`/company/onboarding?mode=edit`).
- [x] Drive rounds configuration (OA, Technical Interview, HR).
- [x] Assessment creation and real-time candidate registration window control (Open/Close anytime).
- [x] Candidate dossier viewing with resume download and certificate verification.

### Phase 3: Student Candidate Hub & Anti-Cheat Engine
- [x] Profile Studio: editable graduation year, normalized LinkedIn/GitHub URLs.
- [x] Document storage quotas for 150 students (1MB resume, 800KB certificates, mandatory internship verification).
- [x] Assessment registration with RLS resilience and local persistence.
- [x] AI-proctored test runner (webcam object detection, fullscreen lock, tab-switch monitoring).

### Phase 4: AI Question Bank & Document Processing
- [x] Dual-engine AI generator with Groq (`openai/gpt-oss-120b`) and Gemini (`gemini-2.5-flash`) automatic failover.
- [x] Resilient JSON parser (`repairAndParseQuestionsJSON`) that recovers truncated model outputs with zero syntax errors.
- [x] Client-side question extraction from `.docx` (via `mammoth`), `.pdf` (via `pdfjs-dist`), and `.txt` files directly in-browser.

### Phase 5: Multi-Role Notification Center
- [x] Left sidebar navigation link (`Notifications`) across all 3 portals: Student, Admin, and Company.
- [x] Real-time activity feed connected to Supabase Realtime table `notifications`.
- [x] Category filtering, keyword search, unread badges, and Mark All Read.
- [x] Individual dismissal and Clear All actions with permanent storage preservation.

---

## 🔮 Future Roadmap & Enhancements

1. **WebRTC Video Interview Rooms**:
   - Integrated peer-to-peer recruiter-candidate live video interview module directly inside the platform.
2. **Automated Offer Letter Generation**:
   - Dynamic PDF offer generation with digital signatures.
3. **Advanced Analytics & Cohort Benchmarking**:
   - Multi-year placement statistics comparing batches and departments.
