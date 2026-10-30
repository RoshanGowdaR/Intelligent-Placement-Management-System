# 📊 Data Card: Datasets, Question Banks & Telemetry
## Intelligent Placement Management System (IPMS Elite)

---

### Dataset Details
- **Dataset Name**: IPMS Benchmark Assessment & Placement Telemetry Data
- **Version**: 1.0.0
- **Maintainer**: IPMS Platform Engineering & Academic Board
- **License**: MIT / Creative Commons Attribution 4.0 International (CC-BY 4.0)

---

## 1. Dataset Motivation & Purpose

The IPMS data ecosystem comprises two primary data domains:
1. **Academic Assessment Question Banks**: Standardized aptitude, logical reasoning, and computer science multiple-choice questions used for campus placements.
2. **Placement Telemetry & Integrity Logs**: Real-world academic profiles, mock drive submissions, and proctoring violation logs used to validate scoring algorithms and anti-cheat models.

---

## 2. Dataset Composition & Schema

### 2.1 Assessment Question Bank Dataset
- **Total Questions in Core Bank**: 500+ curated questions across Quantitative Aptitude, Logical Reasoning, Verbal Ability, Data Structures & Algorithms, OS, DBMS, and Computer Networks.
- **Data Structure**:
  ```json
  {
    "id": "uuid-v4",
    "subject": "Aptitude | Technical | Verbal",
    "topic": "Quantitative Aptitude | Trees & Graphs | SQL",
    "difficulty": "easy | medium | hard",
    "text": "Question statement text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "A | B | C | D",
    "explanation": "Step-by-step mathematical or conceptual explanation",
    "points": 1
  }
  ```

### 2.2 Academic Candidate Profile Benchmarks
- Synthetic student candidate cohorts representing typical engineering undergraduate batches.
- **Fields**: Name, USN, Department, CGPA (0.00 – 10.00), Active Backlogs, Verified Skills, Resume URL, GitHub/LinkedIn links.

### 2.3 Proctoring Event Telemetry
- Timestamped telemetry entries recorded during proctored exam sessions:
  ```json
  {
    "timestamp": "2026-10-22T12:30:15Z",
    "event": "tab_switch | object_detected | face_missing | auto_submit",
    "type": "cell phone | multiple_faces | blur",
    "confidence": 0.82,
    "attempt_id": "attempt-uuid"
  }
  ```

---

## 3. Data Collection, Preprocessing & Anonymization

- **Synthetic Profile Generation**: Sample data used in staging and automated test suites uses synthetic student names (e.g. "Candidate Asha", "Student Hemanth") and mock USNs to prevent disclosing real student PII.
- **PII Scrubbing**: Resume files uploaded in production are stored in private Supabase buckets accessible only via authenticated admin and recruiter tokens.
- **Computer Vision Anonymization**: All video processing is performed in client-side RAM; no image frames or video streams are ever serialized or saved into databases.

---

## 4. Known Biases & Limitations

1. **Branch Representation**: Standard question banks are predominantly weighted towards Computer Science and Information Technology topics; non-circuital branches (Mechanical, Civil) require customized question banks configured by company recruiters.
2. **Grading Variations**: CGPA cutoffs assume standard 10-point scales common in Indian and international universities; universities using percentage scales (e.g. 70% cutoff) must configure company rules accordingly.

---

## 5. Licensing & Compliance

- Curated question banks are distributed under CC-BY 4.0.
- Student academic records comply with institutional privacy mandates and Family Educational Rights and Privacy Act (FERPA) guidelines.
