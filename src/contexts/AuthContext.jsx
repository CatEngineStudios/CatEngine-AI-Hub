// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, googleProvider } from '../lib/firebase.js';
import {
    onAuthStateChanged,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult,
    signOut,
    deleteUser,
    reauthenticateWithPopup,
    getAdditionalUserInfo,
    GoogleAuthProvider,
} from 'firebase/auth';
import {
    doc, getDoc, setDoc,
    collection, getDocs, writeBatch, deleteDoc,
} from 'firebase/firestore';

const AuthContext = createContext(null);

// Public hook
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

// ---- Guest flag helpers ----
const GUEST_KEY = 'guestMode';
const setGuest = (v) => { try { localStorage.setItem(GUEST_KEY, v ? '1' : '0'); } catch { } };
const isGuest = () => { try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } };

// ---- Remember last Google account (for “Continue as …”) ----
const LAST_EMAIL_KEY = 'lastGoogleEmail';
const LAST_UID_KEY = 'lastGoogleUid';
const rememberLastAccount = (user, info) => {
    try {
        const email = info?.profile?.email || user?.email || '';
        const uid = user?.uid || '';
        if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
        if (uid) localStorage.setItem(LAST_UID_KEY, uid);
    } catch { }
};
const getLastEmail = () => { try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch { return ''; } };

// ---- Pending delete flow (login-with-hint → auto-delete) ----
const PENDING_DELETE = 'pendingDelete';
const PENDING_DELETE_EMAIL = 'pendingDeleteEmail';
const setPendingDelete = (email = '') => {
    try {
        sessionStorage.setItem(PENDING_DELETE, '1');
        sessionStorage.setItem(PENDING_DELETE_EMAIL, email || '');
    } catch { }
};
const clearPendingDelete = () => {
    try {
        sessionStorage.removeItem(PENDING_DELETE);
        sessionStorage.removeItem(PENDING_DELETE_EMAIL);
    } catch { }
};
const hasPendingDelete = () => {
    try { return sessionStorage.getItem(PENDING_DELETE) === '1'; } catch { return false; }
};

// ---- Local data cleanup (guest/local) ----
const clearLocalAppData = () => {
    try {
        localStorage.removeItem(GUEST_KEY);
        localStorage.removeItem(LAST_EMAIL_KEY);
        localStorage.removeItem(LAST_UID_KEY);
        localStorage.removeItem('apiKey');
        localStorage.removeItem('sessions');
        localStorage.removeItem('app_state');
    } catch { }
};

// Ensure a Firestore user doc exists (best-effort)
async function ensureUserDoc(u) {
    try {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                createdAt: Date.now(),
                displayName: u.displayName || '',
                email: u.email || '',
            });
        }
    } catch (e) {
        console.warn('Create user doc failed:', e);
    }
}

// Delete all documents in a user subcollection (batched)
async function deleteAllDocsInSubcollection(uid, sub) {
    const colRef = collection(db, 'users', uid, sub);
    const snap = await getDocs(colRef);
    if (snap.empty) return;
    let batch = writeBatch(db);
    let count = 0;
    for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    }
    if (count > 0) await batch.commit();
}

// Delete a user's Firestore data (common subs + root doc)
async function deleteUserFirestoreData(uid) {
    const subs = ['sessions', 'chats', 'threads'];
    for (const s of subs) {
        await deleteAllDocsInSubcollection(uid, s).catch(() => { });
    }
    await deleteDoc(doc(db, 'users', uid)).catch(() => { });
}

