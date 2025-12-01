import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { DocumentTemplate } from '../../../lib/templates/gtmTemplates';

interface ComposerHeaderProps {
    isInline: boolean;
    isFullscreen: boolean;
    replyTo: any;
    onToggleFullscreen: () => void;
    onClose: () => void;
}

export function ComposerHeader({
    isInline,
    isFullscreen,
    replyTo,
    onToggleFullscreen,
    onClose
}: ComposerHeaderProps) {
    if (isInline) return null;
    
    return (
        <div className={`flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white ${isFullscreen ? '' : 'rounded-t-xl'}`}>
            <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                {replyTo ? 'Reply' : 'New Message'}
                <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} />
                    AI-Powered
                </span>
            </h3>
            <div className="flex items-center gap-1">
                <button
                    onClick={onToggleFullscreen}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? '⊙' : '⊛'}
                </button>
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}

interface ComposerFieldsProps {
    to: string;
    setTo: (to: string) => void;
    cc: string;
    setCc: (cc: string) => void;
    showCc: boolean;
    setShowCc: (show: boolean) => void;
    subject: string;
    setSubject: (subject: string) => void;
}

export function ComposerFields({
    to,
    setTo,
    cc,
    setCc,
    showCc,
    setShowCc,
    subject,
    setSubject
}: ComposerFieldsProps) {
    return (
        <div className="p-4 space-y-3 border-b border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-500 w-16">To</label>
                <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 transition-all"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="recipient@example.com"
                />
                {!showCc && (
                    <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                    >
                        +Cc
                    </button>
                )}
            </div>

            {showCc && (
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-500 w-16">Cc</label>
                    <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 transition-all"
                        value={cc}
                        onChange={e => setCc(e.target.value)}
                        placeholder="cc@example.com"
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-500 w-16">Subject</label>
                <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 transition-all font-medium"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject line"
                />
            </div>
        </div>
    );
}

interface AccountErrorBannerProps {
    error: string | null;
}

export function AccountErrorBanner({ error }: AccountErrorBannerProps) {
    if (!error) return null;
    
    return (
        <div className="mx-4 mt-3 mb-1 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
                <p className="font-semibold">Email account required</p>
                <p className="text-xs mt-0.5">{error}</p>
            </div>
        </div>
    );
}

interface AILimitBannerProps {
    error: { usage: number; limit: number; planType: string } | null;
    onDismiss: () => void;
}

export function AILimitBanner({ error, onDismiss }: AILimitBannerProps) {
    if (!error) return null;
    
    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mx-4 mt-2 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 text-sm">AI Limit Reached</h4>
                <p className="text-xs text-yellow-700 mt-1">
                    You've used <strong>{error.usage}/{error.limit}</strong> AI requests on the <strong>{error.planType}</strong> plan.
                    Upgrade to Power ($49/mo) or Team Pro ($99/mo) for unlimited AI features.
                </p>
                <button
                    onClick={onDismiss}
                    className="mt-2 text-xs text-yellow-700 underline hover:text-yellow-900"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}

interface GTMTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: DocumentTemplate[];
    onApplyTemplate: (template: DocumentTemplate) => void;
}

export function GTMTemplateModal({ isOpen, onClose, templates, onApplyTemplate }: GTMTemplateModalProps) {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">GTM Document Templates</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <p className="text-sm text-gray-600 mb-4">
                        Select a GTM template to use as a starting point for your email.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {templates.slice(0, 12).map(template => (
                            <button
                                key={template.id}
                                onClick={() => onApplyTemplate(template)}
                                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 text-left transition-colors"
                            >
                                <span className="text-2xl">{template.icon}</span>
                                <div>
                                    <div className="font-medium text-gray-900">{template.name}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ResearchResultsPanelProps {
    results: string | null;
    onInsert: () => void;
    onDismiss: () => void;
}

export function ResearchResultsPanel({ results, onInsert, onDismiss }: ResearchResultsPanelProps) {
    if (!results) return null;
    
    return (
        <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    🌐 Research & Suggestions
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={onInsert}
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black font-medium shadow-sm"
                    >
                        Insert into Email
                    </button>
                    <button
                        onClick={onDismiss}
                        className="text-xs px-3 py-1.5 text-gray-600 hover:bg-white/50 rounded-lg"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white/50 rounded-lg p-3">
                {results}
            </div>
        </div>
    );
}

interface AttachmentsBarProps {
    attachments: Array<{ name: string }>;
    onRemove: (index: number) => void;
}

export function AttachmentsBar({ attachments, onRemove }: AttachmentsBarProps) {
    if (attachments.length === 0) return null;
    
    return (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Attachments:</span>
                {attachments.map((file, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 text-xs"
                    >
                        📎
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button
                            onClick={() => onRemove(i)}
                            className="text-gray-400 hover:text-red-500 ml-1"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ComposerFooterProps {
    isInline: boolean;
    characterCount: number;
    attachmentCount: number;
    sending: boolean;
    savingDraft: boolean;
    accountReady: boolean;
    toEmpty: boolean;
    onCancel: () => void;
    onSaveDraft: () => void;
    onSend: () => void;
}

export function ComposerFooter({
    isInline,
    characterCount,
    attachmentCount,
    sending,
    savingDraft,
    accountReady,
    toEmpty,
    onCancel,
    onSaveDraft,
    onSend
}: ComposerFooterProps) {
    return (
        <div className={`p-4 border-t border-gray-100 bg-gray-50/80 flex justify-between items-center flex-shrink-0 ${!isInline ? 'rounded-b-xl' : ''}`}>
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{characterCount} characters</span>
                {attachmentCount > 0 && (
                    <span className="flex items-center gap-1">
                        📎 {attachmentCount} attachment{attachmentCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSaveDraft}
                    disabled={savingDraft || sending || !accountReady}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                    {savingDraft ? '⟳' : '💾'}
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                    onClick={onSend}
                    disabled={sending || savingDraft || toEmpty || !accountReady}
                    className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow transition-all"
                >
                    ✉️
                    {sending ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
}

export default ComposerHeader;
