---
title: Authentication Guide
description: User authentication with Clerk integration.
---

## Authentication Setup

Sports Live uses **Clerk** for user authentication, providing secure login/signup flows and session management.

## Environment Setup

Add your Clerk publishable key to your environment:

```bash
# .env.local
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## Components

- `LoginPage.js` - Handles both login and signup flows
- Uses Clerk's `useSignIn` and `useSignUp` hooks
- Integrates with `ClerkProvider` at the app level

## Usage

The app automatically redirects unauthenticated users to the login page and authenticated users to the dashboard. Clerk handles all the security and session management automatically.

## Further reading

- [Clerk Documentation](https://clerk.dev/docs) for detailed setup instructions
- Read [about how-to guides](https://diataxis.fr/how-to-guides/) in the Diátaxis framework
