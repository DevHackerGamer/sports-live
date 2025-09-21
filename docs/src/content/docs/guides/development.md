---
title: "Development Guide"
---

# Development Guide
This guide explains how to set up and run the **Sports Live** project locally for development.  
Follow these steps to ensure your environment is consistent with the rest of the team.

--- 

## A. Prerequisites

Before starting, make sure you have these tools installed:

- **Git** (version control) → [Download](https://git-scm.com/downloads)  
- **Node.js (LTS)** → [Download](https://nodejs.org/)  
- **npm** (comes with Node.js)  
- **VS Code** (recommended IDE) → [Download](https://code.visualstudio.com/)  
- **MongoDB Atlas** account for cloud database → [Sign Up](https://www.mongodb.com/atlas)  
- **Docker** (optional, for containerized setup) → [Download](https://www.docker.com/)  


---

## B. Clone the Repository

```bash
git clone https://github.com/DevHackerGamer/sports-live.git
cd sports-live
 ```
---

---
## Running the Project
### Environment Variables
Create a .env file in the root 
```bash
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/sports-live
PORT=5000
CLERK_SECRET_KEY=your_clerk_secret_key
FOOTBALL_API_TOKEN=your_api_key

```

### Frontend (React) + Backend(Express + MongoDB)

```bash
cd backend
npm install
npm run dev

```
## Authentication
Sports Live Uses **Clerk** for authentication
- Login Page ->  `/LoginPage.js`
- Protected routes → Reports, Players, and Admin pages
- Clerk session tokens are automatically included in API requests
---
##  Deployment

The app is deployed on **Render** with automatic builds from the GitHub repo.

### Backend

Type: Web Service

Build Command: `npm install` && `npm run build`

Start Command: `npm run start`

### Frontend

Type: Static Site

Build Command: `npm install` && `npm run build`

---

## Continuous Improvement

- Code is linted and formatted before commits (ESLint + Prettier).

- Pull requests require successful test runs before merging.

- Sprint reviews collect feedback for improving dev workflows.
---
## References
- Render Docs: [https://render.com/docs](https://render.com/docs)  
- Express Docs: [https://expressjs.com](https://expressjs.com)  
- Node.js Docs: [ttps://nodejs.org/docs](ttps://nodejs.org/docs
- MongoDB Docs: [https://www.mongodb.com/docs](https://www.mongodb.com/docs)  
- MongoDB Node.js Driver: [https://www.mongodb.com/docs/drivers/node/current](https://www.mongodb.com/docs/drivers/node/current)  

