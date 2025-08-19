---
title: Deployment Strategy
description: What we used to deploy Sports Live and why
---

## Overview

Sports Live runs as a single Node/Express server that serves a compiled React app and exposes `/api/*` endpoints in the same process. This keeps hosting simple: one entrypoint (`server.js`) listens on the platform-provided `PORT`, serves static files from `build/`, and handles API routes.

## Platform choice: Azure App Service (Windows) vs Containers (Linux)

- Azure App Service (Windows, Free F1)
	- Why used: the subscription and policy constraints (student/free tier and region restrictions) favored the Free F1 plan on Windows in allowed regions (e.g., centralindia). It requires zero container infra and is a low-friction way to host a Node service + static assets.
	- How it works: IIS fronts the app; a `web.config` routes all requests to `server.js` via iisnode. Express serves the React build and mounts the API.
	- Trade-offs: Windows adds IIS/iisnode specifics (e.g., needing `web.config`). It’s fine for small apps and free hosting, but less uniform than Linux.

- Azure Web App for Containers (Linux)
	- Why keep it supported: containers give consistent runtime, simpler Node hosting (no `web.config`), and cleaner promotion across environments. Preferred when moving beyond Free tier, or when Linux-specific behaviors or scale are needed.
	- How it works: multi-stage Dockerfile builds the React app and runs Express; Azure injects `PORT` and the server binds to it.

## Build and deploy mechanism

- ZIP deploy (App Service)
	- Used for the Windows Free tier. Two modes exist: build-on-Azure (Kudu) or local-build packaging. We favor local-build on Windows to ensure the React bundle and `web.config` ship together and avoid build-time env gaps.
	- Why: CRA needs the public Clerk key at build-time; packaging locally guarantees a deterministic client bundle and avoids relying on Kudu to find the right env.

- Container deploy
	- Recommended for consistent builds. The image bakes the public key at build-time and reads server-only tokens at runtime via App Settings. No IIS routing is needed.

## Runtime details that shaped decisions

- Express v5: wildcards changed; we use a regex SPA fallback (`/^\/(?!api\/).*/`) to avoid `path-to-regexp` errors. This makes the SPA router work reliably in production.
- Static assets: Express serves `build/` directly; the SPA fallback covers non-API routes.
- Environment variables:
	- `REACT_APP_CLERK_PUBLISHABLE_KEY` (public, build-time only) is embedded into the client bundle.
	- `FOOTBALL_API_TOKEN` (server-only) is injected at runtime via App Settings.
- Node version: Node >= 18 for native `fetch` on the server; App Service is set to Node 20 to match local behavior.

## Why not static hosting or function-only models?

- The app needs server-side API aggregation and will integrate with a real-time database (Firebase) that benefits from a long-lived server process (SSE/websockets) and server-side credentials (Admin SDK). A unified Express app keeps it straightforward.

## Future evolution

- Move to Linux or Containers as the app grows (simplifies hosting and removes the Windows/IIS specifics).
- Add Firebase Admin for real-time features. For SSE/websockets on App Service, enable websockets in configuration. Containers or Linux plans are a natural fit for long-lived connections.
- Automate deployments (e.g., GitHub Actions) to build artifacts or images and push to Azure with environment-specific settings.

## Where are the step-by-step instructions?

- The root project `README.md` contains practical “how to deploy” steps (ZIP and Container), including environment requirements and troubleshooting tips.
