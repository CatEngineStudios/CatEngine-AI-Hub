// src/pages/ProfilePage.jsx
import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage({
    darkMode = false,
    onBack = () => { },
    logic, // pass your useChatLogic() object
}) {
    const { profile, switchAccount } = useAuth();
    const {
        MODELS = [],
        model, setModel,
        apiKey, setApiKey,
        darkMode: dm, setDarkMode,
        setSessions,
    } = logic || {};

    const [showKey, setShowKey] = useState(false);

    // --- Single, theme-aware page background (only one BG) ---
    const pageBG = darkMode
        ? 'radial-gradient(1200px 600px at 15% 0%, rgba(37, 99, 235, .18), transparent 50%), radial-gradient(900px 600px at 85% 100%, rgba(168, 85, 247, .16), transparent 55%), linear-gradient(180deg, #0b1220 0%, #0b1220 100%)'
        : 'radial-gradient(1200px 600px at 15% 0%, rgba(59, 130, 246, .12), transparent 50%), radial-gradient(900px 600px at 85% 100%, rgba(168, 85, 247, .10), transparent 55%), linear-gradient(180deg, #f3f6fb 0%, #f9fbff 100%)';

    // Panel + control theme
    const glassBg = darkMode ? 'rgba(17, 24, 39, 0.66)' : 'rgba(255, 255, 255, 0.72)';
    const glassBorder = darkMode ? 'rgba(148, 163, 184, .18)' : 'rgba(17, 24, 39, .08)';
    const textCol = darkMode ? '#e5e7eb' : '#111827';
    const subText = darkMode ? '#9ca3af' : '#4b5563';
    const inputBg = darkMode ? 'rgba(2, 6, 23, 0.6)' : 'rgba(255,255,255,.9)';
    const inputBorder = darkMode ? '#334155' : '#e5e7eb';

    // Scoped scrollbar styling to this page
    const scrollCSS = useMemo(() => `
    .profile-scroll::-webkit-scrollbar { width: 12px; }
    .profile-scroll::-webkit-scrollbar-track { background: ${darkMode ? '#0b1220' : '#eef2f7'}; }
    .profile-scroll::-webkit-scrollbar-thumb {
      background: ${darkMode ? '#1f2937' : '#cfd6df'};
      border-radius: 10px;
      border: 3px solid ${darkMode ? '#0b1220' : '#eef2f7'};
    }
    @supports (scrollbar-color: auto) {
      .profile-scroll { scrollbar-color: ${darkMode ? '#1f2937 #0b1220' : '#9aa4b2 #eef2f7'}; }
    }
  `, [darkMode]);

    const handleClearChats = () => {
        if (window.confirm('Clear ALL chats from this device? This cannot be undone.')) {
            setSessions?.([]);
            try {
                // If you persist sessions/settings locally, clear them here
                // localStorage.removeItem('ai.sessions');
                // localStorage.removeItem('ai.settings');
            } catch { }
        }
    };

    // Small helper (initials if no photo)
    const initials = (() => {
        const src = profile?.displayName || profile?.email || 'U';
        const parts = String(src).split(/[@\s]/).filter(Boolean);
        const a = parts[0]?.[0] || 'U';
        const b = parts[1]?.[0] || '';
        return (a + b).toUpperCase();
    })();

    return (
        <div
            className="profile-scroll"
            style={{
                // Single background for the whole page:
                background: pageBG,
                height: '100%',
                minHeight: 0,
                overflowY: 'auto',
                padding: '20px',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                boxSizing: 'border-box',
            }}
        >
            <style>{scrollCSS}</style>

            <div
                style={{
                    maxWidth: 980,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
            >
                {/* Header panel (glassy) */}
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: glassBg,
                        color: textCol,
                        border: `1px solid ${glassBorder}`,
                        boxShadow: '0 10px 35px rgba(0,0,0,.18)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        {profile?.photoURL ? (
                            <img
                                src={profile.photoURL}
                                alt="Avatar"
                                referrerPolicy="no-referrer"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: `1px solid ${glassBorder}`,
                                    background: darkMode ? '#0b1220' : '#fff',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 40, height: 40,
                                    borderRadius: '50%',
                                    display: 'grid', placeItems: 'center',
                                    fontWeight: 800,
                                    color: textCol,
                                    border: `1px solid ${glassBorder}`,
                                    background: darkMode ? '#0b1220' : '#f2f5fb',
                                }}
                            >
                                {initials}
                            </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, letterSpacing: '.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile?.displayName || (profile?.mode === 'guest' ? 'Guest' : 'User')}
                            </div>
                            <div style={{ fontSize: 12, color: subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile?.mode === 'guest' ? 'Guest mode' : (profile?.email || '')}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={onBack}
                            title="Back to chat"
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: `1px solid ${glassBorder}`,
                                background: inputBg,
                                color: textCol,
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            ← Back
                        </button>
                        <button
                            onClick={switchAccount}
                            title="Sign out / Switch account"
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: '#ef4444',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 700,
                            }}
                        >
                            Log out
                        </button>
                    </div>
                </div>

                {/* Main glass panel with sections */}
                <div
                    style={{
                        background: glassBg,
                        color: textCol,
                        border: `1px solid ${glassBorder}`,
                        borderRadius: 14,
                        boxShadow: '0 14px 48px rgba(0,0,0,.22)',
                        backdropFilter: 'blur(12px)',
                        padding: 16,
                        display: 'grid',
                        gap: 16,
                    }}
                >
                    {/* Account */}
                    <section
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${glassBorder}`,
                            padding: 14,
                            background: 'transparent',
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Account</div>
                        <div style={{ color: subText, lineHeight: 1.6 }}>
                            Mode: <strong style={{ color: textCol }}>{profile?.mode || 'unknown'}</strong>
                            {profile?.email ? <> · Email: <strong style={{ color: textCol }}>{profile.email}</strong></> : null}
                            {profile?.displayName ? <> · Name: <strong style={{ color: textCol }}>{profile.displayName}</strong></> : null}
                            {profile?.uid ? <> · UID: <code style={{ color: textCol, background: 'transparent' }}>{profile.uid}</code></> : null}
                        </div>
                    </section>

                    {/* Appearance */}
                    <section
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${glassBorder}`,
                            padding: 14,
                            background: 'transparent',
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Appearance</div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!dm} onChange={() => setDarkMode?.(v => !v)} />
                            <span>Dark Mode</span>
                        </label>
                    </section>

                    {/* Model & API Key */}
                    <section
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${glassBorder}`,
                            padding: 14,
                            background: 'transparent',
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Model & API Key</div>

                        <label style={{ display: 'block', marginBottom: 10 }}>
                            <div style={{ marginBottom: 6, color: subText }}>Default Model</div>
                            <select
                                value={model}
                                onChange={(e) => setModel?.(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px',
                                    borderRadius: 10,
                                    border: `1px solid ${inputBorder}`,
                                    background: inputBg,
                                    color: textCol,
                                    outline: 'none',
                                }}
                            >
                                {MODELS.map(m => (
                                    <option key={m.value} value={m.value} disabled={m.disabled || false}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label style={{ display: 'block' }}>
                            <div style={{ marginBottom: 6, color: subText }}>API Key</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey || ''}
                                    onChange={(e) => setApiKey?.(e.target.value)}
                                    placeholder="sk-..."
                                    style={{
                                        flex: 1,
                                        padding: '12px 12px',
                                        borderRadius: 10,
                                        border: `1px solid ${inputBorder}`,
                                        background: inputBg,
                                        color: textCol,
                                        outline: 'none',
                                    }}
                                    autoComplete="off"
                                />
                                <button
                                    onClick={() => setShowKey(v => !v)}
                                    title={showKey ? 'Hide key' : 'Show key'}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 10,
                                        border: `1px solid ${inputBorder}`,
                                        background: inputBg,
                                        color: textCol,
                                        cursor: 'pointer',
                                        minWidth: 44,
                                    }}
                                >
                                    {showKey ? '🙈' : '👁️'}
                                </button>
                                <button
                                    onClick={() => setApiKey?.('')}
                                    title="Clear API key"
                                    style={{
                                        padding: '12px',
                                        borderRadius: 10,
                                        border: `1px solid ${inputBorder}`,
                                        background: inputBg,
                                        color: textCol,
                                        cursor: 'pointer',
                                        minWidth: 44,
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </label>
                    </section>

                    {/* Data */}
                    <section
                        style={{
                            borderRadius: 12,
                            border: `1px solid ${glassBorder}`,
                            padding: 14,
                            background: 'transparent',
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data</div>
                        <button
                            onClick={handleClearChats}
                            style={{
                                padding: '12px 12px',
                                borderRadius: 10,
                                border: `1px solid ${inputBorder}`,
                                background: inputBg,
                                color: textCol,
                                cursor: 'pointer',
                                minWidth: 44,
                            }}
                        >
                            Clear all chats (local)
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
