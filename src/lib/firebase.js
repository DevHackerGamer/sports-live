// Firebase client initialization (App + Realtime Database)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';

// Firebase web config (public by design)
const firebaseConfig = {
  apiKey: 'AIzaSyDzZ0CAodwCYHgQJahsgcxJrmWiIIbVhGM',
  authDomain: 'sports-live-c25ca.firebaseapp.com',
  databaseURL: 'https://sports-live-c25ca-default-rtdb.firebaseio.com',
  projectId: 'sports-live-c25ca',
  storageBucket: 'sports-live-c25ca.firebasestorage.app',
  messagingSenderId: '532399482994',
  appId: '1:532399482994:web:3d1353393886b64dc1baeb',
  measurementId: 'G-8JT6X5DF6B',
};

// Singleton app instance across HMR/dev reloads
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Realtime Database instance
export const db = getDatabase(app);

// Guard analytics for browser-only environments
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && 'measurementId' in firebaseConfig) {
    try {
      return getAnalytics(app);
    } catch (_) {
      // ignore if analytics not supported (e.g., in unsupported environments)
    }
  }
  return null;
};

export default app;