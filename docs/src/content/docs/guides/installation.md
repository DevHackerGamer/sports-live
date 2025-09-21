---
title: Getting Started
description: Set up LiveSportUpdates locally in minutes.
---

#  Getting Started with Sports Live

This guide helps you set up **Sports Live** on your machine for development, testing, or deployment.  

---
## Requirements

Before starting, make sure you have:  
- **Node.js** v18+  
- **npm** or **yarn**  
- **Git** for version control  
- **MongoDB Atlas account** (or local MongoDB instance)  
- **Clerk account** for authentication setup  

---

## Clone the Repository

```bash
git clone https://github.com/DevHackerGamer/sports-live.git
cd sports-live
```

# Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Clerk Authentication
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=8000
```
---
##  Local Development

Start frontend and backend together with:
```bash
npm run dev
```
---
## Troubleshooting

| Issue                           | Solution                                                             |
|----------------------------------|----------------------------------------------------------------------|
| MongoNetworkError               | Check your MongoDB URI and IP whitelist in Atlas.                    |
| Clerk login page not loading    | Verify `REACT_APP_CLERK_PUBLISHABLE_KEY` is set correctly.           |
| Port conflicts                  | Make sure no other process is running on port 3000 or 5000.          |

---

##  Quick Start (3 Commands)

```bash
git clone https://github.com/DevHackerGamer/sports-live.git
cd sports-live
npm run dev
```
---
> 🔍 Want to know what makes Sports Live special? Check out the [Features & Overview](/guides/overview) page.

