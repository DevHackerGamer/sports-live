import React from 'react';
import '../../styles/LoginPage.css';
import { SignIn, SignUp } from '@clerk/clerk-react';

function LoginPage() {
  // Simple path-based toggle: /sign-up shows SignUp, otherwise show SignIn
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isSignUp = pathname.includes('sign-up');

  return (
    <div className="login-container">
      {/* Left side - Branding (kept) */}
      <div className="branding-section">
        <div className="branding-content">
          <div className="logo">
            <h1 className="logo-text">SportsLive</h1>
          </div>
          <p className="tagline">Real-time scores, highlights, and updates for your favorite teams and leagues.</p>
          <div className="features-preview">
            <div className="feature-item">Live game tracking</div>
            <div className="feature-item">Personalized dashboard</div>
            <div className="feature-item">Multi-league coverage</div>
          </div>
        </div>
      </div>

      {/* Right side - Clerk default auth */}
      <div className="login-section">
        <div className="login-content">
          {isSignUp ? (
            <SignUp  />
          ) : (
            <SignIn />
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
