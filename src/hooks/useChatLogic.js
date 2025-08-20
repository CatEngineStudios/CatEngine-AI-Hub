// src/hooks/useChatLogic.js
import { onUser } from '../lib/firebase';
import { loadSessions, saveSessions, loadApiKey, saveApiKey } from '../lib/store';
import { useState, useCallback, useEffect, useRef } from 'react';
import { auth } from '../lib/firebase';

// --------- Models (unchanged labels) ----------
export const MODELS = [
    { label: 'GPT-5', value: 'gpt-5' },
    { label: 'GPT-5 Mini', value: 'gpt-5-mini' },
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
    { label: 'DeepSeek Chat', value: 'deepseek-chat' },
    { label: 'Gemini (Google)', value: 'gemini-2.5-flash' },
];

// --------- Local storage keys ----------
const STORAGE_KEY_API_KEYS = 'aiChatApiKeys'; // object keyed by model
const STORAGE_KEY_SESSIONS = 'aiChatSessions';
const STORAGE_KEY_DARK_MODE = 'aiChatDarkMode';
const STORAGE_KEY_CURRENT_SESSION = 'aiChatCurrentSessionId';
const STORAGE_KEY_CURRENT_MODEL = 'aiChatCurrentModel';

export default function useChatLogic() {
    // Abort + debounced cloud save refs
    const abortRef = useRef(null);
    const saveDebounce = useRef(null);

    // =========================
    // Auth-watch: load cloud data when Google user signs in
    // =========================
    useEffect(() => {
        const unsub = onUser(async (user) => {
            if (!user) return; // guest stays local only
            const uid = user.uid;

            try {
                const loaded = await loadSessions(uid);
                if (Array.isArray(loaded) && loaded.length) {
                    setSessions(loaded);
                    if (!currentSessionId && loaded[0]?.id) setCurrentSessionId(loaded[0].id);
                }
            } catch (e) {
                console.warn('Failed to load sessions:', e);
            }

            try {
                const existingKey = await loadApiKey(uid);
                if (existingKey) setApiKey(existingKey);
            } catch (e) {
                console.warn('Failed to load API key:', e);
            }
        });
        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================
    // UI state
    // =========================
    const [model, setModel] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_CURRENT_MODEL) || 'gpt-4-turbo';
        } catch {
            return 'gpt-4-turbo';
        }
    });

    // Per-model API keys object
    const [apiKeys, setApiKeys] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_API_KEYS)) || {};
        } catch {
            return {};
        }
    });

    // Derived current model's apiKey (for UI convenience)
    const [_apiKey, _setApiKey] = useState(() => {
        try {
            const keys = JSON.parse(localStorage.getItem(STORAGE_KEY_API_KEYS)) || {};
            const currentModel = localStorage.getItem(STORAGE_KEY_CURRENT_MODEL) || 'gpt-4-turbo';
            return keys[currentModel] || '';
        } catch {
            return '';
        }
    });
    const apiKey = _apiKey;

    const [showApiKey, setShowApiKey] = useState(false);

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
            if ((Array.isArray(sessions) ? sessions : []).length > 0) return sessions[0].id;
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

    // =========================
    // Provider routing
    // =========================
    function modelProvider(m) {
        const v = (m ?? '').toString().trim().toLowerCase();
        if (!v) return 'openai';
        if (v.startsWith('gpt')) return 'openai';
        if (v.includes('deepseek')) return 'deepseek';
        if (v.includes('gemini')) return 'gemini';
        return 'openai';
    }

    // =========================
    // Theme class
    // =========================
    useEffect(() => {
        if (darkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }, [darkMode]);

    // =========================
    // Persist to local storage (guest mode & fallback)
    // =========================
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(apiKeys)); } catch { }
    }, [apiKeys]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions)); } catch { }
    }, [sessions]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, JSON.stringify(currentSessionId)); } catch { }
    }, [currentSessionId]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_CURRENT_MODEL, model); } catch { }
        const keyForModel = apiKeys[model] || '';
        _setApiKey(keyForModel);
    }, [model, apiKeys]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_DARK_MODE, JSON.stringify(darkMode)); } catch { }
    }, [darkMode]);

    // Scroll to bottom when messages for current session change
    useEffect(() => {
        try { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch { }
    }, [currentSessionId, sessions]);

    // Create a default chat on first run or if none exist
    useEffect(() => {
        const KEY = 'app:firstRunHasDefaultChat';
        if (localStorage.getItem(KEY) !== '1') {
            createNewSession();
            localStorage.setItem(KEY, '1');
        } else if (!sessions?.length) {
            createNewSession();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================
    // Cloud autosave (Google users only)
    // =========================
    useEffect(() => {
        if (!auth.currentUser) return; // guest: local only
        if (!Array.isArray(sessions)) return;

        clearTimeout(saveDebounce.current);
        saveDebounce.current = setTimeout(async () => {
            try {
                await saveSessions(auth.currentUser.uid, sessions);
            } catch (e) {
                console.warn('Failed to save sessions:', e);
            }
        }, 600);
        return () => clearTimeout(saveDebounce.current);
    }, [sessions]);

    // =========================
    // Public helpers
    // =========================
    function stopGenerating() {
        try { abortRef.current?.abort(); } catch { }
        setLoading(false);
    }

    const onApiKeyChange = async (value) => {
        setApiKey(value);
        if (auth.currentUser && value && value.trim()) {
            try { await saveApiKey(auth.currentUser.uid, value.trim()); } catch { }
        }
    };

    // setApiKey updates the per-model key map + derived state
    function setApiKey(newKey) {
        _setApiKey(newKey);
        setApiKeys((prev) => {
            const updated = { ...(prev || {}), [model]: newKey };
            try { localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(updated)); } catch { }
            return updated;
        });
    }

    // =========================
    // Sessions
    // =========================
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
        setSessions((prev) => {
            const next = prev.filter((s) => s.id !== currentSessionId);
            setCurrentSessionId(next.length ? next[0].id : null);
            return next;
        });
    }

    // Rename
    function startRenameSession(id) {
        const session = sessions.find((s) => s.id === id);
        if (!session) return;
        setRenamingSessionId(id);
        setRenameInput(session.title);
    }
    function commitRenameSession() {
        if (!renameInput.trim()) return;
        setSessions((prev) =>
            prev.map((s) => (s.id === renamingSessionId ? { ...s, title: renameInput.trim() } : s))
        );
        setRenamingSessionId(null);
        setRenameInput('');
    }
    function cancelRenameSession() {
        setRenamingSessionId(null);
        setRenameInput('');
    }

    // Message edit
    function startEditMessage(index) {
        setEditingMessageIndex(index);
        setEditingMessageText(currentSession()?.messages[index].content || '');
    }
    function saveEditedMessage() {
        if (editingMessageText.trim() === '') return;
        setSessions((prev) =>
            prev.map((session) => {
                if (session.id === currentSessionId) {
                    const updated = [...session.messages];
                    updated[editingMessageIndex] = {
                        ...updated[editingMessageIndex],
                        content: editingMessageText.trim(),
                    };
                    return { ...session, messages: updated };
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

    // Export / Import
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

    // =========================
    // Token estimation & budgeting
    // =========================
    const MODEL_MAX_TOKENS = {
        'gpt-5': 8192,
        'gpt-5-mini': 8192,
        'gpt-4': 8192,
        'gpt-4-turbo': 4096,
        'gpt-3.5-turbo': 4096,
        'deepseek-chat': 4096,
        'gemini-2.5-flash': 8192,
    };

    function estimateTokens(text) {
        return Math.ceil((text || '').length / 4);
    }
    function estimateMessageTokens(messages) {
        return (messages || []).reduce((acc, msg) => acc + estimateTokens(msg.content || ''), 0);
    }

    function fitMessagesToBudget(messages, modelId, desiredCompletionTokens) {
        const maxTotal = MODEL_MAX_TOKENS[modelId] || 8192;
        const out = [...messages];

        let maxCompletion = Math.max(256, desiredCompletionTokens || 1024);
        let promptTokens = estimateMessageTokens(out);

        if (promptTokens + maxCompletion + CONTEXT_SAFETY_TOKENS > maxTotal) {
            maxCompletion = Math.max(256, maxTotal - promptTokens - CONTEXT_SAFETY_TOKENS);
        }

        let i = 0;
        while (
            promptTokens + maxCompletion + CONTEXT_SAFETY_TOKENS > maxTotal &&
            out.length > 1 &&
            i < out.length - 1
        ) {
            if (out[i].role === 'system') { i++; continue; }
            out.splice(i, 1);
            promptTokens = estimateMessageTokens(out);
        }

        if (promptTokens + maxCompletion + CONTEXT_SAFETY_TOKENS > maxTotal) {
            const last = out[out.length - 1];
            const prev = out[out.length - 2];
            const minimal = (prev && prev.role === 'assistant') ? [prev, last] : [last];
            const minimalPrompt = estimateMessageTokens(minimal);
            maxCompletion = Math.max(256, maxTotal - minimalPrompt - CONTEXT_SAFETY_TOKENS);
            return { messages: minimal, maxCompletionTokens: maxCompletion };
        }

        return { messages: out, maxCompletionTokens: maxCompletion };
    }

    const CONTEXT_SAFETY_TOKENS = 512;

    function safeCompletionBudget(modelId, promptMessages, requested) {
        const maxTotal = MODEL_MAX_TOKENS[modelId] || 8192;
        const prompt = estimateMessageTokens(promptMessages);
        const cap = maxTotal - prompt - CONTEXT_SAFETY_TOKENS;
        return Math.max(64, Math.min(requested || 512, cap));
    }

    // =========================
    // Attachments
    // =========================
    const [attachments, setAttachments] = useState([]); // File[]

    const onFilesSelected = useCallback((fileList) => {
        setAttachments((prev) => [...prev, ...Array.from(fileList || [])]);
    }, []);
    const removeAttachment = useCallback((index) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    function readAsText(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(r.error);
            r.onload = () => resolve(String(r.result || ''));
            r.readAsText(file);
        });
    }
    function readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(r.error);
            r.onload = () => resolve(String(r.result || ''));
            r.readAsDataURL(file);
        });
    }
    function extToLang(name = '') {
        const ext = name.split('.').pop()?.toLowerCase();
        const map = {
            js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
            py: 'python', json: 'json', md: 'markdown',
            html: 'html', css: 'css',
            c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp',
            cs: 'csharp', java: 'java', go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
            sh: 'bash', zsh: 'bash', ps1: 'powershell',
            yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql'
        };
        return map[ext] || '';
    }
    async function prepareAttachments(files) {
        const MAX_TEXT_CHARS = 200000;
        const out = { texts: [], images: [] };

        for (const f of files) {
            const mime = (f.type || '').toLowerCase();
            const name = f.name || 'file';

            if (mime.startsWith('image/')) {
                const dataUrl = await readAsDataURL(f);
                out.images.push({ name, mime, dataUrl });
                continue;
            }
            const text = await readAsText(f);
            const clipped = text.length > MAX_TEXT_CHARS
                ? text.slice(0, MAX_TEXT_CHARS) + `\n\n[... TRUNCATED ${text.length - MAX_TEXT_CHARS} CHARS ...]`
                : text;

            out.texts.push({ name, lang: extToLang(name), content: clipped });
        }
        return out;
    }

    // =========================
    // SEND (streaming, attachments, budget, abort)
    // =========================
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

        abortRef.current = new AbortController();

        const userMessage = input.trim();
        setInput('');
        setLoading(true);

        // 1) Append user message
        setSessions((prev) =>
            prev.map((session) =>
                session.id === currentSessionId
                    ? { ...session, messages: [...session.messages, { role: 'user', content: userMessage }] }
                    : session
            )
        );

        // 2) Append empty assistant message to stream into
        setSessions((prev) =>
            prev.map((session) =>
                session.id === currentSessionId
                    ? { ...session, messages: [...session.messages, { role: 'assistant', content: '' }] }
                    : session
            )
        );

        // helper to stream into the last assistant message
        const updateLastAssistant = (text) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === currentSessionId
                        ? {
                            ...s,
                            messages: s.messages.map((m, i, arr) =>
                                i === arr.length - 1 ? { ...m, content: text } : m
                            ),
                        }
                        : s
                )
            );
        };

        // Build messages
        const session = currentSession();
        const messagesForApi = session
            ? [...session.messages, { role: 'user', content: userMessage }]
            : [{ role: 'user', content: userMessage }];

        const isFirstTurn = !session || session.messages.length === 0;

        try {
            const normalizeModel = (m) => {
                const v = String(m || '').toLowerCase();
                if (v === 'deepseek chat' || (v.includes('deepseek') && !v.startsWith('deepseek'))) return 'deepseek-chat';
                if (v === 'gemini (google)' || (v.includes('gemini') && !v.startsWith('gemini'))) return 'gemini-2.5-flash';
                return m;
            };
            const modelToUse = normalizeModel((model || '').trim());

            // Attachments -> extra user messages & images bucket
            const prepared = await prepareAttachments(attachments);
            for (const t of prepared.texts) {
                const fence = t.lang ? t.lang : '';
                messagesForApi.push({ role: 'user', content: `📎 File: ${t.name}\n\`\`\`${fence}\n${t.content}\n\`\`\`` });
            }

            // Token budgeting with sliding window
            const maxTotalTokens = MODEL_MAX_TOKENS[modelToUse] || 8192;
            const promptTokensBefore = estimateMessageTokens(messagesForApi);
            let desiredCompletion = Math.max(500, maxTotalTokens - promptTokensBefore - 256);
            const fitted = fitMessagesToBudget(messagesForApi, modelToUse, desiredCompletion);
            const windowedMessages = fitted.messages;
            let maxTokensForCompletion = fitted.maxCompletionTokens;

            // Provider
            const provider = ((v) =>
                v.includes('deepseek') ? 'deepseek'
                    : v.includes('gemini') ? 'gemini'
                        : v.startsWith('gpt') ? 'openai'
                            : 'openai')((modelToUse || '').toLowerCase());

            // Images
            const hasImages = prepared.images.length > 0;
            const supportsOpenAIVision = /gpt-4o|gpt-4-vision|o-mini/i.test(modelToUse);

            // SSE reader
            const readSSE = async (response, onDelta) => {
                if (!response.ok || !response.body) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.error?.message || JSON.stringify(data));
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let stop = false;

                const flush = (chunkStr) => {
                    const events = chunkStr.split('\n\n');
                    for (const ev of events) {
                        const line = ev.trim();
                        if (!line || !line.startsWith('data:')) continue;
                        const dataStr = line.slice(5).trim();
                        if (dataStr === '[DONE]') { stop = true; return; }
                        try { onDelta(JSON.parse(dataStr)); } catch { }
                    }
                };

                while (!stop) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const idx = buffer.lastIndexOf('\n\n');
                    if (idx !== -1) {
                        flush(buffer.slice(0, idx));
                        buffer = buffer.slice(idx + 2);
                    }
                }
                if (buffer) flush(buffer);
            };

            // ---------- OpenAI ----------
            if (provider === 'openai') {
                let openaiMessages = windowedMessages;
                if (hasImages && supportsOpenAIVision) {
                    openaiMessages = windowedMessages.slice();
                    const last = openaiMessages.pop();
                    const parts = [{ type: 'text', text: last.content }];
                    for (const img of prepared.images) {
                        parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
                    }
                    openaiMessages.push({ role: 'user', content: parts });
                } else if (hasImages && !supportsOpenAIVision) {
                    openaiMessages = windowedMessages.concat([{
                        role: 'user',
                        content: `🖼️ Attached images (${prepared.images.map(i => i.name).join(', ')}), but the selected model cannot analyze images.`
                    }]);
                }

                const tokenParam = modelToUse.startsWith('gpt-5') ? 'max_completion_tokens' : 'max_tokens';
                const openaiBody = { model: modelToUse, messages: openaiMessages, stream: true };
                openaiBody[tokenParam] = maxTokensForCompletion;
                if (!modelToUse.startsWith('gpt-5')) openaiBody.temperature = 0.7;

                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify(openaiBody),
                    signal: abortRef.current.signal,
                });

                let acc = '';
                await readSSE(res, (chunk) => {
                    const piece = chunk?.choices?.[0]?.delta?.content ?? chunk?.choices?.[0]?.text ?? '';
                    if (piece) { acc += piece; updateLastAssistant(acc); }
                });

                if (isFirstTurn) {
                    try {
                        const tokenParamTitle = modelToUse.startsWith('gpt-5') ? 'max_completion_tokens' : 'max_tokens';
                        const titleBody = {
                            model: modelToUse,
                            messages: [
                                { role: 'system', content: "You name chats. Create a short, general reference title (3–6 words) for the user's first message. Avoid private names, keep it generic, Title Case, no quotes or trailing punctuation." },
                                { role: 'user', content: userMessage }
                            ],
                        };
                        titleBody[tokenParamTitle] = 16;
                        if (!modelToUse.startsWith('gpt-5')) titleBody.temperature = 0.2;

                        const resT = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                            body: JSON.stringify(titleBody),
                            signal: abortRef.current.signal,
                        });
                        const dataT = await resT.json();
                        let title = (dataT.choices?.[0]?.message?.content || dataT.choices?.[0]?.text || '').trim();
                        if (!title) {
                            title = userMessage.replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 42);
                            if (title) title = title[0].toUpperCase() + title.slice(1).replace(/\.*$/, '');
                        }
                        if (title) {
                            title = title.replace(/^["“”']|["“”']$/g, '');
                            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title } : s));
                        }
                    } catch { }
                }

                setAttachments([]);
                setLoading(false);
                return;
            }

            // ---------- DeepSeek ----------
            if (provider === 'deepseek') {
                let dsMessages = windowedMessages;
                if (hasImages) {
                    dsMessages = windowedMessages.concat([{
                        role: 'user',
                        content: `🖼️ Attached images (${prepared.images.map(i => i.name).join(', ')}). Note: this model does not analyze images; please switch to Gemini or an OpenAI vision model.`
                    }]);
                }

                maxTokensForCompletion = safeCompletionBudget(modelToUse, dsMessages, maxTokensForCompletion);

                const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: modelToUse,
                        messages: dsMessages,
                        stream: true,
                        max_tokens: maxTokensForCompletion,
                        temperature: 0.7,
                    }),
                    signal: abortRef.current.signal,
                });

                let acc = '';
                await readSSE(res, (chunk) => {
                    const piece = chunk?.choices?.[0]?.delta?.content
                        ?? chunk?.choices?.[0]?.message?.content
                        ?? chunk?.choices?.[0]?.text
                        ?? '';
                    if (piece) { acc += piece; updateLastAssistant(acc); }
                });

                if (isFirstTurn) {
                    try {
                        const resT = await fetch('https://api.deepseek.com/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                            body: JSON.stringify({
                                model: modelToUse,
                                messages: [
                                    { role: 'system', content: "You name chats. Create a short, general reference title (3–6 words) for the user's first message. Avoid private names, keep it generic, Title Case, no quotes or trailing punctuation." },
                                    { role: 'user', content: userMessage }
                                ],
                                max_tokens: 16,
                                temperature: 0.2,
                            }),
                            signal: abortRef.current.signal,
                        });
                        const dataT = await resT.json();
                        let title = (dataT.choices?.[0]?.message?.content || dataT.choices?.[0]?.text || '').trim();
                        if (!title) {
                            title = userMessage.replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 42);
                            if (title) title = title[0].toUpperCase() + title.slice(1).replace(/\.*$/, '');
                        }
                        if (title) {
                            title = title.replace(/^["“”']|["“”']$/g, '');
                            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title } : s));
                        }
                    } catch { }
                }

                setAttachments([]);
                setLoading(false);
                return;
            }

            // ---------- Gemini ----------
            if (provider === 'gemini') {
                const contents = windowedMessages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : m.role,
                    parts: [{ text: m.content }]
                }));

                if (hasImages) {
                    const lastIndex = contents.length - 1;
                    if (lastIndex >= 0) {
                        const last = contents[lastIndex];
                        const parts = last.parts.slice();
                        for (const img of prepared.images) {
                            const base64 = (img.dataUrl.split(',')[1] || '').trim();
                            if (base64) parts.push({ inline_data: { mime_type: img.mime || 'image/png', data: base64 } });
                        }
                        contents[lastIndex] = { ...last, parts };
                    }
                }

                const safeMaxOut = safeCompletionBudget(modelToUse, windowedMessages, Math.min(maxTokensForCompletion, 2048));
                const genCfg = { temperature: 0.7, maxOutputTokens: safeMaxOut };

                const urlStream = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:streamGenerateContent`;
                const streamRes = await fetch(urlStream, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, Accept: 'text/event-stream' },
                    body: JSON.stringify({ contents, generationConfig: genCfg }),
                    signal: abortRef.current.signal,
                });

                let streamed = false;
                let acc = '';
                if (streamRes.ok && streamRes.body) {
                    streamed = true;
                    await readSSE(streamRes, (chunk) => {
                        const parts = chunk?.candidates?.[0]?.content?.parts || [];
                        const piece = parts.map(p => p.text).filter(Boolean).join('');
                        if (piece) { acc += piece; updateLastAssistant(acc); }
                    });
                }

                if (!streamed) {
                    const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:generateContent`;
                    const urlV1 = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(modelToUse)}:generateContent`;

                    let res = await fetch(urlBeta, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                        body: JSON.stringify({ contents, generationConfig: genCfg }),
                        signal: abortRef.current.signal,
                    });
                    let data = await res.json();

                    if (!res.ok || data?.error) {
                        res = await fetch(urlV1, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                            body: JSON.stringify({ contents, generationConfig: genCfg }),
                            signal: abortRef.current.signal,
                        });
                        data = await res.json();

                        if (!res.ok || data?.error) {
                            const urlQ = `${urlV1}?key=${encodeURIComponent(apiKey)}`;
                            const resQ = await fetch(urlQ, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contents, generationConfig: genCfg }),
                                signal: abortRef.current.signal,
                            });
                            const dataQ = await resQ.json();
                            if (!resQ.ok || dataQ?.error) {
                                throw new Error(dataQ?.error?.message || JSON.stringify(dataQ));
                            }
                            const textQ = (dataQ.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n')
                                || dataQ.output?.[0]?.content?.text || '';
                            updateLastAssistant(textQ);
                        } else {
                            const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n')
                                || data.output?.[0]?.content?.text || '';
                            updateLastAssistant(text);
                        }
                    } else {
                        const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n')
                            || data.output?.[0]?.content?.text || '';
                        updateLastAssistant(text);
                    }
                }

                if (isFirstTurn) {
                    try {
                        const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:generateContent`;
                        const urlV1 = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(modelToUse)}:generateContent`;
                        const titleBody = {
                            contents: [{ role: 'user', parts: [{ text: "You name chats. Create a short, general reference title (3–6 words) for the user's first message. Avoid private names, keep it generic, Title Case, no quotes or trailing punctuation.\n\nMessage:\n" + userMessage }] }],
                            generationConfig: { temperature: 0.2, maxOutputTokens: 16 }
                        };
                        let resT = await fetch(urlBeta, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                            body: JSON.stringify(titleBody),
                            signal: abortRef.current.signal,
                        });
                        let dataT = await resT.json();
                        if (!resT.ok || dataT?.error) {
                            resT = await fetch(urlV1, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                                body: JSON.stringify(titleBody),
                                signal: abortRef.current.signal,
                            });
                            dataT = await resT.json();
                        }
                        let title = (dataT?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join(' ').trim();
                        if (!title) {
                            title = userMessage.replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 42);
                            if (title) title = title[0].toUpperCase() + title.slice(1).replace(/\.*$/, '');
                        }
                        if (title) {
                            title = title.replace(/^["“”']|["“”']$/g, '');
                            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title } : s));
                        }
                    } catch { }
                }

                setAttachments([]);
                setLoading(false);
                return;
            }

            throw new Error('Unsupported model/provider: ' + provider);
        } catch (error) {
            if (error?.name !== 'AbortError') {
                alert('Error: ' + (error.message || String(error)));
            }
        } finally {
            setLoading(false);
        }
    }

    // Return API
    return {
        MODELS,
        apiKey, setApiKey, onApiKeyChange,
        showApiKey, setShowApiKey,
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
        importSessions,

        attachments,
        onFilesSelected,
        removeAttachment,

        stopGenerating,
    };
}
