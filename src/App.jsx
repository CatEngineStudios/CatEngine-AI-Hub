
import React from 'react';
import useChatLogic from './hooks/useChatLogic';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ImportExportModal from './components/ImportExportModal';
import './App.css';

export default function App() {
    const chat = useChatLogic();

    return (
        <div className="app-container">
            <Sidebar {...chat} />
            <ChatWindow {...chat} />
            {chat.showImportExport && <ImportExportModal {...chat} />}
        </div>
    );


}