export default function AuthProvider({ children }) {
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guestMode, setGuestMode] = useState(isGuest());
    const [authError, setAuthError] = useState(null);

    // Cross-tab sync for guest flag
    useEffect(() => {
        const onStorage = (e) => { if (e.key === GUEST_KEY) setGuestMode(isGuest()); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Complete redirect if used
    useEffect(() => {
        let done = false;
        (async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    const info = getAdditionalUserInfo?.(result) || null;
                    rememberLastAccount(result.user, info);
                    setFirebaseUser(result.user);
                    setAuthError(null);
                    done = true;
                }
            } catch (e) {
                setAuthError(e?.message || 'Google sign-in failed.');
            } finally {
                setTimeout(() => { if (!done) setLoading(false); }, 1200);
            }
        })();
    }, []);

    // Primary auth listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setFirebaseUser(u || null);
            if (u) {
                rememberLastAccount(u, null);
                await ensureUserDoc(u);
                // Auto-delete on pending flag
                if (hasPendingDelete()) {
                    try {
                        await deleteAccountAndData();
                    } finally {
                        clearPendingDelete();
                    }
                }
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Safety: promote currentUser if present
    useEffect(() => {
        if (!firebaseUser && !loading && auth.currentUser) {
            setFirebaseUser(auth.currentUser);
        }
    }, [loading, firebaseUser]);

    // Derived profile
    const profile = useMemo(() => {
        if (firebaseUser) {
            const { uid, displayName, email, photoURL } = firebaseUser;
            return { uid, displayName: displayName || '', email: email || '', photoURL: photoURL || '', mode: 'google' };
        }
        if (guestMode) return { mode: 'guest' };
        return null;
    }, [firebaseUser, guestMode]);

    // ---------- Sign-in helpers ----------
    async function signInWithProvider(customParams = {}) {
        setGuest(false);
        setGuestMode(false);
        setAuthError(null);
        setLoading(true);

        const provider = new GoogleAuthProvider();
        if (customParams && Object.keys(customParams).length) {
            provider.setCustomParameters(customParams);
        }

        try {
            const cred = await signInWithPopup(auth, provider);
            const info = getAdditionalUserInfo?.(cred) || null;
            rememberLastAccount(cred?.user, info);
        } catch (e) {
            const code = e?.code || '';
            if (code.includes('popup') || code === 'auth/operation-not-supported-in-this-environment') {
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (e2) {
                    setAuthError(e2?.message || 'Google sign-in failed.');
                }
            } else {
                setAuthError(e?.message || 'Google sign-in failed.');
            }
        } finally {
            setTimeout(() => setLoading(false), 300);
        }
    }

    async function loginGoogle() { return signInWithProvider(); }
    async function loginGoogleSelect() { return signInWithProvider({ prompt: 'select_account' }); }
    async function loginGoogleSignup() { return signInWithProvider({ prompt: 'consent select_account', include_granted_scopes: 'true' }); }
    async function loginGoogleWithHint(email) {
        const hint = email || getLastEmail();
        return signInWithProvider(hint ? { login_hint: hint } : {});
    }

    function loginGuest() {
        setGuest(true);
        setGuestMode(true);
        setAuthError(null);
        try { if (auth.currentUser) signOut(auth); } catch { }
    }

    async function logout() {
        setGuest(false);
        setGuestMode(false);
        setAuthError(null);
        if (auth.currentUser) await signOut(auth).catch(() => { });
    }
    async function switchAccount() {
        await logout();
        try { window.location.reload(); } catch { }
    }
    function clearAuthError() { setAuthError(null); }

    // ---------- Account deletion ----------
    async function deleteAccountAndData() {
        try {
            // Guest → local only
            if (profile?.mode === 'guest' || (!firebaseUser && isGuest())) {
                clearLocalAppData();
                setGuest(false);
                setGuestMode(false);
                setFirebaseUser(null);
                return { ok: true };
            }

            // Google
            const user = auth.currentUser;
            if (!user) throw new Error('Please sign in first to delete your Google account.');

            // Delete Firestore data
            await deleteUserFirestoreData(user.uid).catch(() => { });

            // Delete auth user (reauth if needed)
            try {
                await deleteUser(user);
            } catch (e) {
                if (e?.code === 'auth/requires-recent-login') {
                    const reauthProvider = new GoogleAuthProvider();
                    await reauthenticateWithPopup(user, reauthProvider);
                    await deleteUser(user);
                } else {
                    throw e;
                }
            }

            clearLocalAppData();
            await signOut(auth).catch(() => { });
            setFirebaseUser(null);
            setGuest(false);
            setGuestMode(false);
            return { ok: true };
        } catch (e) {
            setAuthError(e?.message || 'Account deletion failed.');
            return { ok: false, error: e };
        }
    }

    // Schedule delete for a remembered email:
    //  1) set pending flag
    //  2) loginWithHint(email)
    //  3) onAuthStateChanged auto-runs deleteAccountAndData()
    async function scheduleDeleteForEmail(email) {
        setPendingDelete(email || '');
        await loginGoogleWithHint(email);
    }

    const lastAccountEmail = useMemo(() => getLastEmail(), [firebaseUser]);

    const value = useMemo(() => ({
        profile,
        loading,
        authError,
        clearAuthError,
        // login variants
        loginGoogle,
        loginGoogleSelect,
        loginGoogleSignup,
        loginGoogleWithHint,
        loginGuest,
        logout,
        switchAccount,
        // deletion + last account hint + scheduler
        deleteAccountAndData,
        scheduleDeleteForEmail,
        lastAccountEmail,
    }), [profile, loading, authError, lastAccountEmail]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
