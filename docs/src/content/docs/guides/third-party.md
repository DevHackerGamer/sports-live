---
title: "Third-Party Code Documentation"
description: "Documentation of external services, frameworks, and libraries integrated into the Sports Live Tracker project."
---
Documentation of external services, frameworks, and libraries integrated into the Sports Live Tracker project

---
## 1. Clerk - Authentication
###  Justification  
We use **Clerk** for authentication and user management. Clerk provides secure, ready-made solutions for signup, login, session handling, and identity management.  

**Benefits:**  
- Seamless integration with frontend React components.
- Multi-factor authentication and social login support.  
- Saves development time by outsourcing auth complexity.  .  

### Set-Up 
```bash
npm install @clerk/clerk-sdk-node @clerk/nextjs
```

```bash
import { getAuth } from "@clerk/nextjs/server";

export default function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ message: `Hello user ${userId}` });
}
```
### References 
- Clerk Docs: [https://clerk.com/docs](https://clerk.com/docs) 
---

## 2. Database – MongoDB
###  Justification  
We use **MongoDB** a cloud-hosted NoSQL database, to store match, event, and user data.

**Benefits:**  
- JSON-like structure aligns with our data model.
- Automatic scaling for live feeds.  
- Strong support for Node.js drivers.  

### Set-Up 
```bash
npm install mongodb

```
```bash
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
  await client.connect();
  return client.db("sport-live-feeds");
};

```

### References 
- MongoDB Docs: [https://www.mongodb.com/docs](https://www.mongodb.com/docs)  
- MongoDB Node.js Driver: [https://www.mongodb.com/docs/drivers/node/current](https://www.mongodb.com/docs/drivers/node/current)  

---
## 3 Backend - Node.js + Express
###  Justification  
We use **Node.js with Express** for the backend server. Express provides a lightweight framework to handle RESTful APIs and middleware.

**Benefits:**  
- Middleware for authentication, logging, and validation.
- Easy integration with MongoDB for match and event data..  
- Non-blocking I/O for real-time data.

### Set-Up 
```bash
npm install express


```
```bash
import express from "express";
const app = express();

app.get("/api/matches", (req, res) => {
  res.json({ message: "List of matches" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
```

### References 
- Express Docs: [https://expressjs.com](https://expressjs.com)  
- Node.js Docs: [ttps://nodejs.org/docs](ttps://nodejs.org/docs)  
---
## 4 Hosting - Render
###  Justification  
We use **Render** to host our Node.js backend services. Render provides simple continuous deployment and scaling, ideal for production-ready applications.

**Benefits:**  
- GitHub integration for auto-deployment.
- Free tier for testing, scalable for production. 
- Built-in SSL and custom domains.
### Set-Up 
 - Connect GitHub repository to Render.

- Configure environment variables (e.g., MONGO_URI, CLERK_API_KEY).

- Render builds and deploys automatically on git push.
```bash
services:
  - type: web
    name: sports-live-backend
    env: node
    plan: free
    buildCommand: "npm install && npm run build"
    startCommand: "npm start"
    envVars:
      - key: MONGO_URI
        sync: false
      - key: CLERK_API_KEY
        sync: false



```

### References 
- Render Docs: [https://render.com/docs](https://render.com/docs)  

---

## 5. Frontend – React  
###  Justification  
We use **React** for building the frontend user interface. It provides a component-based architecture, fast rendering with a virtual DOM, and strong community support.  

**Benefits:**  
- Reusable UI components.  
- Rich ecosystem with hooks, context, and state management.  
- Easy integration with Clerk authentication components.  

### Set-Up 
```bash
npm create-react-app sports-live-frontend
```
```bash
import React from "react";

function MatchCard({ teamA, teamB, score }) {
  return (
    <div>
      <h3>{teamA} vs {teamB}</h3>
      <p>Score: {score}</p>
    </div>
  );
}

export default MatchCard;

```

### References 
- React Docs: [https://react.dev](https://react.dev)  