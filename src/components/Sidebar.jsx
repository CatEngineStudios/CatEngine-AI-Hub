// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import logoDefault from '../assets/logo.png';

const NOOP = () => { };
const DEFAULT_MODELS = [
    { label: 'GPT-5', value: 'gpt-5' },
    { label: 'GPT-5 Mini', value: 'gpt-5-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'DeepSeek Chat', value: 'deepseek-chat' },
    { label: 'Gemini (Google)', value: 'gemini-2.5-flash' },
];

export default function Sidebar(props = {}) {
    const {
        MODELS: MODELS_IN,
        apiKey = '',
        setApiKey = NOOP,
        showApiKey = false,
        setShowApiKey = NOOP,
        model = (DEFAULT_MODELS[0]?.value || 'gpt-5'),
        setModel = NOOP,
        sessions = [],
        currentSessionId = null,
        setCurrentSessionId = NOOP,
        renamingSessionId = null,
        renameInput = '',
        setRenameInput = NOOP,
        createNewSession = NOOP,
        commitRenameSession = NOOP,
        cancelRenameSession = NOOP,
        startRenameSession = NOOP,
        setSessions = NOOP,
        darkMode = false,
        setDarkMode = NOOP,
    } = props;

    const MODEL_OPTIONS = Array.isArray(MODELS_IN) && MODELS_IN.length ? MODELS_IN : DEFAULT_MODELS;

    // Collapsed/open state (single off-canvas behavior for all devices)
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
    useEffect(() => {
        try { localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0'); } catch { }
    }, [collapsed]);

    const openSidebar = () => setCollapsed(false);
    const closeSidebar = () => setCollapsed(true);

    // Mobile detection (for opener position/sizing tweaks)
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 768px)');
        const uaIsMobile = () =>
            /Mobi|Android|iPhone|iPad|iPod|Windows Phone|FBAN|FBAV|Instagram/i.test(navigator.userAgent);
        const update = () => setIsMobile(mq.matches || uaIsMobile());
        update();
        const handler = update;
        mq.addEventListener?.('change', handler) || mq.addListener?.(handler);
        window.addEventListener('resize', update, { passive: true });
        window.addEventListener('orientationchange', update, { passive: true });
        return () => {
            mq.removeEventListener?.('change', handler) || mq.removeListener?.(handler);
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
        };
    }, []);

    // Per-chat 3-dot menu
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
    const importInputRef = useRef(null);
    const [importTargetId, setImportTargetId] = useState(null);

    const rowBorder = darkMode ? '#273246' : '#e7ebf3';
    const rowBgActive = darkMode ? 'rgba(17, 24, 39, 0.7)' : 'rgba(238, 242, 255, 0.8)';
    const rowBg = darkMode ? 'rgba(31, 41, 55, 0.55)' : 'rgba(255, 255, 255, 0.7)';
    const rowText = darkMode ? '#e5e7eb' : '#162132';

    const menuItemStyle = useMemo(
        () => ({
            padding: '10px 12px',
            cursor: 'pointer',
            borderBottom: `1px solid ${darkMode ? '#1c2435' : '#eef2f7'}`,
            color: rowText,
            transition: 'background 120ms ease',
        }),
        [darkMode, rowText]
    );

    const openMenu = (id, evt) => {
        setOpenMenuId(prev => (prev === id ? null : id));
        if (evt?.currentTarget) {
            const r = evt.currentTarget.getBoundingClientRect();
            const menuWidth = 220;
            const left = Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8));
            const top = r.bottom + 6;
            setMenuPos({ left, top });
        }
    };
    const closeMenu = () => setOpenMenuId(null);

    const onClickRename = (id) => { startRenameSession(id); closeMenu(); };

    const onClickExport = (id) => {
        const s = sessions.find(x => x.id === id);
        if (!s) return;
        const data = JSON.stringify({ title: s.title, messages: s.messages }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (s.title || 'chat') + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        closeMenu();
    };

    const onClickImport = (id) => {
        setImportTargetId(id);
        importInputRef.current?.click();
        closeMenu();
    };

    const onImportFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const msgs = Array.isArray(data?.messages)
                ? data.messages.filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
                : [];
            const newTitle = typeof data?.title === 'string' ? data.title : null;
            setSessions(prev =>
                prev.map(s => (s.id !== importTargetId ? s : { ...s, title: newTitle || s.title, messages: [...s.messages, ...msgs] }))
            );
        } catch (err) {
            alert('Import failed: ' + (err?.message || String(err)));
        } finally {
            setImportTargetId(null);
        }
    };

    // Width & layout
    const width = useMemo(() => {
        if (typeof window === 'undefined') return 320;
        const vw = window.innerWidth;
        return Math.min(Math.round((isMobile ? 0.92 : 0.9) * vw), isMobile ? 360 : 360);
    }, [isMobile]);

    // Theme: gradient + glass panels to match the login page vibe
    const gradient = darkMode
        ? 'linear-gradient(180deg, rgba(10,16,28,0.95), rgba(9,13,24,0.92))'
        : 'linear-gradient(180deg, rgba(245,248,255,0.9), rgba(240,244,255,0.88))';

    const sidebarStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100dvh',
        width,
        transform: collapsed ? 'translateX(-105%)' : 'translateX(0)',
        transition: 'transform 240ms cubic-bezier(0.2,0.8,0.2,1)',
        zIndex: 1200,
        borderRight: `1px solid ${rowBorder}`,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: collapsed ? 'none' : 'auto',
        background: gradient,
        boxSizing: 'border-box',
        boxShadow: '0 30px 80px rgba(0,0,0,.35)',
        backdropFilter: 'saturate(160%) blur(10px)',
    };

    const card = {
        background: darkMode ? 'rgba(15,22,37,0.55)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${rowBorder}`,
        borderRadius: 14,
        boxShadow: darkMode
            ? '0 8px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.03)'
            : '0 8px 24px rgba(20,40,120,.08), inset 0 1px 0 rgba(255,255,255,.4)',
        backdropFilter: 'blur(10px)',
    };

    const inputShell = {
        display: 'flex', alignItems: 'center',
        padding: '10px 12px',
        border: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`,
        background: darkMode ? 'rgba(9,14,26,0.7)' : 'rgba(255,255,255,0.9)',
        borderRadius: 10,
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
    };

    // Delete chat
    const handleDelete = (id, title = 'this chat') => {
        if (!id) return;
        const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
        if (!ok) return;

        setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            if (currentSessionId === id) {
                if (next.length > 0) {
                    setCurrentSessionId(next[0].id);
                } else {
                    const newSession = { id: `s_${Date.now()}`, title: 'New Chat', messages: [] };
                    setCurrentSessionId(newSession.id);
                    return [newSession];
                }
            }
            return next;
        });

        closeMenu();
    };

    return (
        <>
            {/* Scrim when open */}
            {!collapsed && (
                <div
                    onClick={closeSidebar}
                    aria-hidden="true"
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1190 }}
                />
            )}

            {/* Floating opener (hamburger) */}
            {collapsed && (
                <button
                    onClick={openSidebar}
                    aria-label="Open sidebar"
                    title="Open"
                    style={{
                        position: 'fixed',
                        left: 12,
                        top: 'calc(env(safe-area-inset-top) + 16px)',
                        zIndex: 1300,
                        width: 42,
                        height: 42,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 12,
                        border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                        background: darkMode ? 'rgba(17,24,39,.9)' : 'rgba(255,255,255,.95)',
                        color: rowText,
                        boxShadow: '0 10px 28px rgba(0,0,0,.22)',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    ☰
                </button>
            )}

            {/* SIDEBAR */}
            <div className="sidebar" style={sidebarStyle}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px',
                        borderBottom: `1px solid ${rowBorder}`,
                    }}
                >
                    <img
                        src={logoDefault}
                        alt="App Logo"
                        style={{
                            width: 44,
                            height: 44,
                            objectFit: 'contain',
                            background: 'transparent',
                            borderRadius: 10,
                            display: 'block',
                            filter: darkMode ? 'grayscale(1) brightness(0) invert(1)' : 'none',
                        }}
                    />

                    <div
                        style={{
                            fontWeight: 800,
                            letterSpacing: '.2px',
                            fontSize: 20,
                            color: rowText,
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title="CatEngine AI Hub"
                    >
                        CatEngine AI Hub
                    </div>

                    <button
                        onClick={closeSidebar}
                        title="Close"
                        style={{
                            border: `1px solid ${darkMode ? '#3b4456' : '#e5e7eb'}`,
                            background: darkMode ? 'rgba(17,24,39,.85)' : 'rgba(255,255,255,.95)',
                            color: rowText,
                            borderRadius: 10,
                            cursor: 'pointer',
                            padding: '8px 12px',
                            lineHeight: 1,
                            flex: '0 0 auto',
                            boxShadow: '0 4px 14px rgba(0,0,0,.12)',
                            backdropFilter: 'blur(6px)',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* AI Settings card */}
                <div style={{ ...card, margin: '12px 10px 8px', padding: 12 }}>
                    <h3 style={{ margin: 0, marginBottom: 10, color: rowText, fontSize: 14, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        AI Settings
                    </h3>

                    {/* API Key */}
                    <div style={{ marginBottom: 12 }}>
                        <div
                            style={{
                                fontSize: 12,
                                letterSpacing: '.04em',
                                textTransform: 'uppercase',
                                color: darkMode ? '#9ca3af' : '#6b7280',
                                marginBottom: 6,
                            }}
                        >
                            API Key
                        </div>
                        <div style={inputShell}>
                            <span style={{ opacity: 0.9, marginRight: 8 }}>🔑</span>
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-xxxx..."
                                autoComplete="off"
                                style={{
                                    flex: '1 1 auto',
                                    minWidth: 0,
                                    border: 'none',
                                    outline: 'none',
                                    background: 'transparent',
                                    color: darkMode ? '#e5e7eb' : '#111827',
                                    fontSize: 14,
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey((v) => !v)}
                                title={showApiKey ? 'Hide API key' : 'Show API key'}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '0 6px',
                                    margin: 0,
                                    lineHeight: 1,
                                    fontSize: 18,
                                    cursor: 'pointer',
                                    color: darkMode ? '#e5e7eb' : '#111827',
                                    flex: '0 0 auto',
                                }}
                            >
                                {showApiKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Model select */}
                    <div style={{ marginBottom: 4 }}>
                        <div
                            style={{
                                fontSize: 12,
                                letterSpacing: '.04em',
                                textTransform: 'uppercase',
                                color: darkMode ? '#9ca3af' : '#6b7280',
                                marginBottom: 6,
                            }}
                        >
                            Model
                        </div>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                style={{
                                    width: '100%',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    padding: '10px 36px 10px 12px',
                                    border: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`,
                                    background: darkMode ? 'rgba(9,14,26,0.7)' : 'rgba(255,255,255,0.95)',
                                    color: darkMode ? '#e5e7eb' : '#111827',
                                    borderRadius: 10,
                                    outline: 'none',
                                    fontSize: 14,
                                    boxShadow: darkMode
                                        ? 'inset 0 1px 0 rgba(255,255,255,.04), 0 1px 0 rgba(0,0,0,.2)'
                                        : 'inset 0 1px 0 rgba(255,255,255,.4), 0 1px 0 rgba(0,0,0,.02)',
                                    backdropFilter: 'blur(6px)',
                                }}
                            >
                                {MODEL_OPTIONS.map((m) => (
                                    <option key={m.value} value={m.value} disabled={m.disabled || false}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                            <span
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    opacity: 0.7,
                                    color: darkMode ? '#e5e7eb' : '#111827',
                                }}
                            >
                                ▾
                            </span>
                        </div>
                    </div>
                </div>

                {/* Chats card */}
                <div style={{ ...card, margin: '8px 10px', padding: 12, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: rowText, marginBottom: 10 }}>
                        <strong style={{ fontSize: 14, letterSpacing: '.04em', textTransform: 'uppercase' }}>Chats</strong>
                        <button
                            onClick={createNewSession}
                            style={{
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                padding: '8px 12px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 22px rgba(34,197,94,.35)',
                            }}
                        >
                            + New
                        </button>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        <div
                            className="session-list"
                            style={{
                                display: 'grid',
                                gap: 8,
                                paddingRight: 4,
                                overflowX: 'hidden',
                                width: '100%',
                                boxSizing: 'border-box',
                            }}
                        >
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                                    onClick={() => setCurrentSessionId(session.id)}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        padding: '10px 12px',
                                        borderRadius: 12,
                                        border: `1px solid ${rowBorder}`,
                                        background: session.id === currentSessionId ? rowBgActive : rowBg,
                                        color: rowText,
                                        cursor: 'pointer',
                                        width: '100%',
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                        transition: 'transform 120ms ease, box-shadow 160ms ease',
                                        boxShadow: session.id === currentSessionId ? '0 10px 28px rgba(0,0,0,.18)' : '0 4px 10px rgba(0,0,0,.06)',
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                                        {renamingSessionId === session.id ? (
                                            <input
                                                type="text"
                                                value={renameInput}
                                                onChange={(e) => setRenameInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitRenameSession();
                                                    if (e.key === 'Escape') cancelRenameSession();
                                                }}
                                                onBlur={commitRenameSession}
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    minWidth: 0,
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`,
                                                    background: darkMode ? 'rgba(17,24,39,.8)' : '#fff',
                                                    color: 'inherit',
                                                    boxSizing: 'border-box',
                                                    outline: 'none',
                                                }}
                                            />
                                        ) : (
                                            <span
                                                onDoubleClick={() => startRenameSession(session.id)}
                                                title={session.title}
                                                style={{
                                                    display: 'block',
                                                    maxWidth: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {session.title}
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        style={{ marginLeft: 8, position: 'relative', flex: '0 0 auto' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={(e) => openMenu(session.id, e)}
                                            title="More"
                                            style={{
                                                padding: '6px 10px',
                                                background: darkMode ? 'rgba(55,65,81,.7)' : 'rgba(243,244,246,.95)',
                                                border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                boxShadow: '0 6px 16px rgba(0,0,0,.12)',
                                            }}
                                        >
                                            ⋯
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hidden import input */}
                <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    style={{ display: 'none' }}
                    onChange={onImportFileChange}
                />

                {/* Footer actions */}
                <div
                    style={{
                        margin: '8px 10px 12px',
                        padding: 10,
                        borderTop: `1px solid ${rowBorder}`,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        ...card,
                    }}
                >
                    <button
                        onClick={() => {
                            const theme = darkMode ? 'dark' : 'light';
                            const url = `/AI/help.html?theme=${encodeURIComponent(theme)}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                            border: 'none',
                            background: darkMode ? 'rgba(17,24,39,.85)' : 'rgba(255,255,255,.96)',
                            color: rowText,
                            borderRadius: 10,
                            cursor: 'pointer',
                            padding: '10px 12px',
                            boxShadow: '0 6px 18px rgba(0,0,0,.12)',
                        }}
                    >
                        Help & Privacy
                    </button>

                    <button
                        onClick={() => setDarkMode((v) => !v)}
                        aria-label="Toggle dark mode"
                        title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
                        style={{
                            width: 44,
                            height: 44,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: 12,
                            border: `1px solid ${darkMode ? '#3b4456' : '#e5e7eb'}`,
                            background: darkMode ? 'rgba(17,24,39,.85)' : 'rgba(255,255,255,.95)',
                            color: rowText,
                            cursor: 'pointer',
                            boxShadow: '0 8px 22px rgba(0,0,0,.18)',
                        }}
                    >
                        {darkMode ? '☀︎' : '☾'}
                    </button>
                </div>

                {/* Floating 3-dot menu */}
                {openMenuId && (
                    <div
                        style={{
                            position: 'fixed',
                            left: menuPos.left,
                            top: menuPos.top,
                            width: 220,
                            background: darkMode ? 'rgba(12,18,32,.98)' : '#ffffff',
                            border: `1px solid ${darkMode ? '#1f2a3d' : '#e5e7eb'}`,
                            borderRadius: 12,
                            boxShadow: '0 18px 44px rgba(0,0,0,.35)',
                            zIndex: 2000,
                            backdropFilter: 'blur(10px)',
                            overflow: 'hidden',
                        }}
                        onMouseLeave={closeMenu}
                    >
                        <div
                            style={{ ...menuItemStyle }}
                            onClick={() => onClickRename(openMenuId)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? 'rgba(32,42,66,.6)' : '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            Rename
                        </div>
                        <div
                            style={{ ...menuItemStyle }}
                            onClick={() => onClickExport(openMenuId)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? 'rgba(32,42,66,.6)' : '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            Export…
                        </div>
                        <div
                            style={{ ...menuItemStyle }}
                            onClick={() => onClickImport(openMenuId)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? 'rgba(32,42,66,.6)' : '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            Import into this chat…
                        </div>
                        <div
                            style={{ ...menuItemStyle, borderBottom: 'none', color: '#ef4444' }}
                            onClick={() => {
                                const s = sessions.find((x) => x.id === openMenuId);
                                handleDelete(openMenuId, s?.title || 'this chat');
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? 'rgba(80,20,20,.45)' : '#fff1f2')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            Delete
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
