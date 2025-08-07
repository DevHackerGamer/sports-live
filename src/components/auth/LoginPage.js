import '../../styles/LoginPage.css';
import { 
  useSignIn, 
  useSignUp
} from '@clerk/clerk-react';
import { useState } from 'react';

function LoginPage() {
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign up flow
        const result = await signUp.create({
          emailAddress: email,
          password: password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
        } else {
          // Handle email verification if needed
          console.log('Sign up needs verification');
        }
      } else {
        // Sign in flow
        const result = await signIn.create({
          identifier: email,
          password: password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
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
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isSignUp ? 'Sign up to start tracking your favorite sports' : 'Sign in to access your sports dashboard'}</p>
          
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

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
                  onClick={() => setIsSignUp(false)}
                  className="link-button"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>Don't have an account? 
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(true)}
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
