# AmplifyStudy ⚡
### AI-Powered Study Flashcards with Direct Amazon S3 Ingestion & AWS Amplify Hosting

AmplifyStudy is a modern, minimalist Next.js web application designed for deployment on **AWS Amplify Hosting**. It allows students, researchers, and professionals to upload study documents directly to an **Amazon S3** bucket and automatically transform them into interactive 3D study flashcards, self-grading quizzes, and spaced repetition schedules.

The user interface is inspired by design libraries like **React Bits** and **Cult UI**, featuring dark mode aesthetics, frosted glassmorphism, cursor-following spotlights, 3D flip card physics, and clean typography.

---

## 🌟 Key Features

### 1. Direct Amazon S3 Document Ingestion
- **Presigned URL Architecture**: Upload documents directly from the browser to your Amazon S3 bucket via time-limited S3 presigned PUT URLs (`/api/upload/presigned-url`).
- **Zero Client Credential Exposure**: AWS secret keys never touch the browser; credentials remain secured on the server or IAM role.
- **Upload Progress Stream**: Real-time progress bar with chunked upload reporting.
- **Multi-Format Ingestion**: Supports PDF (`.pdf`), Markdown (`.md`), Plain Text (`.txt`), CSV notes (`.csv`), and JSON (`.json`).
- **Instant Sandbox Mode**: Test the entire upload and generation workflow out of the box with built-in simulated S3 pipelines before connecting live AWS credentials.

### 2. AI Flashcard Synthesis Engine
- **Multimodal Card Categories**:
  - **Concept & Definition**: Fundamental terms and core principles.
  - **Conceptual Q&A**: Deep comprehension and application prompts.
  - **Multiple Choice**: Questions with plausible distractors sampled contextually from the document.
  - **True / False**: Verification statements with detailed explanations.
  - **Recall Mnemonics**: Acronyms and memory hooks for lists and multi-step processes.
- **Customizable Generation Parameters**: Adjust card volume (5–25 cards), target difficulty (Easy, Medium, Hard, Mixed), and study focus.
- **Dual Engine Execution**:
  - **Built-in Intelligent Heuristic NLP**: Extracts semantic headings, definitions, and bullet relationships with zero external API dependencies.
  - **LLM Integration**: Optionally plug in OpenAI (`OPENAI_API_KEY`) or Google Gemini (`GEMINI_API_KEY`) for advanced generative synthesis.

### 3. Interactive Study & Quiz Experience
- **3D Card Flip**: Smooth spring physics card flip with `preserve-3d` and backface culling.
- **Cult UI & React Bits Micro-Interactions**:
  - Cursor-tracking radial mouse spotlight.
  - Animated border beams on active panels.
  - Tactile spring buttons and animated pill tabs.
- **Text-to-Speech (TTS) Voice Audio**: Read questions and answers aloud using the browser's Web Speech API.
- **SuperMemo SM-2 Spaced Repetition**: Automatic calculation of review intervals, repetition counts, and ease factors based on confidence ratings (Again, Hard, Good, Easy).
- **Practice Quiz Mode**: Interactive testing session with multiple-choice options, streak counter, instant feedback, and celebratory confetti upon completion.
- **Card Editor & Deck Management**: Create custom flashcards, edit prompts, and organize decks.
- **Export System**: Export flashcard decks to **Anki** (`.txt`), CSV spreadsheets, Markdown notes, or JSON.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js Client                        │
│  (Cult UI / React Bits Glassmorphism, 3D Flip, Audio TTS)    │
└──────────────┬───────────────────────────────┬──────────────┘
               │ 1. Request Presigned URL      │ 3. Direct S3 PUT
               ▼                               ▼
┌──────────────────────────────┐    ┌─────────────────────────┐
│     Next.js API Route        │    │      Amazon S3          │
│ (/api/upload/presigned-url)  │    │  (Study Documents       │
│ AWS SDK v3 S3Client Signer   │    │   Encrypted Bucket)     │
└──────────────┬───────────────┘    └─────────────────────────┘
               │ 2. Signed PUT URL
               ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI Flashcard Generator                      │
│     (/api/flashcards/generate • NLP / LLM Pipeline)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested with Node.js 22)
- npm or yarn

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate your AWS credentials:
```env
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=my-study-documents-bucket
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```
> *Note: If credentials are not set, the app will seamlessly run in **Sandbox Mode**, allowing you to test 1-click sample documents and simulated S3 uploads immediately!*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to AWS Amplify Hosting

AWS Amplify Hosting natively supports Next.js App Router applications with SSR and SSG.

### Step 1: Push Code to Git
Initialize a Git repository and push your project to GitHub, AWS CodeCommit, or GitLab:
```bash
git init
git add .
git commit -m "Initial commit of AmplifyStudy app"
git remote add origin https://github.com/your-username/amplify-study.git
git branch -M main
git push -u origin main
```

### Step 2: Configure Amazon S3 Bucket CORS
In the **AWS Management Console** > **Amazon S3** > Your Bucket > **Permissions** tab > **Cross-origin resource sharing (CORS)**, paste:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 3: Deploy on AWS Amplify Console
1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2. Click **Host an app** (or **New App** > **Host web app**).
3. Connect your Git repository (e.g., GitHub) and select the `main` branch.
4. AWS Amplify will automatically detect the Next.js framework and use the provided `amplify.yml`:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - nvm use 20 || nvm install 20
           - npm ci --cache .npm --prefer-offline
       build:
         commands:
           - env | grep -E '^(S3_|APP_|NEXT_PUBLIC_|GEMINI_|OPENAI_|AWS_)' >> .env.production || true
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - .next/cache/**/*
         - .npm/**/*
         - node_modules/**/*
   ```
5. In **Advanced Settings** > **Environment Variables**:
   > ⚠️ **IMPORTANT**: AWS Amplify strictly reserves any variable name beginning with `AWS_`. Setting `AWS_ACCESS_KEY_ID` or `AWS_REGION` will cause: *"Environment variables cannot start with the reserved prefix 'AWS'"*.
   > 
   > Instead, enter the **`S3_*`** variables below (the app automatically resolves them):
   - `S3_BUCKET_NAME` = `your-bucket-name` (e.g. `amzn-hackathon`)
   - `S3_REGION` = `your-region` (e.g. `us-east-1`)
   - `S3_ACCESS_KEY_ID` = `your-iam-access-key`
   - `S3_SECRET_ACCESS_KEY` = `your-40-character-iam-secret-key`
   - `NEXT_PUBLIC_S3_BUCKET` = `your-bucket-name`
   - `NEXT_PUBLIC_S3_REGION` = `your-region`
   - `OPENAI_API_KEY` (optional)
   - `GEMINI_API_KEY` (optional)
6. Click **Save and Deploy**.
7. AWS Amplify Hosting will automatically build, provision, and deploy your application with an SSL-enabled CloudFront distribution.

---

## 🎨 Design System & Micro-Interactions

| Component | Design Pattern | Inspiration |
| :--- | :--- | :--- |
| **SpotlightCard** | Dynamic cursor-tracking radial gradient glow with specular reflection | React Bits & Cult UI |
| **BorderBeam** | Animated luminous beam looping along the card perimeter | Cult UI |
| **3D Flashcard** | Spatial 3D rotation (`rotateY: 180deg`) with spring physics | Framer Motion & iOS UI |
| **GlassBadge** | Semi-transparent illuminated tags with subtle color glow | Glassmorphism |
| **Quiz Engine** | Multiple-choice options with haptic feedback & confetti celebration | SuperMemo & Cult UI |

---

## 📄 License
MIT License. Created for high-performance learning workflows.
