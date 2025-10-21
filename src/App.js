import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  ClerkLoaded,
} from '@clerk/clerk-react';

import { CLERK_PUBLISHABLE_KEY as PUBLISHABLE_KEY } from './config';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import LeagueView from './components/LeagueView/LeagueView';
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import './styles/Dashboard.css';

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const clerkAppearanceSettings = {
  // Keep base URLs so Clerk knows where your routes live
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
  afterSignInUrl: '/dashboard/home',
  afterSignUpUrl: '/dashboard/home',
};

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
}

function AppRoutes() {
  // Use React Router's navigate so Clerk can perform client-side navigation correctly
  const navigate = useNavigate();

  // Tolerate tests that mock Clerk without ClerkLoaded
  const ClerkGate = ({ children }) => (ClerkLoaded ? <ClerkLoaded>{children}</ClerkLoaded> : <>{children}</>);

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      {...clerkAppearanceSettings}
    >
      {/* Ensure we don't render auth-gated UI until Clerk is fully loaded to avoid flicker/redirects */}
      <ClerkGate>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
                <SignedOut>
                  <LandingPage />
                </SignedOut>
              </>
            }
          />

          {/* Allow Clerk-managed subroutes like /sign-in/verify */}
          <Route
            path="/sign-in/*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
                <SignedOut>
                  <SignInPage />
                </SignedOut>
              </>
            }
          />

          {/* Allow Clerk-managed subroutes like /sign-up/verify */}
          <Route
            path="/sign-up/*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
                <SignedOut>
                  <SignUpPage />
                </SignedOut>
              </>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/league/:id"
            element={
              <ProtectedRoute>
                <LeagueView />
              </ProtectedRoute>
            }
          />

          {/* Default route - landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClerkGate>
    </ClerkProvider>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;