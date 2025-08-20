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
    apiKey: 'AIzaSyC93yPNBj9YgQzZT5WYesAWJ-xbiiyGRUw',
    authDomain: 'catengine-ai-hub.firebaseapp.com',
    projectId: 'catengine-ai-hub',
    storageBucket: 'catengine-ai-hub.firebasestorage.app',
    messagingSenderId: '642106594977',
    appId: '1:642106594977:web:068690f0d296e03537c2e0',
    measurementId: 'G-ECD8BCCKMD',
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
