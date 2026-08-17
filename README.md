# Exam System Portal

[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success?style=for-the-badge)](https://edu-help-iota.vercel.app)

A comprehensive, role-based exam management, proctoring, and analytics portal built with Next.js 15, React, and MongoDB.

## Advanced Features

### 1. Intelligent AI Exam Parsing (Groq)
Instructors no longer need to worry about formatting. You can upload raw, messy `.txt`, `.pdf`, `.docx`, `.pptx`, or `.xlsx` files, and our secure backend leverages the **Groq AI API (llama-3.1-8b-instant)** to instantly read, understand, and extract questions, options, and correct answers into structured database records perfectly.

### 2. High-Performance Scalability
The system is built to handle thousands of exams and attempts simultaneously. Dashboards utilize strict **Database-Level Pagination** (MongoDB `.skip()` and `.limit()`) and segregated lazy-loading to ensure the server never hits memory payload limits, regardless of scale.

### 3. Strict Proctoring & Anti-Cheating
The exam-taking environment (`app/exam/[id]/page.tsx`) enforces total lockdown:
- **Absolute Time Strategy:** The timer tracks the real-world system clock. If a student tries to hack the system by pausing the browser via Developer Tools, the clock instantly catches up the moment they unpause.
- **Physical Lockdown:** Text selection, copying, cutting, pasting, and right-clicking are fully disabled. Keyboard shortcuts like `Ctrl+C`, `Ctrl+V`, `Ctrl+P`, and `Ctrl+S` are actively intercepted and blocked.
- **3-Strike Penalty System:** The system monitors tab visibility. If a student leaves the tab, they receive a massive warning overlay. Strikes are persistently cached to `localStorage` (defeating page refreshes). On the 3rd strike, the exam is forcibly locked and auto-submitted.

### 4. Offline Resilience
If a student's internet drops while taking an exam, their answers and time spent are constantly cached to `localStorage`. If they submit while offline, the system safely stores the payload and uses an active **Background Ghost Sync** to automatically silently submit the exam to the server the second their internet connection is restored (`window.addEventListener('online')`).

### 5. Role-Based Access Control
- **Instructor Dashboard**: 
  - Create Practice Tests (unlimited attempts) or Scheduled Tests (strict 15-minute login window).
  - Target exams to specific departments or graduation batches.
  - View real-time analytics, student leaderboards, and question-by-question performance breakdowns.
- **Student Dashboard**: 
  - Segregated "Available" and "Given" tabs that split exams cleanly into Practice and Scheduled categories.
  - Detailed post-exam review, analyzing exactly which questions were right/wrong and the exact time spent per question down to the second.

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router, API Routes)
- **Database**: MongoDB (Mongoose)
- **Authentication**: NextAuth.js
- **AI Processing**: Groq API + `officeparser` + `pdf-parse`
- **Styling**: Vanilla CSS with modern, glassmorphic UI design

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A MongoDB cluster (e.g., [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- A [Groq API Key](https://console.groq.com/keys)

## Setup Instructions

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-github-repo-url>
   cd exam-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add the following variables:
   ```env
   # Your MongoDB Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority
   
   # NextAuth Secret (Generate a random string, e.g. using `openssl rand -base64 32`)
   NEXTAUTH_SECRET=your_random_secret_string
   
   # NextAuth URL (for development)
   NEXTAUTH_URL=http://localhost:3000

   # Groq API Key for AI Exam Parsing
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open the App**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Vercel Deployment (Recommended)

This application is natively optimized for Vercel's serverless infrastructure.

1. Push your code to a GitHub repository.
2. Log into [Vercel](https://vercel.com), click **Add New Project**, and import your repository.
3. In the Configuration tab, expand **Environment Variables** and paste your `MONGODB_URI`, `NEXTAUTH_SECRET`, and `GROQ_API_KEY`.
4. Click **Deploy**. Vercel will automatically build the app and assign a free SSL-secured URL.

## Docker Deployment
The application is fully containerized and uses Next.js standalone builds for extreme optimization.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Ensure your `.env.local` file is created and configured.
3. Build and run the container in detached mode:
   ```bash
   docker compose up -d --build
   ```
4. Access the application at [http://localhost:3000](http://localhost:3000).

*(Note: To stop the container, run `docker compose down`)*
