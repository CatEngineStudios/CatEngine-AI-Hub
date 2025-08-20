// src/App.jsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AccountBadge from './components/AccountBadge';
import useChatLogic from './hooks/useChatLogic';
import LoginGate from './pages/LoginGate';
import ProfilePage from './pages/ProfilePage';
import logoDefault from './assets/logo.png';
import FrontPage from './pages/FrontPage.jsx';

export default function App() {
    const chat = useChatLogic();                 // darkMode, sessions, etc.
    const [currentPage, setCurrentPage] = useState('chat'); // 'chat' | 'profile'

    const appBg = chat.darkMode ? '#0a0f1c' : '#ffffff';
    const headerBg = chat.darkMode ? '#0c1322' : '#f8fafc';
    const headerBorder = chat.darkMode ? '#1f2a44' : '#e5e7eb';
    const headerText = chat.darkMode ? '#e5e7eb' : '#111827';
    const headerHeight = 56;

    const goProfile = () => setCurrentPage('profile');
    const goChat = () => setCurrentPage('chat');


    return (


        <LoginGate>
            <div
                style={{
                    position: 'fixed', // lock to the window (no page scroll)
                    inset: 0,
                    overflow: 'hidden',
                    background: appBg,
                }}
            >
                {/* Header */}
                <header


                    style={{
                        position: 'fixed',
                        insetInline: 0,
                        top: 0,
                        height: headerHeight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        // leave space on the left so the mobile hamburger (from Sidebar) doesn't overlap
                        padding: '8px 12px 8px 60px',
                        background: headerBg,
                        borderBottom: `1px solid ${headerBorder}`,
                        zIndex: 1100,
                    }}



                >


                    {/* Logo + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <img
                            src={logoDefault}
                            alt="App Logo"
                            style={{
                                width: 24,
                                height: 24,
                                objectFit: 'contain',
                                borderRadius: 4,
                                background: 'transparent',
                                // show white-ish in dark mode
                                filter: chat.darkMode ? 'grayscale(1) brightness(0) invert(1)' : 'none',
                                flex: '0 0 auto',
                            }}
                        />
                        <div
                            style={{
                                fontWeight: 600,
                                fontSize: 16,
                                color: headerText,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minWidth: 0,
                            }}
                            title="CatEngine AI Hub"
                        >
                            CatEngine AI Hub
                        </div>
                    </div>

                    {/* Right side: Dark-mode toggle (inside AccountBadge) + Account */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AccountBadge
                            darkMode={chat.darkMode}
                            onToggleDarkMode={() => chat.setDarkMode(v => !v)}  // ⬅️ NEW: wire toggle
                            onOpenProfile={goProfile}                            // opens Profile page
                        />
                    </div>

                </header>

                {/* Sidebar (handles its own mobile overlay + hamburger button) */}
                <Sidebar {...chat} />

                {/* Main content column */}
                <main
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%',
                        paddingTop: headerHeight,
                        overflow: 'hidden', // only inner panes scroll
                        minWidth: 0,
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Centering rail + max width (ChatGPT-like) */}
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '12px',      // side breathing room
                            boxSizing: 'border-box',
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                maxWidth: 980,       // cap on large screens
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                            }}
                        >
                            {currentPage === 'profile' ? (
                                <ProfilePage
                                    darkMode={chat.darkMode}
                                    logic={chat}
                                    onBack={goChat}
                                />
                            ) : (
                                <ChatWindow {...chat} />
                            )}
                        </div>
                    </div>
                </main>
            </div>
            </LoginGate>
        
    );
}
