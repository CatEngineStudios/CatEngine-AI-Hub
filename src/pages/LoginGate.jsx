// src/pages/LoginGate.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import logoDefault from '../assets/logo.png';

function useLottie() {
    const [Lottie, setLottie] = useState(null);
    useEffect(() => {
        let mounted = true;
        import('lottie-react')
            .then(mod => { if (mounted) setLottie(() => mod.default); })
            .catch(() => { });
        return () => { mounted = false; };
    }, []);
    return Lottie;
}

export default function LoginGate({ children }) {
    const {
        profile, loading,
        authError, clearAuthError,
        loginGoogle, loginGoogleSelect, loginGoogleWithHint,
        loginGuest,
        lastAccountEmail,
    } = useAuth();

    // Theme (supports ?theme=dark|light)
    const getThemeOverride = () => {
        if (typeof window === 'undefined') return null;
        const t = new URLSearchParams(window.location.search).get('theme');
        return t === 'dark' ? 'dark' : t === 'light' ? 'light' : null;
    };
    const [override, setOverride] = useState(() => getThemeOverride());
    useEffect(() => {
        const onPop = () => setOverride(getThemeOverride());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const [prefersDark, setPrefersDark] = useState(() =>
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = e => setPrefersDark(e.matches);
        mq.addEventListener?.('change', handler);
        return () => mq.removeEventListener?.('change', handler);
    }, []);

    const isDark = override ? override === 'dark' : prefersDark;

    // Colors/tokens
    const bg = isDark ? '#070b13' : '#f6f9ff';
    const text = isDark ? '#e7ecf3' : '#0f1a2a';
    const sub = isDark ? '#a0a8b5' : '#51607a';
    const card = isDark ? 'rgba(9,14,24,0.70)' : 'rgba(255,255,255,0.92)';
    const brd = isDark ? '#334155' : '#e5e7eb';
    const accent = isDark ? '#60a5fa' : '#2563eb';
    const accent2 = isDark ? '#c084fc' : '#7c3aed';
    const logoFilter = isDark ? 'grayscale(1) brightness(0) invert(1)' : 'none';

    // Auth state
    const isAuthed = !!(profile && (profile.uid || profile.mode === 'guest'));
    const showLanding = !loading && !isAuthed;
    const hasLast = !!lastAccountEmail;

    const onGoogle = () => {
        clearAuthError?.();
        if (hasLast && typeof loginGoogleWithHint === 'function') return loginGoogleWithHint(lastAccountEmail);
        if (typeof loginGoogleSelect === 'function') return loginGoogleSelect();
        return loginGoogle();
    };
    const onGuest = () => { clearAuthError?.(); loginGuest(); };

    // Lottie
    const Lottie = useLottie();
    const [pawAnim, setPawAnim] = useState(null);
    useEffect(() => {
        let alive = true;
        import('../assets/catpawloading.json')
            .then(m => { if (alive) setPawAnim(m.default); })
            .catch(() => setPawAnim(null));
        return () => { alive = false; };
    }, []);
    const [catMoveAnim, setCatMoveAnim] = useState(null);
    useEffect(() => {
        let alive = true;
        import('../assets/CatMovement.json')
            .then(m => { if (alive) setCatMoveAnim(m.default); })
            .catch(() => setCatMoveAnim(null));
        return () => { alive = false; };
    }, []);

    // Feature tiles (2×2 lock)
    const features = useMemo(() => ([
        { icon: '🔐', title: 'Your Keys, Your Control', text: 'Bring your own API keys—no subscriptions or lock-ins.' },
        { icon: '🧠', title: 'Model Flexibility', text: 'Switch between GPT-5, GPT-4, DeepSeek, Gemini seamlessly.' },
        { icon: '📎', title: 'Files & Images', text: 'Attach text or images and get context-aware replies.' },
        { icon: '⚡', title: 'Fast & Smooth', text: 'Streaming responses with a one-tap Stop.' },
    ]), []);

    // Layout (no outer scroll)
    const containerStyle = {
        position: 'fixed',
        inset: 0,
        background: bg,
        color: text,
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        overflow: 'hidden',
    };

    // Center the whole landing stack; add responsive side padding so tiles never touch edges
    const centerShell = {
        height: '100dvh',
        display: 'grid',
        justifyItems: 'center',
        alignContent: 'center',
        gap: 18,
        padding: 'clamp(8px, 4vw, 18px)',        // ⬅ more side padding on mobile
        boxSizing: 'border-box',
    };

    const maxWrap = {
        width: 'min(900px, 100%)',
        display: 'grid',
        justifyItems: 'center',
        gap: 14,
        minWidth: 0,
        paddingInline: 'clamp(12px, 5vw, 22px)', // ⬅ ensure equal L/R spacing on small screens
        boxSizing: 'border-box',
    };

    const brandRow = {
        display: 'grid',
        gridAutoFlow: 'column',
        alignItems: 'center',
        gap: 10,
    };
    const titleStyle = {
        fontWeight: 800,
        letterSpacing: '-0.02em',
        fontSize: 'clamp(24px, 5vw, 42px)',
        lineHeight: 1.05,
        textAlign: 'center',
    };
    const subtitleStyle = {
        color: sub,
        fontSize: 'clamp(13px, 2.2vw, 16px)',
        textAlign: 'center',
        marginTop: 4,
    };

    // We’ll make both the sign-in card and the grid take 100% of maxWrap’s width,
    // and rely on maxWrap’s side padding to avoid edge-touching on mobile.
    const sectionWidth = '100%';

    // Sign-in card — same width as grid; smaller inner max to avoid clipping on tiny phones
    const cardWrap = {
        width: sectionWidth,
        boxSizing: 'border-box',
        margin: '4px auto 0',
        borderRadius: 18,
        border: `1px solid ${brd}`,
        background: card,
        backdropFilter: 'blur(16px)',
        boxShadow: isDark ? '0 30px 80px rgba(0,0,0,.45)' : '0 30px 80px rgba(0,0,0,.12)',
        padding: 18,                               // a hair smaller
        display: 'grid',
        placeItems: 'center',
    };
    const cardInner = {
        width: 'min(500px, 100%)',                 // ⬅ decreased minimum footprint
        display: 'grid',
        justifyItems: 'center',
        gap: 10,
        textAlign: 'center',
    };

    // Grid locked to 2×2; matches card width; add boxSizing to respect parent padding
    const infoGrid = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        width: sectionWidth,
        margin: '10px auto 0',
        boxSizing: 'border-box',
    };
    const infoCard = {
        borderRadius: 14,
        border: `1px solid ${brd}`,
        background: isDark ? 'rgba(10,16,28,0.65)' : '#fff',
        padding: 12,
        boxShadow: isDark ? '0 10px 24px rgba(0,0,0,.35)' : '0 10px 24px rgba(0,0,0,.10)',
        minWidth: 0,
        boxSizing: 'border-box',
    };

    // Bottom cat — move 2px further (from -4 to -6) so it’s absolutely flush
    const bottomFixed = {
        position: 'fixed',
        left: '50%',
        bottom: -6,                                // ⬅ more down
        transform: 'translateX(-50%)',
        width: 'min(220px, 46vw)',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.95,
    };

    const btnBase = {
        padding: '12px 14px',
        borderRadius: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        cursor: 'pointer',
        fontWeight: 700,
        letterSpacing: '.01em',
        transition: 'transform 160ms ease, box-shadow 160ms ease, filter 120ms ease',
        width: '100%',
    };
    const btnPrimary = {
        ...btnBase,
        border: 'none',
        color: '#fff',
        background: `linear-gradient(135deg, ${accent}, ${accent2})`,
        boxShadow: '0 14px 36px rgba(124,58,237,0.35)',
    };
    const btnGhost = {
        ...btnBase,
        border: `1px solid ${brd}`,
        color: text,
        background: isDark ? 'rgba(9,14,24,0.65)' : 'rgba(255,255,255,0.96)',
        boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.35)' : '0 6px 18px rgba(0,0,0,0.10)',
    };

    const googleLabel = hasLast ? `Continue as ${lastAccountEmail}` : 'Continue with Google';

    return (
        <div style={containerStyle}>
            {isAuthed ? (
                <>{children}</>
            ) : (
                <div style={centerShell}>
                    <div style={maxWrap}>
                        <div style={brandRow}>
                            <img
                                src={logoDefault}
                                alt="CatEngine Logo"
                                style={{
                                    width: 48, height: 48, objectFit: 'contain',
                                    filter: logoFilter, borderRadius: 8,
                                }}
                            />
                            <div style={titleStyle}>CatEngine&nbsp;AI&nbsp;Hub</div>
                        </div>
                        <div style={subtitleStyle}>
                            Use your own API keys. Switch models freely. Keep costs in your control.
                        </div>

                        {/* Sign-in card */}
                        <div style={cardWrap} aria-label="Sign in card">
                            <div style={cardInner}>
                                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                                    Sign in to continue
                                </div>

                                <button onClick={onGoogle} style={btnPrimary} aria-label={googleLabel}>
                                    <GoogleGlyph />
                                    <span>{googleLabel}</span>
                                </button>

                                {hasLast && (
                                    <button
                                        onClick={() => { clearAuthError?.(); loginGoogleSelect?.(); }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: isDark ? '#a5b4fc' : '#4f46e5',
                                            fontWeight: 700,
                                            marginTop: 2,
                                        }}
                                    >
                                        Use another Google account
                                    </button>
                                )}

                                <button onClick={onGuest} style={btnGhost} aria-label="Continue as Guest">
                                    Continue as Guest
                                </button>

                                {authError && (
                                    <div style={{
                                        marginTop: 6, padding: '10px 12px', borderRadius: 10,
                                        border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                                        background: isDark ? '#1f2937' : '#fff5f5',
                                        color: isDark ? '#fecaca' : '#7f1d1d',
                                        width: '100%'
                                    }}>
                                        {String(authError)}
                                    </div>
                                )}

                                <div style={{
                                    marginTop: 8, display: 'flex', justifyContent: 'center', gap: 12,
                                    fontSize: 13, color: sub, width: '100%'
                                }}>
                                    <a
                                        href={`/AI/help.html?theme=${isDark ? 'dark' : 'light'}`}
                                        style={{ color: isDark ? '#a5b4fc' : '#4f46e5', textDecoration: 'none', fontWeight: 700 }}
                                    >
                                        Help &amp; Privacy
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Features — locked 2×2 */}
                        <div style={infoGrid}>
                            {features.map((f, i) => (
                                <div key={i} style={infoCard}>
                                    <div style={{ fontSize: 20, lineHeight: 1 }}>{f.icon}</div>
                                    <div style={{ fontWeight: 700, marginTop: 6 }}>{f.title}</div>
                                    <div style={{ color: sub, marginTop: 4, fontSize: 14 }}>{f.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom cat ONLY on login page */}
            {showLanding && Lottie && catMoveAnim && (
                <div style={bottomFixed} aria-hidden>
                    <Lottie animationData={catMoveAnim} loop autoplay style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
            )}

            {/* Loading overlay */}
            {loading && (
                <LoaderOverlay isDark={isDark} brd={brd} card={card} text={text} Lottie={Lottie} pawAnim={pawAnim} />
            )}
        </div>
    );
}

function LoaderOverlay({ isDark, brd, card, text, Lottie, pawAnim }) {
    return (
        <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,0.10)', backdropFilter: 'blur(2px)', zIndex: 3
        }}>
            <div style={{ width: 140, opacity: 0.95 }}>
                {Lottie && pawAnim ? (
                    <Lottie animationData={pawAnim} loop autoplay style={{ width: '100%', height: '100%', display: 'block' }} />
                ) : (
                    <div style={{
                        padding: '10px 12px', borderRadius: 10, border: `1px solid ${brd}`,
                        background: card, color: text, textAlign: 'center'
                    }}>
                        Loading…
                    </div>
                )}
            </div>
        </div>
    );
}

function GoogleGlyph() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.951,3.049l5.657-5.657C33.64,6.053,29.082,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.818C14.281,16.781,18.755,14,24,14c3.059,0,5.842,1.154,7.951,3.049 l5.657-5.657C33.64,6.053,29.082,4,24,4C15.317,4,7.889,8.99,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.197l-6.191-5.238C29.211,35.091,26.736,36,24,36 c-5.188,0-9.594-3.315-11.273-7.946l-6.5,5.012C8.81,39.057,15.771,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.235-2.231,4.166-3.994,5.566 c0.001-0.001,0.002-0.001,0.003-0.002l6.191,5.238C36.986,39.607,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
        </svg>
    );
}
