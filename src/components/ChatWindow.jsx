// src/components/ChatWindow.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import RenderMessageContent from './MessageContent';

export default function ChatWindow({
    // chat/session API
    currentSession,
    deleteCurrentSession,
    // editor state
    editingMessageIndex,
    editingMessageText,
    startEditMessage,
    saveEditedMessage,
    cancelEditMessage,
    setEditingMessageText,
    // io / model state
    input,
    setInput,
    loading,
    sendMessage,
    stopGenerating,
    // attachments
    attachments = [],            // File[]
    onFilesSelected = () => { },  // (FileList) => void
    removeAttachment = () => { }, // (index:number) => void
    // misc
    darkMode = false,
    chatEndRef,
}) {
    const rawSession = typeof currentSession === 'function' ? currentSession() : null;
    const session = rawSession && typeof rawSession === 'object' ? rawSession : { id: 'empty', title: 'New Chat', messages: [] };
    const messages = Array.isArray(session.messages) ? session.messages : [];

    const fileInputRef = useRef(null);
    const [pickerNonce, setPickerNonce] = useState(0);

    useEffect(() => { setPickerNonce(n => n + 1); }, [attachments.length]);

    useEffect(() => {
        try { chatEndRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch { }
    }, [messages.length, loading, chatEndRef]);

    // Theme tokens
    const text = darkMode ? '#e7ecf3' : '#0f1a2a';
    const sub = darkMode ? '#a0a8b5' : '#51607a';
    const brd = darkMode ? '#2b3445' : '#d9e0ea';
    const accent = darkMode ? '#60a5fa' : '#2563eb';
    const accent2 = darkMode ? '#c084fc' : '#7c3aed';

    // Scrollbar theming (scoped)
    const scrollStyles = useMemo(() => `
    .chat-scroll::-webkit-scrollbar { width: 12px; }
    .chat-scroll::-webkit-scrollbar-track { background: ${darkMode ? '#0b1220' : '#f3f4f6'}; }
    .chat-scroll::-webkit-scrollbar-thumb {
      background: ${darkMode ? '#1f2937' : '#cbd5e1'};
      border-radius: 8px;
      border: 3px solid ${darkMode ? '#0b1220' : '#f3f4f6'};
    }
    @supports (scrollbar-color: auto) {
      .chat-scroll { scrollbar-color: ${darkMode ? '#1f2937 #0b1220' : '#9ca3af #f3f4f6'}; }
    }
  `, [darkMode]);

    const animCss = useMemo(() => `
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: none; }
    }
    @media (max-width: 640px) {
      .composer-row { gap: 8px !important; }
    }
  `, []);

    const acceptTypes = [
        '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.cpp', '.c', '.go', '.rs', '.rb', '.php', '.sh',
        '.yml', '.yaml', '.xml', '.sql', '.html', '.css',
        '.png', '.jpg', '.jpeg', '.webp', '.gif'
    ].join(',');

    const isImage = (f) =>
        (f && typeof f.type === 'string' && f.type.startsWith('image/')) ||
        (f && typeof f.name === 'string' && /\.(png|jpe?g|gif|webp)$/i.test(f.name));

    const empty = !messages.length;

    return (
        <div
            className="main-chat"
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                minHeight: 0,
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
        >
            {/* Scoped styles */}
            <style>{scrollStyles}</style>
            <style>{animCss}</style>

            {/* Foreground content (centered column with max width) */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    padding: 'clamp(8px, 2.5vw, 16px)',
                    paddingBottom: `max(12px, calc(env(safe-area-inset-bottom) + 12px))`,
                }}
            >
                <div
                    style={{
                        width: 'min(980px, 100%)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        boxSizing: 'border-box',
                    }}
                >

                    {/* CHAT WINDOW — single normal background (card) */}
                    <div
                        className="chat-window chat-scroll"
                        aria-live="polite"
                        aria-label="Chat messages"
                        style={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            padding: 12,
                            background: darkMode ? '#0b1220' : '#ffffff',
                            border: `1px solid ${brd}`,
                            borderRadius: 16,
                            boxShadow: darkMode ? '0 12px 28px rgba(0,0,0,.45)' : '0 12px 28px rgba(0,0,0,.12)',
                            whiteSpace: 'pre-wrap',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            justifyContent: empty ? 'center' : 'flex-start',
                            alignItems: empty ? 'center' : 'stretch',
                        }}
                    >
                        {empty ? (
                            <div style={{ opacity: 0.85, textAlign: 'center', maxWidth: 560, color: sub }}>
                                Type a message or attach a file to get started.
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}
                                    aria-label={msg.role === 'user' ? 'User message' : 'AI message'}
                                    style={{
                                        alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end', // user left, AI right
                                        maxWidth: '80%',
                                        padding: '10px 14px',
                                        borderRadius: 16,
                                        lineHeight: 1.45,
                                        fontSize: '1rem',
                                        wordWrap: 'break-word',
                                        boxShadow: darkMode ? '0 8px 22px rgba(0,0,0,.35)' : '0 8px 22px rgba(0,0,0,.10)',
                                        background: msg.role === 'user'
                                            ? (darkMode ? '#0b3a7a' : '#cfe3ff')
                                            : (darkMode ? '#121927' : '#ffffff'),
                                        border: `1px solid ${darkMode ? '#223048' : '#e6ecf4'}`,
                                        color: msg.role === 'user'
                                            ? (darkMode ? '#e5f0ff' : '#0f1a2a')
                                            : (darkMode ? '#e6ebf3' : '#1b2432'),
                                        position: 'relative',
                                        animation: 'msgIn .18s ease both',
                                    }}
                                    onDoubleClick={() => startEditMessage(i)}
                                    title="Double click to edit this message"
                                >
                                    {editingMessageIndex === i ? (
                                        <textarea
                                            autoFocus
                                            value={editingMessageText}
                                            onChange={(e) => setEditingMessageText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    saveEditedMessage();
                                                }
                                                if (e.key === 'Escape') {
                                                    cancelEditMessage();
                                                }
                                            }}
                                            onBlur={saveEditedMessage}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                fontSize: '1rem',
                                                borderRadius: 12,
                                                padding: 10,
                                                resize: 'vertical',
                                                border: `1px solid ${brd}`,
                                                background: darkMode ? '#0b1220' : '#fff',
                                                color: text,
                                                outline: 'none',
                                            }}
                                        />
                                    ) : (
                                        <RenderMessageContent content={msg.content} />
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* ATTACHMENT PREVIEWS (inline chips) */}
                    {attachments.length > 0 && (
                        <div
                            className="attachments-inline"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                                padding: '0 2px',
                            }}
                        >
                            {attachments.map((f, idx) => (
                                <div
                                    key={`${f.name}-${idx}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 8px',
                                        borderRadius: 12,
                                        border: `1px solid ${brd}`,
                                        background: darkMode ? '#0b1220' : '#fff',
                                        color: darkMode ? '#e5e7eb' : '#111827',
                                        maxWidth: 260,
                                        boxShadow: darkMode ? '0 8px 20px rgba(0,0,0,.35)' : '0 8px 20px rgba(0,0,0,.10)',
                                    }}
                                    title={f.name}
                                >
                                    {isImage(f) ? (
                                        <img
                                            src={URL.createObjectURL(f)}
                                            onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                            alt={f.name}
                                            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 14 }}>📄</span>
                                    )}
                                    <span
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontSize: 12,
                                        }}
                                    >
                                        {f.name}
                                    </span>
                                    <button
                                        onClick={() => removeAttachment(idx)}
                                        title="Remove"
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: darkMode ? '#e5e7eb' : '#111827',
                                            cursor: 'pointer',
                                            padding: 2,
                                            lineHeight: 1,
                                            fontSize: 16,
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ATTACH TOOLBAR — ABOVE the input field */}
                    <div
                        className="attach-toolbar"
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        {/* Hidden file input */}
                        <input
                            id="filePicker"
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={acceptTypes}
                            key={pickerNonce}
                            onClick={(e) => { e.target.value = null; }}
                            onChange={(e) => {
                                onFilesSelected(e.target.files);
                                e.target.value = null;
                                setPickerNonce(n => n + 1);
                            }}
                            style={{ display: 'none' }}
                        />

                        {/* Attach button (same styling as before) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `1px solid ${brd}`,
                                background: darkMode ? '#0e1526' : '#ffffff',
                                color: darkMode ? '#e5e7eb' : '#111827',
                                borderRadius: 14,
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                flex: '0 0 auto',
                                boxShadow: darkMode ? '0 10px 24px rgba(0,0,0,.35)' : '0 10px 24px rgba(0,0,0,.10)',
                                transition: 'transform 120ms ease, box-shadow 120ms ease, background 120ms ease',
                            }}
                            onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
                            onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            title="Attach files"
                        >
                            📎 Attach
                        </button>
                    </div>

                    {/* COMPOSER (textarea + Send/Stop) */}
                    <div
                        className="composer-row"
                        style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-end',
                        }}
                    >
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!loading && input.trim()) sendMessage();
                                }
                            }}
                            placeholder="Type your message… (Shift+Enter for newline)"
                            rows={2}
                            style={{
                                flex: 1,
                                minHeight: 52,
                                maxHeight: 200,
                                resize: 'vertical',
                                borderRadius: 16,
                                border: `1px solid ${brd}`,
                                background: darkMode ? '#0b1220' : '#ffffff',
                                color: text,
                                outline: 'none',
                                padding: '12px 14px',
                                fontSize: 14,
                                boxSizing: 'border-box',
                                boxShadow: darkMode ? '0 10px 26px rgba(0,0,0,.45)' : '0 10px 26px rgba(0,0,0,.12)',
                            }}
                        />

                        {!loading ? (
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim()}
                                title="Send (Enter)"
                                style={{
                                    border: 'none',
                                    background: input.trim()
                                        ? `linear-gradient(135deg, ${accent}, ${accent2})`
                                        : (darkMode ? '#1f2937' : '#e5e7eb'),
                                    color: input.trim() ? '#fff' : (darkMode ? '#9ca3af' : '#6b7280'),
                                    borderRadius: 14,
                                    padding: '12px 16px',
                                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                                    fontWeight: 800,
                                    letterSpacing: '.01em',
                                    boxShadow: input.trim()
                                        ? '0 14px 30px rgba(124,58,237,0.35)'
                                        : 'none',
                                    flex: '0 0 auto',
                                    transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease',
                                    filter: input.trim() ? 'saturate(1.05)' : 'none',
                                }}
                                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
                                onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                Send
                            </button>
                        ) : (
                            <button
                                onClick={stopGenerating}
                                title="Stop generating"
                                style={{
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#fff',
                                    borderRadius: 14,
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    letterSpacing: '.01em',
                                    boxShadow: '0 12px 28px rgba(239,68,68,.35)',
                                    flex: '0 0 auto',
                                    transition: 'transform 120ms ease',
                                }}
                                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
                                onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                Stop
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
