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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleDocSelect = (doc: GTMDocMetadata) => {
        setSelectedDoc(doc);
        setIsCreatingNew(false);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleCreateNew = () => {
        setSelectedDoc(null);
        setIsCreatingNew(true);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleCloseEditor = () => {
        setSelectedDoc(null);
        setIsCreatingNew(false);
    };

    return (
        <div className="h-full flex relative">
            {/* Mobile Menu Button */}
            {(selectedDoc || isCreatingNew) && (
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-yellow-400 border-2 border-black shadow-neo-btn"
                    aria-label="Toggle document list"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            )}

            {/* Left Sidebar: Document List */}
            <div className={`
                lg:w-80 w-full lg:relative absolute inset-y-0 left-0 z-40
                border-r-2 border-black bg-white overflow-y-auto
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <DocsList
                    workspaceId={workspaceId}
                    userId={userId}
                    onDocSelect={handleDocSelect}
                    onCreateNew={handleCreateNew}
                    selectedDocId={selectedDoc?.id || null}
                />
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Right Content: Editor or Empty State */}
            <div className="flex-1 overflow-hidden w-full lg:w-auto">
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
                    <div className="h-full flex items-center justify-center p-4 lg:p-8">
                        <div className="text-center max-w-md">
                            <div className="text-4xl lg:text-6xl mb-4">📋</div>
                            <h2 className="text-xl lg:text-2xl font-bold mb-2">GTM Docs</h2>
                            <p className="text-sm lg:text-base text-gray-600 mb-6">
                                Create and collaborate on GTM briefs, campaign plans, battlecards, and more.
                            </p>
                            <button
                                onClick={handleCreateNew}
                                className="px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
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
