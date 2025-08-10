import React from 'react';
import RenderMessageContent from './MessageContent';

export default function ChatWindow({
    currentSession,
    darkMode,
    chatEndRef,
    editingMessageIndex,
    editingMessageText,
    startEditMessage,
    saveEditedMessage,
    cancelEditMessage,
    setEditingMessageText,
    input,
    setInput,
    loading,
    sendMessage,
    deleteCurrentSession
}) {
    const session = currentSession();

    return (
        <div
            className="main-chat"
            style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: 10,
                boxSizing: 'border-box',
            }}
        >
            {!session ? (
                <div
                    style={{
                        flexGrow: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: darkMode ? '#888' : '#888',
                    }}
                >
                    No chat session. Create one!
                </div>
            ) : (
                <>
                    <div
                        className="chat-window"
                        aria-live="polite"
                        aria-label="Chat messages"
                        style={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            padding: 10,
                            border: darkMode ? '1px solid #555' : '1px solid #ccc',
                            borderRadius: 6,
                            backgroundColor: darkMode ? '#222' : '#f9f9f9',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {session.messages.length === 0 ? (
                            <div style={{ color: darkMode ? '#888' : '#888' }}>
                                No messages yet. Start chatting!
                            </div>
                        ) : (
                            session.messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}
                                    aria-label={msg.role === 'user' ? 'User message' : 'AI message'}
                                    style={{
                                        marginBottom: 10,
                                        maxWidth: '80%',
                                        padding: '8px 14px',
                                        borderRadius: 18,
                                        lineHeight: 1.3,
                                        fontSize: '1rem',
                                        wordWrap: 'break-word',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        backgroundColor:
                                            msg.role === 'user'
                                                ? darkMode
                                                    ? '#0053a6'
                                                    : '#cce5ff'
                                                : darkMode
                                                    ? '#444'
                                                    : '#eee',
                                        color:
                                            msg.role === 'user'
                                                ? darkMode
                                                    ? '#fff'
                                                    : '#000'
                                                : darkMode
                                                    ? '#eee'
                                                    : '#333',
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        position: 'relative',
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
                                                borderRadius: 8,
                                                padding: 6,
                                                resize: 'vertical',
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

                    <textarea
                        rows={3}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!loading) sendMessage();
                            }
                        }}
                        placeholder="Type your message (Shift+Enter for newline)"
                        disabled={!session || loading}
                        spellCheck="false"
                        style={{
                            marginTop: 10,
                            backgroundColor: darkMode ? '#222' : '#fff',
                            color: darkMode ? '#eee' : '#000',
                            borderColor: darkMode ? '#555' : '#ccc',
                            borderRadius: 6,
                            padding: 8,
                            fontSize: '1rem',
                            resize: 'vertical',
                        }}
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: 10 }}>
                        <button
                            onClick={sendMessage}
                            disabled={loading || !session}
                            style={{
                                flexGrow: 1,
                                padding: '10px 0',
                                fontSize: '1rem',
                                backgroundColor: loading ? '#aaa' : '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Sending...' : 'Send'}
                        </button>

                        <button
                            onClick={deleteCurrentSession}
                            style={{
                                backgroundColor: '#dc3545',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '10px 20px',
                                cursor: 'pointer',
                            }}
                            title="Delete current chat session"
                        >
                            Delete Chat
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
