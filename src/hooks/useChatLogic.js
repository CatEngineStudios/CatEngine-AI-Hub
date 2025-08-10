// src/hooks/useChatLogic.js
import { useState, useEffect, useRef } from 'react';

const MODELS = [
    { label: 'GPT-5 (Not available yet)', value: 'gpt-5', disabled: true },
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
    { label: 'DeepSeek Chat', value: 'deepseek-chat' },
    { label: 'Gemini (Google)', value: 'gemini-2.5-flash' },
];

// storage keys
const STORAGE_KEY_API_KEYS = 'aiChatApiKeys'; // object keyed by model
const STORAGE_KEY_SESSIONS = 'aiChatSessions';
const STORAGE_KEY_DARK_MODE = 'aiChatDarkMode';
const STORAGE_KEY_CURRENT_SESSION = 'aiChatCurrentSessionId';
const STORAGE_KEY_CURRENT_MODEL = 'aiChatCurrentModel';

export default function useChatLogic() {
    // -------------------------
    // API keys (per-model)
    // -------------------------
    const [apiKeys, setApiKeys] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_API_KEYS);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [model, setModel] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_CURRENT_MODEL) || 'gpt-4-turbo';
        } catch {
            return 'gpt-4-turbo';
        }
    });

    // derived apiKey (for UI convenience)
    const [apiKey, _setApiKey] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_API_KEYS);
            const keys = saved ? JSON.parse(saved) : {};
            const currentModel = localStorage.getItem(STORAGE_KEY_CURRENT_MODEL) || 'gpt-4-turbo';
            return keys[currentModel] || '';
        } catch {
            return '';
        }
    });

    const [showApiKey, setShowApiKey] = useState(false);

    // -------------------------
    // other states (kept from original)
    // -------------------------
    const [darkMode, setDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DARK_MODE);
            return saved ? JSON.parse(saved) : false;
        } catch {
            return false;
        }
    });

    const [sessions, setSessions] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [currentSessionId, setCurrentSessionId] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CURRENT_SESSION);
            if (saved && JSON.parse(saved)) return JSON.parse(saved);
            if (sessions.length > 0) return sessions[0].id;
            return null;
        } catch {
            return null;
        }
    });

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const [renamingSessionId, setRenamingSessionId] = useState(null);
    const [renameInput, setRenameInput] = useState('');

    const [editingMessageIndex, setEditingMessageIndex] = useState(null);
    const [editingMessageText, setEditingMessageText] = useState('');

    const [showImportExport, setShowImportExport] = useState(false);
    const [importText, setImportText] = useState('');

    const chatEndRef = useRef(null);

    const CHAT_THRESHOLD = 8;

    // -------------------------
    // helper: provider by model
    // -------------------------
    function modelProvider(m) {
        if (!m) return 'openai';
        if (m.startsWith('gpt')) return 'openai';
        if (m.startsWith('deepseek')) return 'deepseek';
        if (m.startsWith('gemini')) return 'gemini';
        return 'openai';
    }

    // -------------------------
    // persist dark mode class
    // -------------------------
    useEffect(() => {
        if (darkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }, [darkMode]);

    // -------------------------
    // persist apiKeys object
    // -------------------------
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(apiKeys));
        } catch (e) {
            console.warn('Failed to persist apiKeys', e);
        }
    }, [apiKeys]);

    // persist sessions
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
        } catch (e) {
            console.warn('Failed to persist sessions', e);
        }
    }, [sessions]);

    // persist current session id
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, JSON.stringify(currentSessionId));
        } catch (e) {
            console.warn('Failed to persist currentSessionId', e);
        }
    }, [currentSessionId]);

    // persist current model & load the model's apiKey
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_CURRENT_MODEL, model);
        } catch { /* ignore */ }

        const keyForModel = apiKeys[model] || '';
        _setApiKey(keyForModel);
    }, [model, apiKeys]);

    // persist dark mode
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_DARK_MODE, JSON.stringify(darkMode));
        } catch { /* ignore */ }
    }, [darkMode]);

    // scroll to bottom on messages change
    useEffect(() => {
        try {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch { /* ignore */ }
    }, [currentSession()?.messages]);

    // -------------------------
    // helpers: session operations
    // -------------------------
    function currentSession() {
        return sessions.find((s) => s.id === currentSessionId);
    }

    function createNewSession() {
        const id = Date.now().toString();
        const newSession = {
            id,
            title: `Chat ${sessions.length + 1}`,
            messages: [],
        };
        setSessions((prev) => [...prev, newSession]);
        setCurrentSessionId(id);
    }

    function deleteCurrentSession() {
        if (!currentSessionId) return;
        if (!window.confirm('Delete current chat session?')) return;

        setSessions((prev) => prev.filter((s) => s.id !== currentSessionId));

        const remaining = sessions.filter((s) => s.id !== currentSessionId);
        if (remaining.length > 0) {
            setCurrentSessionId(remaining[0].id);
        } else {
            setCurrentSessionId(null);
        }
    }

    // rename session helpers
    function startRenameSession(id) {
        const session = sessions.find((s) => s.id === id);
        if (!session) return;
        setRenamingSessionId(id);
        setRenameInput(session.title);
    }

    function commitRenameSession() {
        if (!renameInput.trim()) return;
        setSessions((prev) =>
            prev.map((s) =>
                s.id === renamingSessionId ? { ...s, title: renameInput.trim() } : s
            )
        );
        setRenamingSessionId(null);
        setRenameInput('');
    }

    function cancelRenameSession() {
        setRenamingSessionId(null);
        setRenameInput('');
    }

    // message edit helpers
    function startEditMessage(index) {
        setEditingMessageIndex(index);
        setEditingMessageText(currentSession()?.messages[index].content || '');
    }

    function saveEditedMessage() {
        if (editingMessageText.trim() === '') return; // ignore empty edits
        setSessions((prev) =>
            prev.map((session) => {
                if (session.id === currentSessionId) {
                    const updatedMessages = [...session.messages];
                    updatedMessages[editingMessageIndex] = {
                        ...updatedMessages[editingMessageIndex],
                        content: editingMessageText.trim(),
                    };
                    return { ...session, messages: updatedMessages };
                }
                return session;
            })
        );
        setEditingMessageIndex(null);
        setEditingMessageText('');
    }

    function cancelEditMessage() {
        setEditingMessageIndex(null);
        setEditingMessageText('');
    }

    // export/import sessions
    function exportSessions() {
        const dataStr = JSON.stringify(sessions, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat_sessions.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importSessions() {
        if (!importText.trim()) {
            alert('Please paste valid JSON to import');
            return;
        }
        try {
            const imported = JSON.parse(importText);
            if (!Array.isArray(imported)) throw new Error('Invalid format: expected an array');
            for (const session of imported) {
                if (!session.id || !session.title || !Array.isArray(session.messages)) {
                    throw new Error('Invalid session format');
                }
            }
            setSessions(imported);
            if (imported.length > 0) setCurrentSessionId(imported[0].id);
            setShowImportExport(false);
            setImportText('');
            alert('Import successful!');
        } catch (e) {
            alert('Failed to import: ' + e.message);
        }
    }

    // -------------------------
    // token estimate helpers (kept)
    // -------------------------
    const MODEL_MAX_TOKENS = {
        'gpt-5': 8192,
        'gpt-4': 8192,
        'gpt-4-turbo': 4096,
        'gpt-3.5-turbo': 4096,
        'deepseek-chat': 4096,
        'gemini-2.5-flash': 8192,
    };

    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    function estimateMessageTokens(messages) {
        return messages.reduce((acc, msg) => acc + estimateTokens(msg.content), 0);
    }

    // -------------------------
    // setApiKey (keeps compatibility)
    // updates current model's saved key
    // -------------------------
    function setApiKey(newKey) {
        _setApiKey(newKey);

        setApiKeys((prev) => {
            const updated = { ...(prev || {}), [model]: newKey };
            try {
                localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(updated));
            } catch { /* ignore */ }
            return updated;
        });
    }

    // -------------------------
    // sendMessage (routes to provider)
    // -------------------------
    async function sendMessage() {
        if (!apiKey || !apiKey.trim()) {
            alert(`Please enter your API key for ${model}`);
            return;
        }
        if (!input.trim()) {
            alert('Please enter a message');
            return;
        }
        if (!currentSessionId) {
            alert('No chat session selected');
            return;
        }

        const userMessage = input.trim();
        setInput('');
        setLoading(true);

        // append user message locally
        setSessions((prev) =>
            prev.map((session) =>
                session.id === currentSessionId
                    ? { ...session, messages: [...session.messages, { role: 'user', content: userMessage }] }
                    : session
            )
        );

        try {
            let responseText = '';

            // fallback model if needed
            const modelToUse = model === 'gpt-5' ? 'gpt-4-turbo' : model;

            // Build messages for providers
            const session = currentSession();
            const messagesForApi = session
                ? [...session.messages, { role: 'user', content: userMessage }]
                : [{ role: 'user', content: userMessage }];

            // token / max calculation
            const maxTotalTokens = MODEL_MAX_TOKENS[modelToUse] || 4096;
            const promptTokens = estimateMessageTokens(messagesForApi);
            const maxTokensForCompletion = Math.max(500, maxTotalTokens - promptTokens - 100);

            const provider = modelProvider(modelToUse);

            if (provider === 'openai') {
                // OpenAI Chat Completions
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: messagesForApi,
                        max_tokens: maxTokensForCompletion,
                        temperature: 0.7,
                    }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message || JSON.stringify(data));
                responseText = data.choices?.[0]?.message?.content?.trim() || '';

            } else if (provider === 'deepseek') {
                // DeepSeek endpoint (mirrors OpenAI chat completion API at different base)
                const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: messagesForApi,
                        max_tokens: maxTokensForCompletion,
                        temperature: 0.7,
                    }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message || JSON.stringify(data));
                responseText = data.choices?.[0]?.message?.content?.trim()
                    || data.choices?.[0]?.message?.content
                    || data.choices?.[0]?.text
                    || '';

            } else if (provider === 'gemini') {
                // Gemini (Google Generative) -- REST call using ?key=API_KEY
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${encodeURIComponent(apiKey)}`;
                const body = {
                    contents: [{ parts: [{ text: userMessage }] }],
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message || JSON.stringify(data));
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || data.output?.[0]?.content?.text || '';
            } else {
                throw new Error('Unsupported model/provider: ' + provider);
            }

            // Append assistant reply locally
            setSessions((prev) =>
                prev.map((session) =>
                    session.id === currentSessionId
                        ? { ...session, messages: [...session.messages, { role: 'assistant', content: responseText }] }
                        : session
                )
            );

        } catch (error) {
            alert('Error: ' + (error.message || String(error)));
        } finally {
            setLoading(false);
        }
    }

    return {
        MODELS,
        apiKey, setApiKey, showApiKey, setShowApiKey,
        darkMode, setDarkMode,
        sessions, setSessions,
        currentSessionId, setCurrentSessionId,
        model, setModel,
        input, setInput,
        loading,
        renamingSessionId, setRenamingSessionId,
        renameInput, setRenameInput,
        editingMessageIndex, editingMessageText,
        showImportExport, setShowImportExport,
        importText, setImportText,
        chatEndRef,
        CHAT_THRESHOLD,
        currentSession,
        createNewSession,
        deleteCurrentSession,
        startRenameSession,
        commitRenameSession,
        cancelRenameSession,
        startEditMessage,
        saveEditedMessage,
        cancelEditMessage,
        sendMessage,
        exportSessions,
        importSessions
    };
}
