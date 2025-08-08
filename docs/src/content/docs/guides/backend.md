---
title: Backend Guide
description: Current serverless API setup and planned Firebase migration.
---

## Current Backend Setup

The Sports Feed application currently uses **Vercel serverless functions** for the backend API endpoints located in the `/api` folder:

- `api/sports-data.js` - Main endpoint for fetching live sports data from Football-Data.org
- `api/status.js` - Health check endpoint for monitoring
- `api/uptime.js` - System uptime monitoring
- `api/joke.js` - Example/demo endpoint

### Running the Backend

For development with live API calls:
```bash
npx vercel dev
```

For mock data development:
```bash
npm start
```

## Planned Firebase Migration

We plan to migrate to Firebase for enhanced real-time capabilities:

- **Firebase Functions** for serverless backend logic
- **Firestore** for real-time database with live synchronization
- **Firebase Authentication** for user management
- **Real-time listeners** for instant score updates

This will provide better real-time performance and scalability for live sports data.

## Further reading

- Read [about how-to guides](https://diataxis.fr/how-to-guides/) in the Diátaxis framework
