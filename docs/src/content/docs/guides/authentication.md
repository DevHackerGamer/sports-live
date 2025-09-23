---
title: Authentication Guide
description: User authentication with Clerk integration.
---

Sports Live uses **Clerk** for user authentication, providing secure login/signup flows and session management.

## 1. Overview
**Clerk** handles:
- Secure signup/login flows
- Session management and token handling
- Multi-factor authentication (MFA) and social login options
- User profile management
- Integration with frontend React components

Using Clerk ensures that authentication logic is outsourced to a secure, well-tested provider, reducing development complexity.

---
## 2. Environment Setup

### 1. Install Clerk dependencies:
```bash
npm install @clerk/clerk-sdk-node @clerk/clerk-sdk-node
```


### 2. Add your Clerk publishable key to your environment:

```bash
# .env
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```
### 3. Wrap your React app with ClerkProvider:
```bash
import { ClerkProvider } from "@clerk/nextjs";

function MyApp({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp;

```
---
## 3 Authentication Components 

- `LoginPage.js` - Handles both login and signup flows
- Uses Clerk's `useSignIn` and `useSignUp` hooks
- Integrates with `ClerkProvider` at the app level

### Usage
```bash
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";

function LoginPage() {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");

  const handleSignIn = async () => {
    await signIn.create({ identifier: email });
    // redirect after sign-in
  };

  return (
    <div>
      <h2>Login</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <button onClick={handleSignIn}>Sign In</button>
    </div>
  );
}

export default LoginPage;

```
--- 
The app automatically redirects unauthenticated users to the login page and authenticated users to the dashboard. Clerk handles all the security and session management automatically.


## 4. Best Practices

- **Never hardcode API keys** in frontend code. Use environment variables.

- **Protect sensitive API endpoints** with Clerk middleware.

- **Use roles/claims** if you have admin vs regular user functionality.

- Keep Clerk dependencies up to date to patch security vulnerabilities.
## 5 References

- [Clerk Documentation](https://clerk.dev/docs) for detailed setup instructions
- Read [about how-to guides](https://diataxis.fr/how-to-guides/) in the Diátaxis framework
- React Hooks Overview [React Hooks Overview](https://react.dev/reference/react)