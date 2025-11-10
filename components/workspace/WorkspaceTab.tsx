import React, { useState, useEffect } from 'react';
import { GTMDocMetadata } from '../../types';
import { DocsList } from './DocsList';
import { DocEditor } from './DocEditor';

interface WorkspaceTabProps {
    workspaceId: string;
    userId: string;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ workspaceId, userId }) => {
    const [selectedDoc, setSelectedDoc] = useState<GTMDocMetadata | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const handleDocSelect = (doc: GTMDocMetadata) => {
        setSelectedDoc(doc);
        setIsCreatingNew(false);
    };

    const handleCreateNew = () => {
        setSelectedDoc(null);
        setIsCreatingNew(true);
    };

    const handleCloseEditor = () => {
        setSelectedDoc(null);
        setIsCreatingNew(false);
    };

    return (
        <div className="h-full flex">
            {/* Left Sidebar: Document List */}
            <div className="w-80 border-r-2 border-black bg-white overflow-y-auto">
                <DocsList
                    workspaceId={workspaceId}
                    userId={userId}
                    onDocSelect={handleDocSelect}
                    onCreateNew={handleCreateNew}
                    selectedDocId={selectedDoc?.id || null}
                />
            </div>

            {/* Right Content: Editor or Empty State */}
            <div className="flex-1 overflow-hidden">
                {(selectedDoc || isCreatingNew) ? (
                    <DocEditor
                        workspaceId={workspaceId}
                        userId={userId}
                        docId={selectedDoc?.id}
                        onClose={handleCloseEditor}
                        onSave={() => {
                            // Refresh list after save
                            handleCloseEditor();
                        }}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <div className="text-6xl mb-4">📋</div>
                            <h2 className="text-2xl font-bold mb-2">GTM Docs</h2>
                            <p className="text-gray-600 mb-6">
                                Create and collaborate on GTM briefs, campaign plans, battlecards, and more.
                            </p>
                            <button
                                onClick={handleCreateNew}
                                className="px-6 py-3 bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                            >
                                Create Your First Doc
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkspaceTab;
