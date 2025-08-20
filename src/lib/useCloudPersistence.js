// src/lib/useCloudPersistence.js
import { useEffect, useRef } from 'react';
import { auth, onUser } from './firebase';
import { loadSessions, saveSessions, loadApiKey, saveApiKey } from './store';

/**
 * Bridge your local state with Firestore + encrypted API key.
 * Call this ONCE in your top-level logic (where you have these states).
 */
export default function useCloudPersistence({
  sessions, setSessions,
  currentSessionId, setCurrentSessionId,
  apiKey, setApiKey,
}) {
  // 1) On auth change: load sessions + API key
  useEffect(() => {
    const unsub = onUser(async (user) => {
      if (!user) return; // not signed in yet
      const uid = user.uid;

      // sessions
      try {
        const loaded = await loadSessions(uid);
        if (Array.isArray(loaded) && loaded.length) {
          setSessions(loaded);
          if (!currentSessionId && loaded[0]?.id) {
            setCurrentSessionId(loaded[0].id);
          }
        }
      } catch (e) {
        console.warn('Failed to load sessions:', e);
      }

      // api key (encrypted)
      try {
        const k = await loadApiKey(uid);
        if (k) setApiKey(k);
      } catch (e) {
        console.warn('Failed to load API key:', e);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Debounced auto-save of sessions
  const saveDebounce = useRef(null);
  useEffect(() => {
    if (!auth.currentUser) return;
    if (!Array.isArray(sessions)) return;

    clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(async () => {
      try {
        await saveSessions(auth.currentUser.uid, sessions);
      } catch (e) {
        console.warn('Failed to save sessions:', e);
      }
    }, 600);
    return () => clearTimeout(saveDebounce.current);
  }, [sessions]);

  // 3) Provide a helper to persist API key whenever you set it
  const bindApiKeySetter = (setter) => async (value) => {
    setter(value);
    const v = (value || '').trim();
    if (auth.currentUser && v) {
      try {
        await saveApiKey(auth.currentUser.uid, v);
      } catch (e) {
        console.warn('Failed to save API key:', e);
      }
    }
  };

  return { bindApiKeySetter };
}
