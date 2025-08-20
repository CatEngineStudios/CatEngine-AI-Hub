// src/components/AccountBadge.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AccountBadge({
    darkMode = false,
    onOpenProfile = () => { },
    onToggleDarkMode = () => { },
}) {
    const { profile } = useAuth();

    const label =
        profile?.mode === 'google'
            ? (profile.displayName || profile.email || 'Google User')
            : profile?.mode === 'guest'
                ? `Guest${profile?.guestId ? ' · ' + String(profile.guestId).slice(0, 6) : ''}`
                : 'Not signed in';

    const bg = darkMode ? 'rgba(17,24,39,.9)' : 'rgba(255,255,255,.96)';
    const fg = darkMode ? '#e5e7eb' : '#111827';
    const bd = darkMode ? '#3b4456' : '#e5e7eb';

    // Initials (fallback when no photo)
    const initials = (() => {
        const src = profile?.displayName || profile?.email || 'U';
        const parts = String(src).split(/[@\s]/).filter(Boolean);
        const a = parts[0]?.[0] || 'U';
        const b = parts[1]?.[0] || '';
        return (a + b).toUpperCase();
    })();

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
            }}
        >
            {/* Dark mode toggle (appears BEFORE account button) */}
            <button
                onClick={onToggleDarkMode}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
                style={{
                    width: 40,
                    height: 40,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 12,
                    border: `1px solid ${bd}`,
                    background: bg,
                    color: fg,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0,0,0,.12)',
                    backdropFilter: 'blur(6px)',
                }}
            >
                {darkMode ? '☀︎' : '☾'}
            </button>

            {/* Account badge */}
            <button
                onClick={onOpenProfile}
                title="Profile & settings"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: `1px solid ${bd}`,
                    background: bg,
                    color: fg,
                    borderRadius: 10,
                    cursor: 'pointer',
                    padding: '6px 10px',
                    lineHeight: 1,
                    maxWidth: '52vw', // keep compact on phones
                    overflow: 'hidden',
                    boxShadow: '0 8px 20px rgba(0,0,0,.12)',
                    backdropFilter: 'blur(6px)',
                }}
            >
                {/* Avatar: photoURL if present, otherwise initials */}
                {profile?.photoURL ? (
                    <img
                        src={profile.photoURL}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `1px solid ${bd}`,
                            background: darkMode ? '#111827' : '#e5e7eb',
                            flex: '0 0 auto',
                        }}
                    />
                ) : (
                    <span
                        aria-hidden
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: darkMode ? '#334155' : '#e5e7eb',
                            color: darkMode ? '#e5e7eb' : '#111827',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flex: '0 0 auto',
                        }}
                    >
                        {initials}
                    </span>
                )}

                {/* Truncated label for narrow headers */}
                <span
                    style={{
                        minWidth: 0,
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {label}
                </span>
            </button>
        </div>
    );
}
