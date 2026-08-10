# Exam System Portal

A comprehensive, role-based exam management and analytics portal built with Next.js 15, React, and MongoDB.

## Features

- **Role-Based Access Control**: Distinct dashboards and capabilities for Instructors and Students.
- **Instructor Dashboard**:
  - Upload exams instantly via `.txt` file parsing.
  - Create both **Practice Tests** (unlimited attempts) and **Scheduled Tests** (strict 15-minute login window, single attempt).
  - Target exams to specific departments or graduation batches.
  - View real-time analytics, student leaderboards, and question-by-question performance breakdowns.
- **Student Dashboard**:
  - View available and upcoming exams.
  - Real-time exam taking interface with strict server-side enforced countdown timers.
  - Auto-submission capabilities when time runs out.
  - Detailed post-exam review, analyzing which questions were right/wrong and the exact time spent per question.

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router, API Routes)
- **Database**: MongoDB (Mongoose)
- **Authentication**: NextAuth.js
- **Styling**: Vanilla CSS with modern, glassmorphic UI design

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A MongoDB cluster (e.g., [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

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
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open the App**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Exam Upload Format

To create an exam as an instructor, upload a `.txt` file with the following format:
```text
Question: What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B

Question: What is the capital of France?
A) London
B) Berlin
C) Paris
D) Rome
Answer: C
```
