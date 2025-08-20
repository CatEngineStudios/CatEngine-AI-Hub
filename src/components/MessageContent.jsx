// src/components/MessageContent.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Languages (add/remove as you like)
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-yaml';

export default function MessageContent({ content = '', darkMode = false }) {
    const rootRef = useRef(null);
    const [copiedIdx, setCopiedIdx] = useState(-1);

    // Highlight only within this message
    useEffect(() => {
        if (rootRef.current) Prism.highlightAllUnder(rootRef.current);
    }, [content]);

    const styles = useMemo(() => {
        const border = darkMode ? '#334155' : '#e5e7eb';
        const headerBg = darkMode ? '#0b1220' : '#f9fafb';
        const text = darkMode ? '#e5e7eb' : '#111827';
        return {
            codeWrap: {
                border: `1px solid ${border}`,
                borderRadius: 10,
                overflow: 'hidden',
                margin: '6px 0',
            },
            codeHeader: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 10px',
                background: headerBg,
                borderBottom: `1px solid ${border}`,
                fontSize: 12,
            },
            codeLang: { opacity: 0.8, color: text },
            copyBtn: {
                border: `1px solid ${border}`,
                background: 'transparent',
                color: text,
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                lineHeight: 1,
            },
            pre: { margin: 0, maxWidth: '100%', overflowX: 'auto' },
            para: { margin: '8px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
            inlineCode: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '0.95em',
                background: darkMode ? 'rgba(148,163,184,.18)' : 'rgba(0,0,0,.05)',
                borderRadius: 6,
                padding: '1px 6px',
            },
            link: {
                color: darkMode ? '#93c5fd' : '#1d4ed8',
                textDecoration: 'none',
                wordBreak: 'break-all',
            },
        };
    }, [darkMode]);

    const handleCopy = (code, idx) => {
        navigator.clipboard?.writeText(code).then(() => {
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(-1), 1200);
        });
    };

    // Split into fenced blocks and prose
    const parts = useMemo(() => content.split(/(```[\s\S]*?```)/g), [content]);

    // Simple URL linkifier for prose segments
    const renderProse = (text, idx) => {
        // Split by inline code `code`
        const toks = text.split(/(`[^`]+`)/g);
        return (
            <p key={idx} style={styles.para}>
                {toks.map((t, i) => {
                    if (t.startsWith('`') && t.endsWith('`')) {
                        const code = t.slice(1, -1);
                        return <code key={i} style={styles.inlineCode}>{code}</code>;
                    }
                    // Linkify plain URLs
                    const urlRe = /(https?:\/\/[^\s)]+)|((?:www\.)[^\s)]+)/g;
                    const nodes = [];
                    let last = 0, m;
                    while ((m = urlRe.exec(t)) !== null) {
                        const [raw] = m;
                        const start = m.index;
                        if (start > last) nodes.push(<span key={`${i}-pre-${start}`}>{t.slice(last, start)}</span>);
                        const href = raw.startsWith('http') ? raw : `https://${raw}`;
                        nodes.push(
                            <a key={`${i}-a-${start}`} href={href} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {raw}
                            </a>
                        );
                        last = start + raw.length;
                    }
                    if (last < t.length) nodes.push(<span key={`${i}-post`}>{t.slice(last)}</span>);
                    return <React.Fragment key={i}>{nodes}</React.Fragment>;
                })}
            </p>
        );
    };

    return (
        <div ref={rootRef}>
            {parts.map((part, idx) => {
                // Fenced code block?
                if (part.startsWith('```') && part.endsWith('```')) {
                    const firstNL = part.indexOf('\n');
                    const rawLang = part.substring(3, firstNL).trim() || 'javascript';
                    const lang = rawLang.toLowerCase();
                    const codeContent = part.substring(firstNL + 1, part.length - 3).replace(/\s+$/, '');
                    return (
                        <div key={idx} style={styles.codeWrap}>
                            <div style={styles.codeHeader}>
                                <span style={styles.codeLang}>{lang}</span>
                                <button style={styles.copyBtn} onClick={() => handleCopy(codeContent, idx)}>
                                    {copiedIdx === idx ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <pre className={`language-${lang}`} style={styles.pre}>
                                <code className={`language-${lang}`}>
                                    {codeContent}
                                </code>
                            </pre>
                        </div>
                    );
                }
                // Regular prose
                return renderProse(part, idx);
            })}
        </div>
    );
}
