// src/lib/store.js
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getOrCreateDeviceKey, encryptString, decryptString } from './cryptoClient';

// path helper
const userDoc = (uid) => doc(db, 'userData', uid);

// ---- Sessions (plain JSON) ----
export async function loadSessions(uid) {
  const snap = await getDoc(userDoc(uid));
  const data = snap.exists() ? snap.data() : null;
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

export async function saveSessions(uid, sessions) {
  // You can also call updateDoc if doc exists; setDoc with merge is fine.
  await setDoc(userDoc(uid), { sessions }, { merge: true });
}

// ---- API key (encrypted) ----
export async function saveApiKey(uid, apiKeyPlain) {
  const key = await getOrCreateDeviceKey();               // per-device AES key
  const boxed = await encryptString(key, apiKeyPlain);    // {iv_b64, ct_b64}
  await setDoc(userDoc(uid), { apiKeyEnc: boxed }, { merge: true });
}

export async function loadApiKey(uid) {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  const boxed = snap.data()?.apiKeyEnc;
  if (!boxed?.iv_b64 || !boxed?.ct_b64) return null;
  try {
    const key = await getOrCreateDeviceKey();
    const plain = await decryptString(key, boxed.iv_b64, boxed.ct_b64);
    return plain || null;
  } catch {
    return null; // wrong device key (e.g., different browser) → require re-entry
  }
}

export async function clearApiKey(uid) {
  await updateDoc(userDoc(uid), { apiKeyEnc: null });
}
