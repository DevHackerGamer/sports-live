---
title: Frontend Guide
description: React frontend setup and component structure.
---

## Frontend Setup

The frontend is built with **React** and Create React App. It handles the user interface for displaying real-time sports updates and user authentication with Clerk.

## Key Components

- `src/components/auth/LoginPage.js` - Authentication interface with Clerk
- `src/components/dashboard/Dashboard.js` - Main application dashboard
- `src/components/sports/LiveSports.js` - Live sports data display
- `src/hooks/useLiveSports.js` - Custom hook for sports data management

## Development

To start the development server with mock data:

```bash
npm start
```

To run with live API data:

```bash
npx vercel dev
```

The app uses Clerk for authentication and displays live sports data fetched from the backend APIs.


