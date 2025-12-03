import React, { useState, useEffect, lazy, Suspense } from 'react';
import { GTMDocMetadata, AppActions, DashboardData } from '../../types';
import { DocsList } from './DocsList';
import { DocEditor } from './DocEditor';
import { Form, FormField as FormFieldType } from '../../types/forms';
import { createForm, updateForm, bulkSaveFields, getForm } from '../../src/services/formService';

// Lazy load forms components (from root components folder)
const FormBuilder = lazy(() => import('../forms/FormBuilder'));
const FormsList = lazy(() => import('../forms/FormsList'));
const FormAnalytics = lazy(() => import('../forms/FormAnalytics'));

type WorkspaceView = 'docs' | 'forms';

interface WorkspaceTabProps {
    workspaceId: string;
    userId: string;
    actions: AppActions;
    data: DashboardData;
    onUpgradeNeeded?: () => void;
    initialDocId?: string | null;
    onClearInitialDoc?: () => void;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ workspaceId, userId, actions, data, onUpgradeNeeded, initialDocId, onClearInitialDoc }) => {
    const [view, setView] = useState<WorkspaceView>('docs');
    const [selectedDoc, setSelectedDoc] = useState<GTMDocMetadata | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    
    // Forms state
    const [selectedForm, setSelectedForm] = useState<Form | null>(null);
    const [isCreatingForm, setIsCreatingForm] = useState(false);
    const [analyticsForm, setAnalyticsForm] = useState<Form | null>(null);

    // Handle opening a doc passed via initialDocId
    useEffect(() => {
        if (initialDocId && workspaceId) {
            setView('docs');
            setSelectedDoc({ id: initialDocId } as GTMDocMetadata);
            setIsCreatingNew(false);
            onClearInitialDoc?.();
        }
    }, [initialDocId, workspaceId, onClearInitialDoc]);

    // Docs handlers
    const handleDocSelect = (doc: GTMDocMetadata) => {
        setSelectedDoc(doc);
        setIsCreatingNew(false);
        setIsSidebarOpen(false);
    };

    const handleCreateNewDoc = () => {
        setSelectedDoc(null);
        setIsCreatingNew(true);
        setIsSidebarOpen(false);
    };

    const handleCloseEditor = () => {
        setSelectedDoc(null);
        setIsCreatingNew(false);
    };

    const handleReloadDocs = () => {
        setReloadKey(prev => prev + 1);
    };

    // Forms handlers
    const handleCreateForm = () => {
        setSelectedForm(null);
        setIsCreatingForm(true);
    };

    const handleEditForm = async (form: Form) => {
        // Fetch the complete form with fields before opening editor
        const { data: fullForm, error } = await getForm(form.id);
        if (error || !fullForm) {
            console.error('Error loading form:', error);
            // Fallback to the form without fields
            setSelectedForm(form);
        } else {
            setSelectedForm(fullForm);
        }
        setIsCreatingForm(false);
    };

    const handleViewAnalytics = (form: Form) => {
        setAnalyticsForm(form);
    };

    const handleFormSave = async (formData: Partial<Form>, fields: Partial<FormFieldType>[]) => {
        try {
            if (selectedForm?.id) {
                // Update existing form
                await updateForm(selectedForm.id, formData);
                await bulkSaveFields(selectedForm.id, fields);
            } else {
                // Create new form
                const { data: newForm, error } = await createForm(workspaceId, userId, formData);
                if (error || !newForm) {
                    throw new Error(error || 'Failed to create form');
                }
                await bulkSaveFields(newForm.id, fields);
                setSelectedForm(newForm);
                setIsCreatingForm(false);
            }
        } catch (error) {
            console.error('Error saving form:', error);
            throw error;
        }
    };

    const handleBackFromForm = () => {
        setSelectedForm(null);
        setIsCreatingForm(false);
    };

    const isDocsEditorOpen = !!(selectedDoc || isCreatingNew);
    const isFormsEditorOpen = !!(selectedForm || isCreatingForm);

    return (
        <div className="h-full flex flex-col relative">
            {/* View Toggle - Only show when not in an editor */}
            {!isDocsEditorOpen && !isFormsEditorOpen && (
                <div className="flex-shrink-0 border-b-2 border-black bg-white">
                    <div className="flex">
                        <button
                            onClick={() => setView('docs')}
                            className={`flex-1 px-4 py-3 font-bold text-sm transition-colors ${
                                view === 'docs'
                                    ? 'bg-black text-white border-r border-gray-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-r border-gray-300'
                            }`}
                        >
                            📄 Documents
                        </button>
                        <button
                            onClick={() => setView('forms')}
                            className={`flex-1 px-4 py-3 font-bold text-sm transition-colors ${
                                view === 'forms'
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            📝 Forms
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex relative overflow-hidden">
                {/* DOCS VIEW */}
                {view === 'docs' && (
                    <>
                        {/* Mobile Menu Button */}
                        {isDocsEditorOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50"
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
                            border-r border-gray-200 bg-white overflow-y-auto
                            transition-transform duration-300 ease-in-out
                            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                            ${!isDocsEditorOpen ? 'lg:translate-x-0' : 'lg:hidden'}
                        `}>
                            <DocsList
                                key={reloadKey}
                                workspaceId={workspaceId}
                                userId={userId}
                                onDocSelect={handleDocSelect}
                                onCreateNew={handleCreateNewDoc}
                                selectedDocId={selectedDoc?.id || null}
                            />
                        </div>

                        {/* Overlay for mobile */}
                        {isSidebarOpen && (
                            <div
                                className="lg:hidden fixed inset-0 bg-gray-200 bg-opacity-10 z-30"
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
                                    onSave={(doc) => {
                                        if (!selectedDoc) {
                                            setSelectedDoc(doc);
                                            setIsCreatingNew(false);
                                        }
                                        handleReloadDocs();
                                    }}
                                    onReloadList={handleReloadDocs}
                                    actions={actions}
                                    data={data}
                                    onUpgradeNeeded={onUpgradeNeeded}
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
                                            onClick={handleCreateNewDoc}
                                            className="px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base bg-black text-white font-bold rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
                                        >
                                            Create Your First Doc
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* FORMS VIEW */}
                {view === 'forms' && (
                    <div className="flex-1 overflow-hidden">
                        <Suspense fallback={
                            <div className="h-full flex flex-col items-center justify-center gap-4">
                                <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 border-2 border-black animate-spin" style={{ animationDuration: '1.2s' }} />
                                    <div className="absolute inset-1.5 border border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                                </div>
                            </div>
                        }>
                            {analyticsForm ? (
                                <FormAnalytics
                                    form={analyticsForm}
                                    onBack={() => setAnalyticsForm(null)}
                                />
                            ) : isFormsEditorOpen ? (
                                <FormBuilder
                                    form={selectedForm || undefined}
                                    workspaceId={workspaceId}
                                    onSave={handleFormSave}
                                    onBack={handleBackFromForm}
                                />
                            ) : (
                                <div className="h-full overflow-auto p-6 bg-gray-50">
                                    <FormsList
                                        workspaceId={workspaceId}
                                        onCreateForm={handleCreateForm}
                                        onEditForm={handleEditForm}
                                        onViewAnalytics={handleViewAnalytics}
                                    />
                                </div>
                            )}
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkspaceTab;
