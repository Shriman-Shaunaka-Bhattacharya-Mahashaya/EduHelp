# EduHelp LMS

[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success?style=for-the-badge)](https://edu-help-iota.vercel.app)

A comprehensive, role-based exam management, proctoring, and academic portal built with Next.js 15, React, and MongoDB. 

## Advanced Features

### 1. Intelligent AI Exam Parsing (Groq)
Instructors no longer need to worry about formatting. You can upload raw, messy `.txt`, `.pdf`, `.docx`, `.pptx`, or `.xlsx` files, and our secure backend leverages the **Groq AI API (llama-3.1-8b-instant)** to instantly read, understand, and extract questions, options, and correct answers into structured database records perfectly.

### 2. High-Performance Scalability
The system is built to handle thousands of exams and attempts simultaneously. Dashboards utilize strict **Database-Level Pagination** (MongoDB `.skip()` and `.limit()`) and infinite-scroll "Load More" mechanics across all core content streams (Materials, Announcements, Assignments) to ensure the server never hits memory payload limits, regardless of scale.

### 3. Strict Proctoring & Anti-Cheating
The exam-taking environment (`app/exam/[id]/page.tsx`) enforces total lockdown:
- **Absolute Time Strategy:** The timer tracks the real-world system clock. If a student tries to hack the system by pausing the browser via Developer Tools, the clock instantly catches up the moment they unpause.
- **Physical Lockdown:** Text selection, copying, cutting, pasting, and right-clicking are fully disabled. Keyboard shortcuts like `Ctrl+C`, `Ctrl+V`, `Ctrl+P`, and `Ctrl+S` are actively intercepted and blocked.
- **3-Strike Penalty System:** The system monitors tab visibility. If a student leaves the tab, they receive a massive warning overlay. Strikes are persistently cached to `localStorage` (defeating page refreshes). On the 3rd strike, the exam is forcibly locked and auto-submitted.

### 4. Comprehensive Assignments & Grading
- Instructors can create rich-text assignments targeted at specific departments and batches, optionally attach resources, and set strict deadlines and max marks.
- Students can upload submission documents, with the system blocking late submissions.
- Instructors get a unified dashboard to download submissions, enter grades, and leave feedback. 

### 5. Cloud-Native Storage & Announcements
- Integrated with **Cloudinary** for lightning-fast file hosting.
- Instructors can blast targeted announcements (with attachments) to specific cohorts of students.
- Strict cloud management ensures that deleting an assignment or un-submitting a file permanently wipes the physical data from Cloudinary to prevent ghost-storage bloat.

### 6. Automatic Notification Reminder System
- **Hybrid Cron Engine:** A highly sophisticated unified cron engine operates flawlessly across both Serverless and local Docker environments (via Next.js `instrumentation.ts` background looping) automatically.
- *(Note: Since Vercel Hobby accounts limit crons to once per day, production deployment uses a free external ping service like UptimeRobot to trigger the `/api/cron/reminders` endpoint every minute).*
- Students receive automated in-app alerts precisely **1 Day**, **2 Hours**, and **5 Minutes** before their Scheduled Exam or Assignment deadline.
- Intelligent target filtering: only pings students who have not yet submitted their assignments or attempted their exams.
- In-app Notification Bell in the dashboard dynamically updates and allows clearing of read messages.

### 7. Direct Messaging System
- Seamless, real-time-like communication between students and instructors.
- Built-in notification badges and unread message tracking.
- Automatic privacy and database optimization via **6-month TTL auto-deletion** for old messages.

### 8. Educational Materials & Semantic Vector Search
- **Course-Based Organization**: Materials are structurally grouped into dynamic Course Folders. The system auto-aggregates a distinct list of subjects for students and instructors, keeping the workspace completely clutter-free.
- Instructors can upload required reading materials, study guides, syllabus documents, and **Video Lectures** (MP4, WebM, OGG) natively to the portal.
- Video materials are securely hosted, optimized for rapid streaming, and rendered in sleek native HTML5 embedded players directly inside the dashboard.
- **Smart OCR Fallback**: Supports raw `.jpg`/`.png` uploads and automatically detects scanned PDFs lacking machine-readable text. It seamlessly triggers a local **Tesseract.js** OCR pipeline to extract text from images before pushing to the vector database.
- **Global Semantic Vector Search**: The student search bar is powered by a RAG-like vector space. When instructors upload content, its metadata (title, course, tags, description) is converted into a mathematical vector. When students search, their query is embedded in real-time, retrieving the most semantically relevant materials instantly, even if they don't type the exact keyword.

### 9. RAG AI Assistant (Retrieval-Augmented Generation)
- **Local Embedded Vectors:** Uploaded materials are dynamically parsed and converted into 384-dimensional mathematical vectors natively inside the Node.js V8 engine using `@xenova/transformers` (Zero latency, zero external API costs).
- **Atlas Vector Search:** Vectors are stored in MongoDB and searched at lightning speed utilizing Lucene-based `$vectorSearch` with strict multi-tenant metadata filtering.
- **Groq LLM Integration:** Students can launch a dedicated AI Chatbot for any document. The system instantly queries the vector database for the most relevant context and injects it into a high-speed Llama 3/Mixtral model via the Groq API, guaranteeing hallucination-free, strictly contextual answers.
- **Conversational Memory:** The chatbot retains a rolling window of conversational history, enabling fluid follow-up questions.

### 10. Automated Garbage Collection
- Built-in data lifecycle management. Exams, Announcements, Assignments, and Content are assigned a 6-month Time-To-Live (TTL) by default.
- Once the expiration date passes, items instantly vanish from user interfaces (Soft Delete).
- A secure Vercel Cron Job runs every midnight to physically delete expired documents, permanently destroy associated Cloudinary assets, and explicitly wipe orphaned Vector Embeddings from the `$vectorSearch` index to prevent data bloat.

### 11. Offline Resilience
If a student's internet drops while taking an exam, their answers and time spent are constantly cached to `localStorage`. If they submit while offline, the system safely stores the payload and uses an active **Background Ghost Sync** to automatically silently submit the exam to the server the second their internet connection is restored (`window.addEventListener('online')`).

## Role-Based Access Control
- **Instructor Dashboard**: 
  - Manage Practice Tests, Scheduled Tests, Announcements, Assignments, and Educational Materials.
  - View real-time analytics, student leaderboards, and detailed question breakdowns.
  - Full CRUD control with cloud-storage syncing.
- **Student Dashboard**: 
  - Segregated tabs for Available Exams, Given Exams, targeted Announcements, Assignments, and Materials.
  - Interactive **AI Chatbot** available globally or linked directly to specific documents for contextual learning.
  - Detailed post-exam review, analyzing exactly which questions were right/wrong and the exact time spent per question.
  - View assignment grades and instructor feedback.
  - Profile section indicating academic details.

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router, API Routes)
- **Database**: MongoDB (Mongoose, `$text` index, Atlas Vector Search)
- **Authentication**: NextAuth.js
- **AI LLM & RAG**: Groq API + `@xenova/transformers` (Local Embeddings) + `tesseract.js` (OCR) + `officeparser` + `pdf-parse`
- **Cloud Storage**: Cloudinary
- **Styling**: Vanilla CSS with modern, glassmorphic UI design

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (For local containerized deployment)
- A MongoDB cluster (e.g., [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- A [Groq API Key](https://console.groq.com/keys)
- A [Cloudinary Account](https://cloudinary.com) (Cloud Name, API Key, API Secret)

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <your-github-repo-url>
   cd exam-system
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add the following variables:
   ```env
   # Your MongoDB Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority
   
   # NextAuth Config (Use `openssl rand -base64 32` for Secret)
   NEXTAUTH_SECRET=your_random_secret_string
   NEXTAUTH_URL=http://localhost:3000

   # Groq API Key for AI Exam Parsing
   GROQ_API_KEY=gsk_your_groq_api_key_here

   # Cloudinary Keys for File Uploads
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Cron Job Security (For Vercel)
   CRON_SECRET=your_secure_cron_password
   ```

3. **Configure Atlas Vector Search**:
   For the AI features to work, you must create **two** Vector Search Indexes in your MongoDB Atlas dashboard.
   
   **Index 1: For the AI Chatbot (RAG)**
   - Go to MongoDB Atlas -> **Atlas Search**.
   - Click **Create Search Index** and choose **Atlas Vector Search** (JSON Editor).
   - Select your database and the `documentchunks` collection.
   - Name the index exactly: **`VectorSearchIndex`**
   - Paste the following configuration:
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 384,
         "similarity": "cosine"
       },
       {
         "type": "filter",
         "path": "contentId"
       }
     ]
   }
   ```
   
   **Index 2: For Global Semantic Search (Materials)**
   - Click **Create Search Index** again and choose **Atlas Vector Search** (JSON Editor).
   - Select your database and the `contents` collection.
   - Name the index exactly: **`ContentVectorIndex`**
   - Paste the following configuration:
   ```json
   {
     "fields": [
       {
         "numDimensions": 384,
         "path": "embedding",
         "similarity": "cosine",
         "type": "vector"
       },
       {
         "path": "targetDepartment",
         "type": "filter"
       },
       {
         "path": "targetBatch",
         "type": "filter"
       },
       {
         "path": "expireAt",
         "type": "filter"
       },
       {
         "path": "course",
         "type": "filter"
       }
     ]
   }
   ```
   - Wait until both indexes are `Active`.

## Docker Deployment (Local)
The application is fully containerized and uses Next.js standalone builds for extreme optimization.

1. Build and run the container in detached mode:
   ```bash
   docker compose up -d --build
   ```
2. Access the application at [http://localhost:3000](http://localhost:3000).

*(Note: To stop the container, run `docker compose down`)*

## Vercel Deployment (Production)

This application is natively optimized for Vercel's serverless infrastructure.

1. Push your code to a GitHub repository.
2. Log into [Vercel](https://vercel.com), click **Add New Project**, and import your repository.
3. In the Configuration tab, expand **Environment Variables** and paste all the keys from your `.env.local` file.
4. Click **Deploy**. Vercel will automatically build the app, set up the midnight Cron Job via `vercel.json`, and assign a free SSL-secured URL.
