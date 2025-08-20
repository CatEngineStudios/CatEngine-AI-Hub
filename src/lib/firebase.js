// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// --- Your Firebase web app config (from your message) ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};


// Init
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((e) =>
    console.warn('Auth persistence error:', e?.code || e?.message || e)
);


auth.useDeviceLanguage?.();

export const googleProvider = new GoogleAuthProvider();
// Force account chooser each time (helps when testing multiple accounts)
googleProvider.setCustomParameters?.({ prompt: 'select_account' });

// Firestore
export const db = getFirestore(app);

// Tiny helper your code expects
// Usage: const unsub = onUser(user => { ... });
export function onUser(cb) {
    // Returns the unsubscribe function from onAuthStateChanged
    return onAuthStateChanged(auth, (user) => cb(user));
}

