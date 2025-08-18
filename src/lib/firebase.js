// Firebase client initialization (App + Realtime Database)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getDatabase,
  ref as dbRef,
  update as dbUpdate,
  set as dbSet,
  child as dbChild,
  get as dbGet,
  onValue as dbOnValue  // <-- add this
} from 'firebase/database';

// Firebase web config (public by design)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Singleton app instance across HMR/dev reloads
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Realtime Database instance
export const db = getDatabase(app);

// Modular functions for convenience
export const ref = dbRef;
export const update = dbUpdate;
export const set = dbSet;
export const child = dbChild;
export const get = dbGet;
export const onValue = dbOnValue;  // <-- export onValue

// Guard analytics for browser-only environments
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && 'measurementId' in firebaseConfig) {
    try {
      return getAnalytics(app);
    } catch (_) {
      // ignore if analytics not supported
    }
  }
  return null;
};

export default app;
