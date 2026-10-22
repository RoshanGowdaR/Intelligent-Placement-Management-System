# 🔌 API Specification & Endpoint Documentation
## Intelligent Placement Management System (IPMS Elite)

---

### Overview
IPMS Elite exposes edge serverless microservices via Vercel Functions alongside auto-generated Supabase PostgREST endpoints. All communications require TLS 1.3 encryption and JSON payloads.

---

## 1. Authentication & Security Headers

All authenticated client requests to Supabase PostgREST and Vercel Edge functions must supply:
```http
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_SUPABASE_JWT_TOKEN>
Content-Type: application/json
```

---

## 2. Serverless Edge Endpoints

### 2.1 `POST /api/gemini`
Routes natural language inference to Groq Cloud (`llama-3.3-70b-versatile`) or Google Gemini 2.5 Flash with zero browser key leaks.

#### Request Headers
| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `string` | Yes | `application/json` |

#### Request Body
```json
{
  "prompt": "Synthesize 5 Aptitude MCQs on Time & Work for campus technical test.",
  "systemInstruction": "You are an expert examiner. Return a strict JSON array of 4-option MCQs."
}
```

#### Success Response (`200 OK`)
```json
{
  "text": "[\n  {\n    \"id\": \"98a3f124-b102-4c28-98e3-0c4820849102\",\n    \"type\": \"mcq\",\n    \"subject\": \"Aptitude\",\n    \"topic\": \"Time & Work\",\n    \"text\": \"A can complete a project in 10 days...\",\n    \"options\": [\"6 days\", \"8 days\", \"12 days\", \"15 days\"],\n    \"correct_answer\": \"A\",\n    \"explanation\": \"Combined rate = 1/10 + 1/15 = 1/6 per day. Time = 6 days.\",\n    \"points\": 1\n  }\n]"
}
```

#### Error Responses
- **`400 Bad Request`**:
  ```json
  { "error": "Prompt parameter is missing or empty." }
  ```
- **`429 Too Many Requests`**:
  ```json
  { "error": "AI provider rate limit reached. Switched to fallback provider." }
  ```
- **`500 Internal Server Error`**:
  ```json
  { "error": "Upstream AI inference failed." }
  ```

---

### 2.2 `POST /api/send-email`
Dispatches automated tokenized invitations and recruitment notifications using Gmail SMTP transport.

#### Request Body
```json
{
  "to": "talent@microsoft.com",
  "subject": "Campus Recruitment Drive 2026 Invitation",
  "html": "<p>You have been invited by the university placement cell. Register at: https://univ.edu/company/register?token=abc-123</p>"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "messageId": "<d781b2-1082-9382@mail.gmail.com>"
}
```

#### Error Responses
- **`400 Bad Request`**: Missing `to`, `subject`, or `html`.
- **`500 Internal Server Error`**: SMTP authentication failure or network timeout.

---

## 3. Supabase PostgREST API Integration

### 3.1 Student Profiles (`/rest/v1/profiles`)
- **`GET /rest/v1/profiles?id=eq.{user_id}&select=*`**: Fetches the authenticated student's profile.
- **`PATCH /rest/v1/profiles?id=eq.{user_id}`**: Updates candidate profile details, marks cards, or verified skills.

### 3.2 Candidate Exam Attempts (`/rest/v1/test_attempts`)
- **`POST /rest/v1/test_attempts`**: Creates a test attempt submission record.
  ```json
  {
    "test_id": "test-uuid",
    "student_id": "student-uuid",
    "total_score": 42,
    "passed": true,
    "tab_switches": 1,
    "auto_submitted": false,
    "proctor_events": [
      { "timestamp": "2026-10-22T10:15:00Z", "event": "tab_switch" }
    ],
    "answers": { "q1": "A", "q2": "C" }
  }
  ```

### 3.3 Multi-Round Sequential Gating (`/rest/v1/round_participants`)
- **`GET /rest/v1/round_participants?drive_round_id=eq.{round_id}&student_id=eq.{user_id}&select=status,score`**: Checks candidate gating status (`qualified`, `not_qualified`, `pending`).
