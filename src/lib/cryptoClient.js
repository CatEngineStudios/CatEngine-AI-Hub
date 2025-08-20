// src/lib/cryptoClient.js
const DATA_KEY_STORAGE = 'clientDataKey_b64';

// base64 helpers
const b64enc = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64dec = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function importAesKey(rawBytes) {
    return crypto.subtle.importKey('raw', rawBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function getOrCreateDeviceKey() {
    let b64 = localStorage.getItem(DATA_KEY_STORAGE);
    if (!b64) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        b64 = b64enc(bytes);
        localStorage.setItem(DATA_KEY_STORAGE, b64);
    }
    const raw = b64dec(b64);
    return importAesKey(raw);
}

// Encrypt a short string (API key) -> { iv_b64, ct_b64 }
export async function encryptString(key, plainText) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(plainText)
    );
    return {
        iv_b64: b64enc(iv),
        ct_b64: b64enc(enc),
    };
}

export async function decryptString(key, iv_b64, ct_b64) {
    const iv = b64dec(iv_b64);
    const ct = b64dec(ct_b64);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(dec);
}
