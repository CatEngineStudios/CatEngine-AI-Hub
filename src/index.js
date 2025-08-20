import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// ✅ point to the file we created earlier
import AuthProvider from './contexts/AuthContext.jsx';

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);

root.render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);
