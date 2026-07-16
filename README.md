# 🚗 FireStorm - AI Powered Vehicle Insurance & Warranty Claim Damage Assessor

> An AI-powered platform that automates vehicle insurance and warranty claim assessment using Computer Vision, Explainable AI, and Fraud Detection.

---

## 📌 Problem Statement

**PS-008: Automated Warranty / Insurance Claim Damage Assessor**

Develop an AI-driven damage assessment platform that automates the vehicle insurance and warranty claim process by analyzing images of damaged vehicles. The platform should detect and classify damage, estimate repair costs, identify potentially fraudulent claims, and generate explainable recommendations.

---

# 🚀 Features

### ✅ AI Damage Detection

- Upload vehicle damage images
- Automatic damage detection using a pretrained YOLO model
- Damage classification
- Confidence scoring

---

### ✅ AI Claim Assessment

- Explainable assessment generated using **Google Gemini**
- Human-readable damage summary
- Claim recommendation with confidence

---

### ✅ Repair Cost Estimation

- Rule-based repair estimation engine
- Cost breakdown based on detected damage
- Transparent pricing logic

---

### ✅ Fraud Detection

- Duplicate image detection
- Perceptual image hashing
- Image metadata validation
- Fraud flag generation

---

### ✅ Secure Authentication

- Email/password authentication
- JWT-based session management
- Supabase Authentication

---

### ✅ Dashboard

- View submitted claims
- Track assessment status
- Review historical claims
- AI-generated assessment reports

---

### ✅ Cloud Storage

- Vehicle images stored securely using Supabase Storage

---

# 🏗 Tech Stack

## Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Axios

---

## Backend

- Next.js API Routes
- TypeScript

---

## Database

- Supabase PostgreSQL

---

## Authentication

- Supabase Auth

---

## Storage

- Supabase Storage

---

## Computer Vision

### Pretrained Model

- YOLO (Pretrained Vehicle Damage Detection Model)


---

## Generative AI

Provider:

**Google Gemini**

Purpose:

- Damage explanation
- Human-readable assessment
- Explainable claim recommendation

Gemini is **not** responsible for damage detection or repair cost estimation.

---

## AI Pipeline

```text
Vehicle Image
        │
        ▼
Pretrained YOLO Model
        │
        ▼
Damage Detection
        │
        ▼
Damage Classification
        │
        ▼
Repair Cost Estimation
        │
        ▼
Fraud Detection
        │
        ▼
Google Gemini
        │
        ▼
Explainable Assessment
```

---

# 📂 Project Structure

```
firestorm/

├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── lib/
│
├── backend/
│   ├── app/
│   ├── api/
│   ├── lib/
│   ├── services/
│   └── models/
│
└── README.md
```

---

# 🛡 Security Features

- JWT Authentication
- Role-based access
- Input validation
- File type validation
- Image size validation
- Rate limiting
- Secure Supabase Storage
- Protected API routes
- Duplicate image detection
- Audit logging

---

# 📸 Workflow

```
User Login
      │
      ▼
Create Claim
      │
      ▼
Upload Vehicle Image
      │
      ▼
Image Stored in Supabase
      │
      ▼
YOLO Damage Detection
      │
      ▼
Damage Classification
      │
      ▼
Repair Cost Estimation
      │
      ▼
Fraud Analysis
      │
      ▼
Gemini Explanation
      │
      ▼
Assessment Report
```

---

# ⚙ Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
```

---

# 🚀 Running Locally

## Install dependencies

```bash
npm install
```

---

## Configure environment

Create

```
.env.local
```

Add your environment variables.

---

## Run

```bash
npm run dev
```

---

# 👥 Team

Developed as part of the **System Siege Hackathon**.

---

# 📄 AI Model Disclosure

### Computer Vision

- **Model:** Pretrained YOLO Vehicle Damage Detection Model
- **Purpose:** Vehicle damage detection and classification
- **Training:** No custom training or fine-tuning performed.

### Generative AI

- **Provider:** Google Gemini
- **Purpose:** Generate explainable assessment summaries and recommendations.
- **Model Usage:** Explanation only. Damage detection and repair estimation are performed separately.

---

# 📈 Future Enhancements

- Multi-image claim assessment
- Video damage inspection
- OCR for insurance documents
- Real-time claim tracking
- Advanced fraud analytics
- Repair shop recommendation engine

---

# 📜 License

This project was developed for educational and hackathon purposes.
