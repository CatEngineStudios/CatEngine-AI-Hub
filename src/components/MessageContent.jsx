import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme that works well in light mode too
import 'prismjs/components/prism-javascript'; // Add more languages if needed
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';

export default function MessageContent({ content }) {
    useEffect(() => {
        Prism.highlightAll();
    }, [content]);

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            // Optional: Show confirmation (toast/snackbar)
        });
    };

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <>
            {parts.map((part, idx) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const firstLineBreak = part.indexOf('\n');
                    const lang = part.substring(3, firstLineBreak).trim() || 'javascript';
                    const codeContent = part
                        .substring(firstLineBreak + 1, part.length - 3)
                        .trim();

                    return (
                        <div className="code-block-wrapper" key={idx}>
                            <div className="code-block-header">
                                <span className="code-lang">{lang}</span>
                                <button
                                    className="copy-button"
                                    onClick={() => handleCopy(codeContent)}
                                >
                                    Copy
                                </button>
                            </div>
                            <pre className={`language-${lang}`}>
                                <code className={`language-${lang}`}>
                                    {codeContent}
                                </code>
                            </pre>
                        </div>
                    );
                } else {
                    return (
                        <p key={idx} style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>
                            {part}
                        </p>
                    );
                }
            })}
        </>
    );
}
