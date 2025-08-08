# Sports Feed Development Guide

Welcome! Please follow these instructions when running the application locally:

## Development Servers

### 1. Mock Server (No API Usage)
To run the app with mock API calls (no real API usage):

```bash
npm start
```

This will start a development server using mock data, which helps avoid unnecessary API requests during development.

### 2. API Server (With Real API Calls)
To run the app with real API calls:

```bash
npx vercel dev
```

This will start a development server that connects to the actual APIs.

## Notes

- Use `npm start` for most development tasks to conserve API usage.
- Only use `npx vercel dev` when you need to test with real API data.

If you have any questions, please reach out to me (Josh).