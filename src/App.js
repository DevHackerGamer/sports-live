import './styles/Dashboard.css';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { CLERK_PUBLISHABLE_KEY as PUBLISHABLE_KEY } from './config';

function AppContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  
  console.log('Auth state - isSignedIn:', isSignedIn, 'isLoaded:', isLoaded, 'user:', user);
  
  // Wait for Clerk to fully load
  if (!isLoaded || !userLoaded) {
    console.log('Clerk is still loading...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // Simple authentication check
  if (isSignedIn && user) {
    console.log('User authenticated and complete, showing Dashboard');
    return <Dashboard />;
  } else {
    console.log('User not authenticated, showing LoginPage');
    return <LoginPage />;
  }
}

function App() {
  if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key");
  }


  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AppContent />
    </ClerkProvider>
  );
}

export default App;
