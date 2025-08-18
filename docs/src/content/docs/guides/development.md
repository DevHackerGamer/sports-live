---
title: "Development Guide"
---


This guide explains how to set up and run the **Sports Live** project locally for development.  
Follow these steps to ensure your environment is consistent with the rest of the team.

--- 

## A. Prerequisites

Before starting, make sure you have these tools installed:

- **Git** (version control) → [Download](https://git-scm.com/downloads)  
- **Node.js (LTS)** → [Download](https://nodejs.org/)  
- **npm** (comes with Node.js) or **pnpm/yarn** as a package manager  
- **Firebase CLI** → [Install](https://firebase.google.com/docs/cli)  
- **VS Code** → [Download](https://code.visualstudio.com/)  
- **Docker** (optional, for containerized setup) → [Download](https://www.docker.com/)  

---

## B. Clone the Repository

```bash
git clone https://github.com/DevHackerGamer/sports-live.git
cd sports-live
 ```
---

---
## 1. Development Servers

### 1.1 Mock Server (No API Usage)

Run the app with mock API calls (no real API usage):

```bash
npm start
```
Starts a development server using mock data.
Helps avoid unnecessary API requests during development.

### 1.2 API Server (With Real API Calls)

Run the app connected to real APIs:
```bash
npx vercel dev
```
Starts a development server connecting to actual APIs.

### 1.3 Combined Dev (React + Local API Proxy)

Run React with a local proxy mapping /api/* to handlers in api/:
```bash
npm run dev
```
React dev server → http://localhost:3000
Express proxy → http://localhost:3001


### 2. Firebase Setup
Login to Firebase CLI:
```bash
firebase login
```

Initialize Firebase:
```bash
firebase init
```
Select Firestore for database
Select Authentication for user management

Add .env variables:
```bash
VITE_FIREBASE_API_KEY=<your_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<your_project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your_project>
VITE_FIREBASE_STORAGE_BUCKET=<your_project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
VITE_FIREBASE_APP_ID=<your_app_id>
```
### 3. Backend Setup
```bash
cd backend
npm install
npm run dev
```

Backend runs at http://localhost:5000

Firebase handles database and authentication.

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Authentication

Sign up: /auth/signup

Login: /auth/login → JWT or Firebase Auth token

### 6. Testing
### Backend
```bash
npm run test
```

### Frontend
```bash
npm run test
```
Frontend runs at http://localhost:5173

### 7. Deploy to Azure (Container)
Build locally:
7. Deploy to Azure (Container)

Build locally:
```bash
docker build \
  -t sports-live:latest \
  --build-arg REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_xxx .
```

Run locally:
```bash
docker run --rm -p 8080:8080 \
  -e FOOTBALL_API_TOKEN=your_football_api_token \
  sports-live:latest
```

Open http://localhost:8080

Notes:

REACT_APP_CLERK_PUBLISHABLE_KEY → public client key



