---
title: Development Guide
description: Development workflow and best practices for Sports Feed.
---

## Development Workflow

This guide covers the development process for the Sports Feed application.

### Development Modes

**Mock Data Mode (Recommended for Development)**
```bash
npm start
```
- Uses mock sports data
- No API costs
- Fast development

**Live Data Mode (For Testing)**
```bash
npx vercel dev
```
- Uses real Football-Data.org API
- Requires API token setup
- Live sports data

### Environment Setup

Create a `.env.local` file:
```bash
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_key
FOOTBALL_API_TOKEN=your_football_api_token
```

### Testing

Run the test suite:
```bash
npm test
```

### Building

Create production build:
```bash
npm run build
```