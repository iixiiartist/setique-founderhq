import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { WORKSPACE_TEMPLATES, applyTemplate, WorkspaceTemplate } from '../../lib/services/templateService';
import { Rocket, Building2, Palette, Box, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react';

interface TemplateLibraryProps {
    onTemplateApplied: () => void;
}

const TEMPLATE_ICONS = {
    tech_startup: Rocket,
    saas: Building2,
    agency: Palette,
    ecommerce: ShoppingCart,
    consulting: Box,
    custom: Box,
};

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onTemplateApplied }) => {
    const { user } = useAuth();
    const { workspace } = useWorkspace();
    const [selectedTemplate, setSelectedTemplate] = useState<WorkspaceTemplate | null>(null);
    const [applying, setApplying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApplyTemplate = async () => {
        if (!selectedTemplate || !workspace || !user) return;

        if (!confirm(`Apply "${selectedTemplate.name}" template? This will add:\n\n• ${selectedTemplate.tasks.length} tasks\n• ${selectedTemplate.contacts.length} CRM contacts\n• ${selectedTemplate.documents.length} documents\n\nExisting data will not be affected.`)) {
            return;
        }

        setApplying(true);
        setError(null);

        const result = await applyTemplate(
            workspace.id,
            user.id,
            user.email?.split('@')[0] || 'User',
            selectedTemplate.id
        );

        setApplying(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onTemplateApplied();
            }, 2000);
        } else {
            setError(result.error || 'Failed to apply template');
        }
    };

    if (success) {
        return (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
                <CheckCircle2 size={64} className="mx-auto mb-4 text-green-600" />
                <h2 className="font-semibold text-2xl mb-2 text-slate-900">Template Applied!</h2>
                <p className="text-gray-600 mb-4">
                    Your workspace has been populated with sample data.
                </p>
                <p className="text-sm text-gray-500">
                    Redirecting to your workspace...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white rounded-t-2xl">
                <h2 className="font-semibold text-2xl mb-2">Workspace Templates</h2>
                <p className="text-sm text-gray-300">
                    Jumpstart your workspace with pre-built templates for different business types
                </p>
            </div>

            <div className="flex" style={{ minHeight: '600px' }}>
                {/* Templates list */}
                <div className="w-2/5 border-r border-gray-200 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                        {WORKSPACE_TEMPLATES.map((template) => {
                            const IconComponent = TEMPLATE_ICONS[template.category];
                            const isSelected = selectedTemplate?.id === template.id;

                            return (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`w-full p-6 text-left hover:bg-gray-50 transition-colors ${
                                        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-2xl">
                                                {template.icon}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-1 text-slate-900">
                                                {template.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-3">
                                                {template.description}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    {template.tasks.length} tasks
                                                </span>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    {template.contacts.length} contacts
                                                </span>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    {template.documents.length} docs
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Template details */}
                <div className="flex-1 overflow-y-auto">
                    {selectedTemplate ? (
                        <div className="p-8">
                            {/* Template header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                                        {selectedTemplate.icon}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-2xl mb-2 text-slate-900">
                                            {selectedTemplate.name}
                                        </h2>
                                        <p className="text-gray-600">
                                            {selectedTemplate.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Error message */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-red-900 mb-1">
                                            Failed to Apply Template
                                        </div>
                                        <div className="text-sm text-red-800">{error}</div>
                                    </div>
                                </div>
                            )}

                            {/* Apply button */}
                            <div className="mb-8">
                                <button
                                    onClick={handleApplyTemplate}
                                    disabled={applying}
                                    className="w-full py-3 bg-slate-900 text-white font-medium text-lg rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                                >
                                    {applying ? 'Applying Template...' : `Apply ${selectedTemplate.name} Template`}
                                </button>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    This will add sample data to your workspace without removing existing content
                                </p>
                            </div>

                            {/* What's included */}
                            <div className="space-y-6">
                                {/* Tasks */}
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-slate-900">
                                        <div className="w-6 h-6 bg-slate-900 text-white rounded text-sm flex items-center justify-center">
                                            {selectedTemplate.tasks.length}
                                        </div>
                                        Sample Tasks
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedTemplate.tasks.slice(0, 5).map((task, index) => (
                                            <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{task.text}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {task.category} • {task.priority} Priority
                                                            {task.dueOffset && ` • Due in ${task.dueOffset} days`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedTemplate.tasks.length > 5 && (
                                            <div className="p-2 text-center text-xs text-gray-500">
                                                +{selectedTemplate.tasks.length - 5} more tasks
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CRM Contacts */}
                                {selectedTemplate.contacts.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-slate-900">
                                            <div className="w-6 h-6 bg-slate-900 text-white rounded text-sm flex items-center justify-center">
                                                {selectedTemplate.contacts.length}
                                            </div>
                                            Sample CRM Contacts
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedTemplate.contacts.map((contact, index) => (
                                                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium">{contact.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {contact.role} at {contact.company}
                                                            </div>
                                                        </div>
                                                        <span className="px-2 py-1 bg-slate-900 text-white text-xs rounded-full">
                                                            {contact.collection}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Documents */}
                                {selectedTemplate.documents.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-slate-900">
                                            <div className="w-6 h-6 bg-slate-900 text-white rounded text-sm flex items-center justify-center">
                                                {selectedTemplate.documents.length}
                                            </div>
                                            Sample Documents
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedTemplate.documents.map((doc, index) => (
                                                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                                    <div className="text-sm font-medium mb-1">{doc.title}</div>
                                                    <div className="text-xs text-gray-500 mb-2">
                                                        Type: {doc.docType}
                                                    </div>
                                                    <div className="text-xs text-gray-700 line-clamp-2">
                                                        {doc.content.substring(0, 100)}...
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Financial Structure */}
                                {selectedTemplate.financial_structure && (
                                    <div>
                                        <h3 className="font-semibold text-lg mb-3 text-slate-900">Financial Structure</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                                <div className="text-xs font-medium text-green-900 mb-2">
                                                    Revenue Categories
                                                </div>
                                                <ul className="text-xs text-green-800 space-y-1">
                                                    {selectedTemplate.financial_structure.revenue_categories.map((cat, i) => (
                                                        <li key={i}>• {cat}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                                <div className="text-xs font-medium text-red-900 mb-2">
                                                    Expense Categories
                                                </div>
                                                <ul className="text-xs text-red-800 space-y-1">
                                                    {selectedTemplate.financial_structure.expense_categories.map((cat, i) => (
                                                        <li key={i}>• {cat}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full p-8 text-center">
                            <div>
                                <Box size={64} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">
                                    Select a template to see details and apply it to your workspace
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateLibrary;
