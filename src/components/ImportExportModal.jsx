
import React from 'react';

export default function ImportExportModal(props) {
    const { darkMode, importText, setImportText, exportSessions, importSessions, setShowImportExport } = props;

    return (
        <div className="import-export-modal">
            <div className="modal-content">
                <h3>Import / Export Chat Sessions JSON</h3>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste JSON here to import or leave as is to export current sessions"
                    rows={10}
                />
                <div className="modal-buttons">
                    <button onClick={exportSessions}>Export</button>
                    <button onClick={importSessions}>Import</button>
                    <button onClick={() => setShowImportExport(false)}>Close</button>
                </div>
            </div>
        </div>
    );
}
