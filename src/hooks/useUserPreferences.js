import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';

// Real-time user preferences stored at /preferences/{userId}
export function useUserPreferences(userId) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    const prefsRef = ref(db, `preferences/${userId}`);
    const off = onValue(
      prefsRef,
      (snap) => {
        setPrefs(snap.val() || {});
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => off();
  }, [userId]);

  const savePreferences = async (partial) => {
    if (!userId) throw new Error('Missing userId');
    const prefsRef = ref(db, `preferences/${userId}`);
    await update(prefsRef, partial);
  };

  const setPreferences = async (value) => {
    if (!userId) throw new Error('Missing userId');
    const prefsRef = ref(db, `preferences/${userId}`);
    await set(prefsRef, value);
  };

  return { prefs, loading, error, savePreferences, setPreferences };
}
