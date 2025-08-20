// src/pages/FrontPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import logoDefault from '../assets/logo.png';
import heroAnim from '../assets/hero.json';          // put your lottie here
import { motion, AnimatePresence } from 'framer-motion';
import { Particles } from '@tsparticles/react';
import { Container, Engine } from '@tsparticles/engine';

export default function FrontPage({ children }) {
    const {
        profile, loading,
        authError, clearAuthError,
        loginGoogle, loginGoogleSelect, loginGoogleWithHint,
        loginGuest,
        lastAccountEmail,
    } = useAuth();

    // Inter font (one-time)
    useEffect(() => {
        const id = 'ce-inter-font';
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    // Theme (system + ?theme=)
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
        const handler = (e) => setPrefersDark(e.matches);
        mq.addEventListener?.('change', handler);
        return () => mq.removeEventListener?.('change', handler);
    }, []);

    const isDark = override ? override === 'dark' : prefersDark;

    // Palette
    const bg = isDark ? '#070b13' : '#f6f9ff';
    const text = isDark ? '#e7ecf3' : '#0f1a2a';
    const sub = isDark ? '#a0a8b5' : '#51607a';
    const glassBg = isDark ? 'rgba(9,14,24,0.55)' : 'rgba(255,255,255,0.55)';
    const glassBrd = isDark ? 'rgba(70,96,124,0.25)' : 'rgba(15,26,42,0.12)';
    const accent = isDark ? '#60a5fa' : '#2563eb';
    const accent2 = isDark ? '#c084fc' : '#7c3aed';
    const logoFilter = isDark ? 'grayscale(1) brightness(0) invert(1)' : 'none';

    // Auth flags (no early return — we switch views in JSX)
    const isAuthed = !!(profile && (profile.uid || profile.mode === 'guest'));
    const showLanding = !loading && !isAuthed;
    const hasLast = !!lastAccountEmail;

    // Actions
    const onGoogle = () => {
        clearAuthError();
        if (hasLast) return loginGoogleWithHint(lastAccountEmail);
        return loginGoogleSelect?.() || loginGoogle();
    };
    const onGuest = () => { clearAuthError(); loginGuest(); };

    // tsParticles init
    const particlesInit = useCallback(async (engine /** @type {Engine} */) => {
        // Load a small engine at runtime to keep bundle lean
        const { loadSlim } = await import('@tsparticles/slim');
        await loadSlim(engine);
    }, []);

    // tsParticles options (subtle, performant)
    const particleOptions = useMemo(() => ({
        background: { color: { value: 'transparent' } },
        fullScreen: { enable: false },
        fpsLimit: 60,
        particles: {
            number: { value: 35, density: { enable: true, area: 800 } },
            color: { value: isDark ? '#5a83ff' : '#7c3aed' },
            links: { enable: true, color: isDark ? '#5a83ff' : '#7c3aed', distance: 120, opacity: 0.25, width: 1 },
            move: { enable: true, speed: 0.6, outModes: { default: 'out' } },
            opacity: { value: 0.35 },
            size: { value: { min: 1, max: 3 } }
        },
        detectRetina: true
    }), [isDark]);

    const containerStyle = {
        position: 'fixed', inset: 0, overflow: 'hidden',
        background: bg, color: text,
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    };

    const sectionPad = { minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '64px 18px' };

    const titleGradient = {
        backgroundImage: `linear-gradient(90deg, ${accent}, ${accent2})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent'
    };

    const btn = (primary = false) => ({
        padding: '14px 18px',
        borderRadius: 14,
        border: primary ? 'none' : `1px solid ${glassBrd}`,
        background: primary
            ? `linear-gradient(135deg, ${accent}, ${accent2})`
            : (isDark ? 'rgba(9,14,24,0.65)' : 'rgba(255,255,255,0.85)'),
        color: primary ? '#ffffff' : text,
        cursor: 'pointer',
        fontWeight: 700,
        letterSpacing: '.01em',
        boxShadow: primary
            ? '0 12px 30px rgba(124,58,237,0.35)'
            : (isDark ? '0 6px 18px rgba(0,0,0,0.35)' : '0 6px 18px rgba(0,0,0,0.08)'),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        willChange: 'transform',
    });

    const benefits = useMemo(() => ([
        'Bring Your Own API Key — stop paying pricey chatbot subscriptions.',
        'Switch between GPT-5, GPT-4, DeepSeek, and Gemini instantly.',
        'Attach text & images, stream answers, stop anytime.',
        'Smart context windowing avoids token-limit crashes.',
    ]), []);

    return (
        <div style={containerStyle}>
            {/* keyframes */}
            <style>{`
        @keyframes gradientShift { 0%{transform:translate3d(0,0,0) rotate(0)} 50%{transform:translate3d(-2%,1%,0) rotate(10deg)} 100%{transform:translate3d(0,0,0) rotate(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes fadeUp { 0%{opacity:0; transform:translateY(12px)} 100%{opacity:1; transform:translateY(0)} }
        @keyframes ticker { 0%{transform:translateY(0)} 25%{transform:translateY(-24px)} 50%{transform:translateY(-48px)} 75%{transform:translateY(-72px)} 100%{transform:translateY(0)} }
      `}</style>

            {/* Background gradients */}
            <div aria-hidden style={{
                position: 'absolute', inset: '-10%',
                background: isDark
                    ? 'radial-gradient(1200px 700px at 15% 20%, rgba(37,99,235,.20), transparent 60%), radial-gradient(900px 600px at 85% 70%, rgba(124,58,237,.18), transparent 60%), linear-gradient(180deg, #070b13 0%, #0a1120 100%)'
                    : 'radial-gradient(1200px 700px at 15% 20%, rgba(37,99,235,.15), transparent 60%), radial-gradient(900px 600px at 85% 70%, rgba(124,58,237,.15), transparent 60%), linear-gradient(180deg, #f6f9ff 0%, #f1f5ff 100%)',
                animation: 'gradientShift 22s ease-in-out infinite',
                filter: 'saturate(105%)',
            }} />
            {/* Particles (kept subtle) */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <Particles id="bg-particles" init={particlesInit} options={particleOptions} />
            </div>

            {/* MAIN SWITCHER */}
            <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {/* App children when authed */}
                <AnimatePresence mode="wait">
                    {isAuthed && (
                        <motion.div
                            key="app"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ minHeight: '100dvh' }}
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Landing when not authed */}
                <AnimatePresence mode="wait">
                    {showLanding && (
                        <motion.section
                            key="landing"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: .35, ease: 'easeOut' }}
                            style={sectionPad}
                        >
                            <div style={{ width: '100%', maxWidth: 1200, display: 'grid', gap: 24 }}>
                                {/* Logo + Title */}
                                <motion.div
                                    initial={{ opacity: 0, y: 12, scale: .98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: .45 }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}
                                >
                                    <img src={logoDefault} alt="CatEngine" style={{ width: 56, height: 56, objectFit: 'contain', filter: logoFilter }} />
                                    <h1 style={{
                                        margin: 0,
                                        fontWeight: 800,
                                        fontSize: 'clamp(28px, 6.2vw, 54px)',
                                        letterSpacing: '-.02em',
                                        lineHeight: 1.05,
                                        ...titleGradient
                                    }}>
                                        CatEngine&nbsp;AI&nbsp;Hub
                                    </h1>
                                </motion.div>

                                {/* Subtitle */}
                                <motion.p
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: .05, duration: .4 }}
                                    style={{
                                        textAlign: 'center',
                                        maxWidth: 900,
                                        margin: '0 auto',
                                        color: sub,
                                        fontSize: 'clamp(15px, 2.6vw, 19px)',
                                        lineHeight: 1.7
                                    }}
                                >
                                    Stop renting answers. <b style={{ color: text }}>Bring your own API key</b> and use multiple models—
                                    GPT-5, GPT-4, DeepSeek, Gemini—<b style={{ color: text }}>without subscriptions</b>.
                                </motion.p>

                                {/* Hero band: Lottie + CTA card */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.2fr 1fr',
                                    gap: 20,
                                    alignItems: 'center',
                                }}>
                                    {/* Lottie hero (fallback to static if JSON missing) */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: .08, duration: .45 }}
                                        style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}
                                    >
                                        {/* Lightweight inlined player via lottie-react */}
                                        {/* If you prefer, replace with an <img> or SVG */}
                                        <LottieProxy animationData={heroAnim} dark={isDark} />
                                    </motion.div>

                                    {/* CTA card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: .12, duration: .45 }}
                                        style={{
                                            margin: '0 auto',
                                            width: '100%',
                                            maxWidth: 720,
                                            borderRadius: 18,
                                            border: `1px solid ${glassBrd}`,
                                            background: glassBg,
                                            backdropFilter: 'blur(14px)',
                                            boxShadow: isDark ? '0 30px 80px rgba(0,0,0,.45)' : '0 30px 80px rgba(0,0,0,.12)',
                                            padding: '22px',
                                        }}
                                    >
                                        <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
                                            {/* Benefits ticker */}
                                            <div style={{
                                                margin: '4px auto 0',
                                                height: 24,
                                                overflow: 'hidden',
                                                color: isDark ? '#cbd5e1' : '#23324a',
                                                fontWeight: 600,
                                                fontSize: 14,
                                                letterSpacing: '.01em',
                                                textAlign: 'center',
                                            }}>
                                                <div style={{ display: 'inline-block', animation: 'ticker 12s ease-in-out infinite' }}>
                                                    {benefits.map((b, i) => (
                                                        <div key={i} style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                                                            {b}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* CTAs */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                                                <motion.button
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={onGoogle}
                                                    style={btn(true)}
                                                    title="Log in with Google"
                                                >
                                                    <GoogleGlyph />
                                                    {hasLast ? `Continue with Google` : `Log in with Google`}
                                                </motion.button>

                                                <motion.button
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ y: 0 }}
                                                    onClick={onGuest}
                                                    style={btn(false)}
                                                    title="Try without an account"
                                                >
                                                    🚀 Continue as Guest
                                                </motion.button>
                                            </div>

                                            <div style={{ textAlign: 'center', color: sub, fontSize: 13 }}>
                                                No subscription. Your API keys stay yours. Chats can be stored locally (guest) or in your account.
                                            </div>

                                            {authError && (
                                                <div role="alert" style={{
                                                    marginTop: 4, padding: '10px 12px', borderRadius: 12,
                                                    background: isDark ? '#3f1d1d' : '#fde8e8',
                                                    border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                                                    color: isDark ? '#fecaca' : '#7f1d1d',
                                                    width: '100%', maxWidth: 560, textAlign: 'center'
                                                }}>
                                                    {authError}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>

            {/* Loading overlay */}
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                    background: 'transparent', pointerEvents: 'none'
                }}>
                    <div style={{
                        padding: '10px 12px', borderRadius: 10, border: `1px solid ${glassBrd}`,
                        background: glassBg, backdropFilter: 'blur(10px)'
                    }}>
                        Loading…
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- Small in-file helpers ---------- */

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

function LottieProxy({ animationData, dark }) {
    // imported here to avoid SSR issues; lottie-react is a thin wrapper over lottie-web. :contentReference[oaicite:5]{index=5}
    const [Lottie, setLottie] = useState(null);
    useEffect(() => {
        let mounted = true;
        import('lottie-react').then(mod => { if (mounted) setLottie(() => mod.default); });
        return () => { mounted = false; };
    }, []);
    if (!Lottie || !animationData) {
        return (
            <div style={{
                width: '100%', maxWidth: 540, height: 260,
                borderRadius: 16, border: `1px dashed ${dark ? '#334155' : '#cbd5e1'}`,
                display: 'grid', placeItems: 'center', color: dark ? '#9ca3af' : '#64748b'
            }}>
                Animation
            </div>
        );
    }
    return (
        <Lottie
            animationData={animationData}
            loop
            autoplay
            style={{ width: '100%', maxWidth: 560, height: 'auto', transform: 'translateZ(0)' }}
        />
    );
}
