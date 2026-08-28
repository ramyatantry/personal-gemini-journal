# Personal Gemini Journal

> **A zero-trust, enterprise-grade reflective conversational journaling platform powered by Google Gemini, Google Cloud Secret Manager, Firebase Authentication, and Google Cloud Firestore, designed for deployment on Google Cloud Run.**

[![Google Cloud Run](https://img.shields.io/badge/Google_Cloud-Cloud_Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Google Gemini API](https://img.shields.io/badge/Gemini_API-2.5_Flash-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloud Secret Manager](https://img.shields.io/badge/GCP-Secret_Manager-34A853?logo=googlecloud&logoColor=white)](https://cloud.google.com/secret-manager)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 📑 Table of Contents
1. [What Personal Gemini Journal Is](#what-personal-gemini-journal-is)
2. [Screenshots & UI Walkthrough](#screenshots--ui-walkthrough)
3. [Key Features](#key-features)
4. [High-Level Architecture](#high-level-architecture)
5. [Complete Tech Stack](#complete-tech-stack)
6. [Firebase Authentication](#firebase-authentication)
7. [Firestore Data Isolation & Security Rules](#firestore-data-isolation--security-rules)
8. [Gemini LLM Integration](#gemini-llm-integration)
9. [Secret Manager Architecture](#secret-manager-architecture)
10. [Comprehensive Security Model](#comprehensive-security-model)
11. [Threat Model & Mitigations](#threat-model--mitigations)
12. [How Google AI Studio Was Used](#how-google-ai-studio-was-used)
13. [Custom Features & UX Polish](#custom-features--ux-polish)
14. [Local Development](#local-development)
15. [Firebase Setup Guide](#firebase-setup-guide)
16. [Google Cloud Secret Manager Setup](#google-cloud-secret-manager-setup)
17. [Cloud Run Deployment Guide (`dev-tutorial=cloud-run-ai-challenge`)](#cloud-run-deployment-guide-dev-tutorialcloud-run-ai-challenge)
18. [Testing & Security Verification](#testing--security-verification)
19. [Known Limitations & Future Roadmap](#known-limitations--future-roadmap)

---

## 🌟 What Personal Gemini Journal Is

**Personal Gemini Journal** is an interactive, private mindfulness and self-reflection web application that replaces traditional passive monologue journaling with an empathetic, active-listening AI companion. 

Unlike standard notes or journaling applications:
- It guides you through emotional processing using Socratic, non-judgmental inquiries.
- It synthesizes freeform conversations into structured emotional insights, mood scores, key realizations, and actionable commitments.
- It provides **Ask My Journal**, a semantic search engine operating across all historical journal entries with citations and source references.
- It is engineered with **Zero-Trust Security**: user data is strictly isolated per Firebase UID, and all AI credentials are systematically retrieved at runtime from **Google Cloud Secret Manager** using **Application Default Credentials (ADC)** without static API keys or credentials in code.

---

## 📸 Screenshots & UI Walkthrough

| View | Description |
| :--- | :--- |
| **Active Journaling Chat** | Interactive reflection space with empathetic Gemini prompts, smart starter chips (`...`), real-time word counter, and elapsed session timer. |
| **Journal Synthesis & Takeaways** | Multi-faceted summary card with sentiment scoring (0–100), emotion badges, bulleted insights, and auto-generated thematic tags (`#Personal`, `#Gratitude`, `#Daily`). |
| **Monthly Reflection** | Comprehensive 6-dimension retrospective for any chosen month: standout events, joyful experiences, challenges/concerns, achievements/wins, evolving values, and forward-looking questions. |
| **Patterns & Themes Analysis** | Cross-journal behavioral and emotional pattern analyzer with timeframe selection (Last 30 Days, 3 Months, 6 Months, All Time), recurring theme distributions, and reflective follow-up prompts. |
| **Ask My Journal Engine** | Cross-session intelligence tool with a multi-stage pulsing radar loader (`Scanning reflections`, `Extracting themes`, `Synthesizing citations`) and formatted Markdown citations. |
| **Protected Navigation & Archive** | Adaptive UI where the sidebar and navigation archive are conditionally mounted only for authenticated users, keeping the pre-login experience minimal, fast, and focused. |

---

## ✨ Key Features

- 🧘 **Empathetic Conversational Journaling**: Responsive AI dialogue powered by `gemini-2.5-flash` trained to ask constructive, reflective questions rather than giving generic advice.
- 💡 **Smart Starter & Suggestion Chips**: Dynamic context-aware chips. Chips with trailing ellipses (`...`) auto-populate and focus the user's message input box for completion, while complete questions submit immediately.
- 📊 **Multidimensional Reflection Synthesis**: Instant extraction of:
  - Concise Executive Summary
  - Mood & Sentiment Score (0–100) with visual tone emojis
  - Action Items & Actionable Commitments
  - Key Insights & Core Takeaways
  - Automated Thematic Tags
- 🗓️ **Monthly Reflection Retrospective**: Select any calendar month to generate an AI-distilled review covering Standout Events, Joys, Challenges, Wins, Evolving Values, and Forward Questions with one-click navigation back to source journals.
- 📈 **Patterns & Themes Intelligence**: Multi-timeframe trend detector highlighting recurring topics, behavioral loops, emotional tone trajectories, and suggested next steps.
- 🔍 **"Ask My Journal" (Cross-Entry Memory Engine)**: Query your journal archive in plain language (e.g., *"What patterns of stress have I noticed this month?"* or *"What was I grateful for last week?"*).
- 📡 **Multi-Stage Pulsing Radar Loading**: Visual status indicators demonstrating real-time entry retrieval, theme extraction, and citation synthesis.
- 🏷️ **One-Click Tag & Keyword Filtering**: Filter your past reflections instantly by clicking on `#Personal`, `#Daily`, or custom tags in the sidebar.
- 🔒 **Zero-Trust Multi-Tenant Storage**: Strict Firestore isolation where only the authenticated owner can access, modify, or delete their journals.
- 🔑 **Cloud Secret Manager Integration**: Secure, runtime credential management with in-memory TTL caching and automatic credential masking.

---

## 🏛️ High-Level Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  User Web Browser                      │
                                  │  - React 19 Client (SPA)                               │
                                  │  - Tailwind CSS v4 & Lucide Icons                      │
                                  │  - Firebase Auth SDK (Google Identity Sign-In)         │
                                  └───────────┬────────────────────────────────┬───────────┘
                                              │                                │
                                  HTTPS (Bearer ID Token)               Direct Firestore Sync
                                              │                                │
                                              ▼                                ▼
                      ┌──────────────────────────────────────────────┐ ┌────────────────────────────────┐
                      │            Google Cloud Run Service          │ │       Google Cloud Firestore   │
                      │  ┌────────────────────────────────────────┐  │ │  ┌───────────────────────────┐ │
                      │  │       Express.js Server (Port 3000)    │  │ │  │ /users/{userId}/journals  │ │
                      │  │  - Static Asset Delivery (dist/)       │  │ │  │   /{journalId}            │ │
                      │  │  - Firebase Admin ID Token Auth Guard  │  │ │  │                           │ │
                      │  │  - JSON Schema Validation Middleware   │  │ │  │ Enforced by Granular      │ │
                      │  └───────────────────┬────────────────────┘  │ │  │ Firestore Security Rules  │ │
                      └──────────────────────┼───────────────────────┘ └───────────────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
         ┌─────────────────────────────┐           ┌─────────────────────────────┐
         │  Google Cloud Secret Manager│           │    Google Gemini API        │
         │  - Secret: GEMINI_API_KEY   │           │  - Model: gemini-2.5-flash  │
         │  - Accessed via ADC (IAM)   │           │  - Structured JSON Output   │
         │  - 1-Hour In-Memory Cache   │           │  - Markdown Formatting      │
         └─────────────────────────────┘           └─────────────────────────────┘
```

---

## 💻 Complete Tech Stack

### Client-Side (Frontend)
- **Framework**: [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown Parser**: [React-Markdown](https://github.com/remarkjs/react-markdown)
- **State Management & Synchronization**: React Hooks + Firebase Firestore Real-Time Listeners (`onSnapshot`)

### Server-Side (Backend)
- **Runtime**: [Node.js 20 LTS](https://nodejs.org/)
- **Web Server**: [Express.js](https://expressjs.com/)
- **Bundler**: [esbuild](https://esbuild.github.io/) (producing standalone `dist/server.cjs` CommonJS bundle)
- **Authentication**: `firebase-admin/auth`
- **Security Client**: `@google-cloud/secret-manager`

### Cloud & AI Infrastructure
- **Compute**: [Google Cloud Run](https://cloud.google.com/run) (Serverless Container Platform)
- **AI Model**: [Google Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai`
- **Identity & Database**: [Firebase Authentication](https://firebase.google.com/docs/auth) & [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Secrets Management**: [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)

---

## 🔑 Firebase Authentication

Firebase Authentication provides zero-friction Google Sign-In with full client-to-server cryptographic verification:

1. **Client-Side Sign-In**: The user triggers `signInWithPopup(auth, googleProvider)`.
2. **ID Token Generation**: Firebase issues a cryptographically signed JSON Web Token (JWT).
3. **Protected API Calls**: For every backend request (`/api/chat`, `/api/summarize`, `/api/ask-journal`), the client attaches the JWT in the `Authorization: Bearer <ID_TOKEN>` header.
4. **Server Verification**: The Express backend middleware (`requireAuth`) verifies the token's validity, issuer, expiration, and extracts the verified `uid` using `firebase-admin/auth`:
   ```typescript
   const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(token);
   req.authenticatedUserId = decodedToken.uid;
   ```
5. **No Client-Supplied Impersonation**: The server never trusts unverified `userId` parameters in request bodies or query strings; only the cryptographic token subject (`decodedToken.uid`) is accepted.

---

## 🛡️ Firestore Data Isolation & Security Rules

To ensure complete tenant privacy, journal entries are stored strictly in user-owned subcollections:
```
/users/{userId}/journals/{journalId}
```

### Granular Security Rules (`firestore.rules`)
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isValidJournal(data, expectedUserId) {
      return data.userId == expectedUserId
        && data.id is string
        && data.title is string
        && data.title.size() <= 200
        && data.status in ['in-progress', 'finished']
        && data.messages is list
        && data.messages.size() <= 500
        && (!('tags' in data) || (data.tags is list && data.tags.size() <= 30));
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /journals/{journalId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId)
          && request.resource.data.userId == request.auth.uid
          && isValidJournal(request.resource.data, userId);
        allow update: if isOwner(userId)
          && request.resource.data.userId == resource.data.userId
          && isValidJournal(request.resource.data, userId);
        allow delete: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Isolation Guarantees:
- **Path-Based Ownership**: User A (`uid_123`) cannot read or write documents in `/users/uid_456/journals`.
- **Payload Bound Validation**: Limits journal titles to 200 characters, message histories to 500 items, and tags to 30 elements to prevent denial-of-storage abuse.
- **Default Deny**: All unmatched collections or global queries outside a user's tree are rejected.

---

## 🤖 Gemini LLM Integration

The application leverages the official `@google/genai` SDK with **Gemini 2.5 Flash** across three tailored endpoints:

### 1. Conversational Companion (`/api/chat`)
- **System Instructions**: Configured as an empathetic mindfulness guide.
- **Structured Output**: Emits structured JSON containing:
  - `reply`: The empathetic conversational response.
  - `suggestedFollowUps`: 2–3 thought-provoking follow-up prompts or sentence starters (`...`).
  - `detectedMood`: Real-time emotional nuance.

### 2. Post-Session Synthesis (`/api/summarize`)
- **JSON Schema Validation**: Guarantees strict parsing for:
  - `summary`: Concise synthesis of the reflection.
  - `mood`: Descriptive mood label (e.g., *"Optimistic Calm"*).
  - `moodScore`: Integer from 0 to 100.
  - `emoji`: Representative emotion indicator (e.g., 🌿, 💡, 🌊).
  - `tags`: Up to 5 thematic classification tags.
  - `actionItems`: Specific micro-habits or commitments.
  - `keyTakeaways`: Core psychological realizations.

### 3. Historical Synthesis Engine (`/api/ask-journal`)
- **Cross-Session Prompting**: Ingests the user's historical session transcripts, analyzes patterns, and produces:
  - `answer`: Markdown-formatted response synthesizing themes across past entries.
  - `referencedJournals`: Specific citations including `id`, `title`, `date`, and `snippetQuote`.
  - `detectedTrend`: Overall trajectory (e.g., *"Increasing confidence across February"*).

### 4. Monthly Reflection Analysis (`/api/journal/monthly-reflection`)
- **Strict Single-User Temporal Scoping**: Analyzes entries within the requested `year` and `month`.
- **6-Dimension Structured Synthesis**:
  - `overview`: A thoughtful summary of the month's emotional rhythm.
  - `whatStoodOut`: Key experiences, turning points, or dominant thoughts.
  - `joysAndGratitude`: Moments of delight, fulfillment, or connection.
  - `challengesAndConcerns`: Obstacles, stressors, or uncertainties navigated.
  - `achievementsAndWins`: Tangible or internal victories, resilience, or milestones.
  - `evolvingValues`: Priorities and values that shifted or strengthened.
  - `questionsForNextMonth`: Reflective questions to guide the upcoming month.
  - `referencedJournals`: Array of referenced journal entries (`id`, `title`, `date`).

### 5. Patterns & Themes Analysis (`/api/journal/patterns`)
- **Multi-Window Longitudinal Analysis**: Evaluates patterns across 30 Days, 90 Days, 180 Days, or All Time.
- **Structured Longitudinal Schema**:
  - `recurringTopics`: Recurring subjects with frequency counter, description, and related entry IDs.
  - `behavioralPatterns`: Helpful habits vs. unhelpful loops and behavioral tendencies noticed.
  - `emotionalEvolution`: Progression of emotional tone, mindset shifts, and resilience over time.
  - `suggestedActions`: Concrete, supportive micro-actions or habits based on detected themes.
  - `reflectiveQuestions`: Targeted prompts for future journal sessions to explore emergent patterns.

---

## 🔐 Secret Manager Architecture

API keys and credentials are never baked into container images or committed to source control.

```
┌──────────────────────────────────────────────────────────┐
│                   Google Cloud Run                       │
│  - Runtime Service Account: cloud-run-sa@...iam...       │
│  - Application Default Credentials (ADC)                 │
└────────────────────────────┬─────────────────────────────┘
                             │
            secretmanager.versions.access (IAM)
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Google Cloud Secret Manager                  │
│  - Secret: GEMINI_API_KEY                                │
│  - Payload: AIzaSy... (Protected)                        │
└──────────────────────────────────────────────────────────┘
```

### Implementation Highlights (`server/secretManager.ts`):
1. **Application Default Credentials (ADC)**: The Express backend instantiates `SecretManagerServiceClient` without manual JSON keys, inheriting IAM identity from the Cloud Run runtime service account.
2. **In-Memory Caching (1-Hour TTL)**: Protects against latency overhead and API quota exhaustion:
   ```typescript
   if (cachedGeminiKey && cachedGeminiKey.expiresAt > Date.now()) {
     return cachedGeminiKey.value;
   }
   ```
3. **Automatic Log Sanitization**: Redacts API keys (`AIzaSy...`), OAuth access tokens (`ya29...`), and Bearer headers from all error logs and exceptions.
4. **Strict Cloud Policy**: When deployed inside a GCP environment (`GCP_PROJECT_ID`), Secret Manager access failure immediately halts the request; fallback to ambient environment variables is strictly forbidden.

---

## 🛡️ Comprehensive Security Model

1. **Principle of Least Privilege (PoLP)**: Cloud Run service account is granted exclusively `roles/secretmanager.secretAccessor` on the specific `GEMINI_API_KEY` secret.
2. **Cryptographic Token Verification**: All private API endpoints require valid, non-expired Firebase ID tokens.
3. **Payload Sanitization & Boundary Limits**: Maximum JSON payload limit of 5MB enforced on Express body parser; schema checks on title and message lengths.
4. **Header Hardening**:
   - `Content-Security-Policy`: Disallows unauthorized script injections.
   - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
   - `X-Frame-Options`: Configured for secure iframe embedding within approved AI Studio domains.
5. **No Client-Side Secrets**: Neither Gemini API keys nor Google Cloud service account keys are shipped to the browser.

---

## 🎯 Threat Model & Mitigations

| Threat | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Cross-User Data Access** | Unauthorized reading of another user's journal entries. | Path-based ABAC Firestore security rules (`isOwner(userId)`) combined with server-side Firebase Admin JWT token verification. |
| **API Key Theft / Leakage** | Gemini API quota theft or billing compromise. | Secrets stored in Cloud Secret Manager, fetched via ADC, cached in memory, and never sent to the browser. |
| **Prompt Injection / Jailbreak** | Manipulating the journal assistant to leak prompts or misbehave. | System instructions with strict framing, typed JSON schema validation, and defensive boundary prompt delimiters. |
| **Denial of Storage / Resource Exhaustion** | Flooding Firestore with huge session payloads. | Payload size limits in Express (`5mb`), message count caps in `firestore.rules` (≤ 500 messages, ≤ 200 char titles). |
| **Log Exposure of Sensitive Tokens** | API keys or OAuth tokens leaking into Cloud Logging. | Custom regex sanitization layer (`sanitizeErrorMessage`) redacting `AIzaSy...`, `ya29...`, and Bearer tokens before logging. |

---

## 🎨 How AI Studio Was Used

**Google AI Studio** and the Antigravity agent system were utilized extensively during the development lifecycle:
1. **Interactive Prompt Engineering**: Prototyped and tuned the mindful journaling system prompt, adjusting tone parameters and structured output definitions.
2. **Schema Modeling**: Designed and validated the Gemini response schemas for structured synthesis and multi-journal semantic citations.
3. **Full-Stack Prototyping**: Iteratively developed the React 19 UI, Tailwind styling, and Express backend middleware with real-time feedback.
4. **Security Hardening**: Built the Secret Manager integration and Firestore ABAC rules using AI Studio's integration guidelines.

---

## 🌟 Custom Features & UX Polish

- **Auth-Aware Adaptive Navigation**: To preserve privacy and keep the introductory landing experience distraction-free, the left navigation sidebar and mobile navigation drawer are unmounted until the user signs in with Google.
- **Contextual Starter Auto-Fill**: Clicking suggested prompts ending with `...` puts the prompt directly into your text input and focuses the cursor, allowing seamless sentence completion.
- **Pulsing Analysis Radar**: Visual step-by-step progress tracking during cross-journal searches (`Retrieving entries` ➔ `Extracting themes` ➔ `Synthesizing citations`).
- **One-Click Tag Queries**: Clicking any `#Tag` in the sidebar immediately filters your active list of reflections.
- **Dynamic Mood Palette**: Auto-calculated sentiment scores (0–100) rendered with thematic gradients and emoji markers.
- **Rich Markdown Formatting**: Complete Markdown support with clean bold typography, structured lists, and highlighted citations.

---

## 💻 Local Development

### Prerequisites
- Node.js 20+ LTS
- npm 10+
- Google Cloud CLI (`gcloud`) or a Gemini API Key

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/personal-gemini-journal.git
cd personal-gemini-journal
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Gemini API Key (Local fallback when not using Secret Manager)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (From Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔥 Firebase Setup Guide

1. **Create a Firebase Project**:
   - Navigate to the [Firebase Console](https://console.firebase.google.com/).
   - Click **Add project** and follow the prompts.
2. **Enable Authentication**:
   - Go to **Build** ➔ **Authentication** ➔ **Get Started**.
   - Enable **Google** sign-in under the **Sign-in method** tab.
3. **Provision Cloud Firestore**:
   - Go to **Build** ➔ **Firestore Database** ➔ **Create database**.
   - Select your preferred region (e.g., `asia-southeast1`, `us-central1`).
4. **Deploy Security Rules**:
   - Install the Firebase CLI: `npm install -g firebase-tools`
   - Login: `firebase login`
   - Deploy rules: `firebase deploy --only firestore:rules`

---

## 🔒 Google Cloud Secret Manager Setup

To configure Secret Manager for production:

1. **Enable Secret Manager API**:
   ```bash
   gcloud services enable secretmanager.googleapis.com --project=YOUR_GCP_PROJECT_ID
   ```

2. **Create the Secret**:
   ```bash
   echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY \
     --data-file=- \
     --replication-policy="automatic" \
     --project=YOUR_GCP_PROJECT_ID
   ```

3. **Grant Secret Access to Cloud Run Service Account**:
   ```bash
   # Retrieve Cloud Run runtime service account (or use compute default)
   PROJECT_NUMBER=$(gcloud projects describe YOUR_GCP_PROJECT_ID --format="value(projectNumber)")
   SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/secretmanager.secretAccessor" \
     --project=YOUR_GCP_PROJECT_ID
   ```

---

## ☁️ Cloud Run Deployment Guide (`dev-tutorial=cloud-run-ai-challenge`)

Follow these steps to deploy the application directly to **Google Cloud Run**:

```
─────────────────────────────────────────────────────────────────────────────
Required Tutorial Tag: dev-tutorial=cloud-run-ai-challenge
─────────────────────────────────────────────────────────────────────────────
```

### Step 1: Configure gcloud CLI
```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="asia-southeast1" # or us-central1
export SERVICE_NAME="personal-gemini-journal"

gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

### Step 2: Build & Deploy via Cloud Build & Cloud Run
You can deploy directly using Google Cloud Buildpack:

```bash
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},GEMINI_SECRET_NAME=GEMINI_API_KEY,NODE_ENV=production" \
  --labels=dev-tutorial=cloud-run-ai-challenge
```

### Step 3: Verify Deployment
Once deployed, Cloud Run will output your live URL:
```
Service [personal-gemini-journal] revision has been deployed and is serving 100 percent of traffic.
Service URL: https://personal-gemini-journal-xxxxxxxxxx.run.app
```

---

## 🧪 Testing & Security Verification

### Automated Code Quality Checks
```bash
# Run TypeScript compilation and syntax checks
npm run lint

# Verify production build compilation
npm run build
```

### Security Verification Checklist
- [x] **Zero Plaintext Secrets**: Inspected repository to confirm zero committed API keys or service account credentials.
- [x] **ADC & Secret Manager Access**: Tested secret retrieval via `SecretManagerServiceClient` on Cloud Run.
- [x] **Firestore Rule Validation**: Confirmed that unauthenticated and cross-user read/write attempts to `/users/{otherUser}/journals` return `PERMISSION_DENIED`.
- [x] **Log Masking**: Verified that exceptions redacting API keys and authorization headers are correctly filtered.
- [x] **JWT Expiration**: Tested that expired Firebase ID tokens return `401 Unauthorized`.

---

## 📌 Known Limitations & Future Roadmap

### Current Limitations
- **Offline Sync**: In local-only mode, sessions persist to browser local storage; multi-device syncing requires signing in with Google.
- **Historical Analysis Scale**: The "Ask My Journal" engine currently processes up to the 50 most recent full-text journal entries in a single synthesis window.

### Future Roadmap
- [ ] **Vector Embeddings (Vertex AI Vector Search)**: Transition historical query retrieval to semantic vector embeddings for million-token archives.
- [ ] **Voice Journaling**: Support real-time audio journaling via Gemini Live API.
- [ ] **Biometric Lock**: Optional WebAuthn / FaceID verification before opening private sessions on mobile browsers.
- [ ] **Export to PDF & Markdown**: Formatted booklet export for printing personal yearly journals.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
