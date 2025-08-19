---
title: Backend Guide
description: Vercel serverless functions and API architecture.
---

## Backend Architecture

The Sports Live application uses **Vercel serverless functions** for the backend, providing:

- Auto-scaling API endpoints that handle traffic spikes automatically
- Built-in HTTPS and global CDN distribution
- Zero server management - focus on code, not infrastructure  
- Cost-effective pay-per-request pricing
- Excellent performance with edge computing

## Current API Setup

The backend API endpoints are located in the `/api` folder:

- `api/sports-data.js` - Main endpoint for fetching live sports data from Football-Data.org
- `api/status.js` - Health check endpoint for monitoring
- `api/uptime.js` - System uptime monitoring
- `api/joke.js` - Example/demo endpoint

### Real-time Capabilities

Vercel supports real-time updates through:
- **Polling**: Frontend regularly fetches fresh data from API endpoints
- **Webhooks**: External services can trigger immediate updates
- **Edge Functions**: Ultra-fast response times globally
- **Built-in caching**: Intelligent caching for optimal performance

### Running the Backend

For development with live API calls:
```bash
npx vercel dev
```

For mock data development:
```bash
npm start
```

## Why Vercel Works Great

- **Serverless Scaling**: Automatically handles any amount of traffic
- **Global Distribution**: Fast responses worldwide via edge network
- **Real-time Ready**: Supports polling, webhooks, and live data fetching
- **Developer Experience**: Excellent local development and deployment tools
- **Cost Effective**: Only pay for actual usage, not idle server time

The current Vercel setup already provides excellent real-time performance and scalability for sports data delivery.

## Further reading

- Read [about how-to guides](https://diataxis.fr/how-to-guides/) in the Diátaxis framework
