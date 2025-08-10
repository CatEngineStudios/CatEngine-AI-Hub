
import React from 'react';

export default function Sidebar(props) {
    const {
        MODELS, apiKey, setApiKey, showApiKey, setShowApiKey,
        model, setModel,
        sessions, currentSessionId, setCurrentSessionId,
        renamingSessionId, renameInput, setRenameInput,
        createNewSession, commitRenameSession, cancelRenameSession, startRenameSession,
        deleteCurrentSession,
        setSessions, CHAT_THRESHOLD,
        setShowImportExport, darkMode, setDarkMode
    } = props;

    const useDropdown = sessions.length > CHAT_THRESHOLD;

    return (
        <div className="sidebar">
            <h2>CatEngine AI Hub</h2>
            <label>
                API Key:
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-xxxx..."
                        autoComplete="off"
                        style={{ flexGrow: 1 }}
                    />
                    <span
                        className="api-key-toggle"
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                        onClick={() => setShowApiKey(v => !v)}
                        style={{ cursor: 'pointer', padding: '0 6px' }}
                    >
                        {showApiKey ? '🙈' : '👁️'}
                    </span>
                </div>
            </label>

            <label>
                Select Model:
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                    {MODELS.map(m => (
                        <option key={m.value} value={m.value} disabled={m.disabled || false}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </label>

            <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Chats</strong>
                    <button onClick={createNewSession} style={{ backgroundColor: '#28a745' }}>+ New</button>
                </div>
                {useDropdown ? (
                    <select value={currentSessionId || ''} onChange={(e) => setCurrentSessionId(e.target.value)}>
                        {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                ) : (
                    <div className="session-list">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                                onClick={() => setCurrentSessionId(session.id)}
                            >
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
                                    />
                                ) : (
                                    <span onDoubleClick={() => startRenameSession(session.id)}>{session.title}</span>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete chat "${session.title}"?`)) {
                                            if (session.id === currentSessionId) {
                                                deleteCurrentSession();
                                            } else {
                                                setSessions(prev => prev.filter(s => s.id !== session.id));
                                            }
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button onClick={() => setShowImportExport(true)}>Import / Export</button>

            <button onClick={() => setDarkMode(prev => !prev)} className="dark-mode-toggle">
                {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
            </button>

            <button onClick={() => window.open('help.html', '_blank')}>Help / Privacy Policy</button>
        </div>
    );
}
