import '../../styles/LoginPage.css';
import { 
  useSignIn, 
  useSignUp,
  useAuth,
  useUser
} from '@clerk/clerk-react';
import { useState, useEffect, useRef } from 'react';

function LoginPage() {
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const formRef = useRef(null);

  // If user is already signed in but somehow on login page, offer to sign out
  useEffect(() => {
    if (isSignedIn && !user) {
      console.log('User appears to be signed in but on login page - this might be a session issue');
    }
  }, [isSignedIn, user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const switchToSignIn = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsSignUp(false);
      setError('');
      setFirstName('');
      setLastName('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 300);
  };

  const switchToSignUp = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsSignUp(true);
      setError('');
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!signIn || !signUp) {
      setError('Authentication service not ready. Please refresh the page.');
      return;
    }

    // Validate confirm password for sign-up
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign up flow
        const result = await signUp.create({
          emailAddress: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          // Reset form
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFirstName('');
          setLastName('');
          setLoading(false);
          return;
        } else {
          setError('Account creation failed. Please try again or contact support.');
        }
      } else {
        // Sign in flow
        const result = await signIn.create({
          identifier: email,
          password: password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          // Reset form
          setEmail('');
          setPassword('');
          setLoading(false);
          return;
        } else {
          setError('Sign in requires additional verification.');
        }
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Something went wrong');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    
    try {
      setLoading(true);
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/',
        redirectUrlComplete: '/'
      });
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Show sign out option if user appears to be signed in but missing user data */}
      {isSignedIn && !user && (
        <div className="session-issue-banner">
          <p>It looks like there's a session issue. Please sign out and try again.</p>
          <button onClick={handleSignOut} className="auth-button secondary">
            Sign Out
          </button>
        </div>
      )}

      {/* Left side - Branding */}
      <div className="branding-section">
        <div className="branding-content">
          <div className="logo">
            <h1 className="logo-text">Sports Live</h1>
          </div>
          <p className="tagline">Real-time sports feeds and updates</p>
          <div className="features-preview">
            <div className="feature-item">
              <span>Live Scores</span>
            </div>
            <div className="feature-item">
              <span>Statistics</span>
            </div>
            <div className="feature-item">
              <span>Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="login-section">
        <div className="login-content">
          <h2 className={isTransitioning ? 'transitioning' : ''}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className={isTransitioning ? 'transitioning' : ''}>
            {isSignUp ? 'Sign up to start tracking your favorite sports' : 'Sign in to access your sports dashboard'}
          </p>
          
          {/* Regular login/signup form */}
          <div className={`form-container ${isTransitioning ? 'transitioning' : ''}`}>
            <form 
              onSubmit={handleSubmit} 
              className="auth-form"
              ref={formRef}
            >
              {error && <div className="error-message">{error}</div>}
              
              {isSignUp && (
                <>
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (8+ characters)"
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength="8"
                />
              </div>

              {isSignUp && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    minLength="8"
                    style={{
                      borderColor: confirmPassword && password !== confirmPassword ? '#ff6b6b' : undefined
                    }}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <small style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      Passwords do not match
                    </small>
                  )}
                </div>
              )}
            
            <button 
              type="submit" 
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            className="auth-button google"
            type="button"
            disabled={loading}
          >
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div className="auth-switch">
            {isSignUp ? (
              <p>Already have an account? 
                <button 
                  type="button" 
                  onClick={switchToSignIn}
                  className="link-button"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>Don't have an account? 
                <button 
                  type="button" 
                  onClick={switchToSignUp}
                  className="link-button"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
