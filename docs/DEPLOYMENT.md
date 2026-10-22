# 🚀 Production Deployment & Operations Guide
## Intelligent Placement Management System (IPMS Elite)

---

### Overview
This guide provides step-by-step procedures for deploying **IPMS Elite** to production environments using Vercel Cloud Edge, Docker containerization, or private institutional infrastructure.

---

## 1. Option A: Vercel Cloud Deployment (Recommended)

Vercel provides native edge hosting, automatic SSL/TLS, and zero-configuration routing for React SPAs and serverless functions (`/api/gemini`, `/api/send-email`).

### Step-by-Step Instructions:

1. **Connect Repository**:
   - Navigate to [Vercel Dashboard](https://vercel.com) &rarr; **Add New Project**.
   - Import `RoshanGowdaR/Intelligent-Placement-Management-System`.
   - Set Framework Preset to **Vite**.

2. **Configure Environment Variables**:
   In the Vercel project configuration, add the following production variables:
   | Variable Name | Environment | Value Description |
   | :--- | :--- | :--- |
   | `VITE_SUPABASE_URL` | Production | `https://xvkswalqrepcdwkanxaz.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Production | Supabase Anon / Publishable Key |
   | `VITE_GEMINI_API_KEY` | Production | Primary Google Gemini 2.5 Flash Key |
   | `VITE_GEMINI_API_KEY_BACKUP` | Production | Secondary backup Gemini API Key |
   | `VITE_GROQ_API_KEY` | Production | Primary Groq Cloud API Key |
   | `GMAIL_USER` | Production | Gmail SMTP sender address |
   | `GMAIL_APP_PASSWORD` | Production | Gmail App Password (16-character) |

3. **Deploy**:
   - Click **Deploy**. Vercel triggers `npm run build` and provisions edge routes.

4. **Custom Domain & SSL**:
   - Go to **Project Settings &rarr; Domains**.
   - Add your university domain (e.g., `placements.university.edu`).
   - Configure CNAME and A records in your DNS provider; Vercel automatically issues an SSL certificate.

---

## 2. Option B: Docker Containerized Deployment

Deploy the pre-configured multi-stage production Docker container on AWS ECS, GCP Cloud Run, or self-hosted Linux servers:

```bash
# 1. Build the production Docker image
docker build -t ipms-elite:latest .

# 2. Run the container on port 80
docker run -d \
  -p 8080:80 \
  --restart unless-stopped \
  --name ipms-production \
  ipms-elite:latest

# 3. Verify container health
curl -I http://localhost:8080
```

---

## 3. Post-Deployment Verification Checklist

After deploying to production, execute this verification run:

- [ ] **Home Page Load**: Navigate to root URL; verify hero section and 3D background render in $< 2$ seconds.
- [ ] **Student Login**: Log in with student credentials; confirm redirection to `/dashboard`.
- [ ] **Assessment Registration**: Confirm test cards display active registration status without RLS errors.
- [ ] **AI Assistant Check**: Open `/admin/ai`; ask `"give me placement summary"`; confirm Recharts bar chart renders.
- [ ] **Document Upload**: Upload a test PDF resume ($\le 1$ MB); verify public URL generated.
- [ ] **Webcam Proctoring**: Start a mock assessment; verify webcam initialized and TensorFlow COCO-SSD loaded without console errors.

---

## 4. Disaster Recovery & Rollback

- **Instant Vercel Rollback**: Navigate to **Deployments** in Vercel, select the previous stable deployment, and click **Promote to Production** for zero-downtime rollback ($< 10$ seconds).
- **Database Point-in-Time Recovery (PITR)**: Supabase PostgreSQL provides automated WAL archiving with point-in-time rollbacks in case of accidental data modifications.
