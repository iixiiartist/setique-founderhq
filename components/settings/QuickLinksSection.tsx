import React, { useState, useEffect } from 'react';
import { QuickLink, SettingsData } from '../../types';
import { Link2, X, Plus, Save } from 'lucide-react';

interface QuickLinkEditorProps {
    link: QuickLink;
    onUpdate: (link: QuickLink) => void;
    onDelete: () => void;
}

export function QuickLinkEditor({ link, onUpdate, onDelete }: QuickLinkEditorProps) {
    const [text, setText] = useState(link.text);
    const [href, setHref] = useState(link.href);
    const [hasChanges, setHasChanges] = useState(false);

    // Update local state when prop changes (e.g., when adding new link)
    useEffect(() => {
        setText(link.text);
        setHref(link.href);
        setHasChanges(false);
    }, [link.id]); // Only update when link ID changes (new link)

    // Check if there are unsaved changes
    useEffect(() => {
        setHasChanges(text !== link.text || href !== link.href);
    }, [text, href, link.text, link.href]);

    const handleSave = () => {
        if (hasChanges) {
            onUpdate({ ...link, text, href });
            setHasChanges(false);
        }
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                    type="text"
                    value={text || ''}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Link Text"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 focus:outline-none"
                />
                <input
                    type="url"
                    value={href || ''}
                    onChange={(e) => setHref(e.target.value)}
                    placeholder="https://example.com"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 focus:outline-none"
                />
            </div>
            {hasChanges && (
                <button
                    onClick={handleSave}
                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800"
                    title="Save changes"
                >
                    <Save className="w-4 h-4" />
                </button>
            )}
            <button
                onClick={onDelete}
                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                title="Delete link"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

interface QuickLinksSectionProps {
    quickLinks: QuickLink[] | undefined;
    onUpdateSettings: (updates: Partial<SettingsData>) => void;
}

export function QuickLinksSection({ quickLinks, onUpdateSettings }: QuickLinksSectionProps) {
    const handleAddLink = () => {
        const newLink: QuickLink = {
            id: Date.now().toString(),
            text: 'New Link',
            href: 'https://example.com',
            iconChar: 'L',
            iconBg: 'bg-blue-100',
            iconColor: 'text-black'
        };
        onUpdateSettings({
            quickLinks: [...(quickLinks || []), newLink]
        });
    };

    const handleUpdateLink = (index: number, updatedLink: QuickLink) => {
        const newLinks = [...(quickLinks || [])];
        newLinks[index] = updatedLink;
        onUpdateSettings({ quickLinks: newLinks });
    };

    const handleDeleteLink = (index: number) => {
        const newLinks = (quickLinks || []).filter((_, i) => i !== index);
        onUpdateSettings({ quickLinks: newLinks });
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Add custom quick links to your dashboard for easy access to your frequently used tools.
            </p>
            {(!quickLinks || quickLinks.length === 0) ? (
                <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                    <p className="text-slate-500 mb-4">No quick links added yet</p>
                    <button
                        onClick={handleAddLink}
                        className="bg-slate-900 text-white py-2.5 px-4 font-medium rounded-xl hover:bg-slate-800 inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add First Quick Link
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {quickLinks.map((link, index) => (
                        <QuickLinkEditor
                            key={link.id}
                            link={link}
                            onUpdate={(updatedLink) => handleUpdateLink(index, updatedLink)}
                            onDelete={() => handleDeleteLink(index)}
                        />
                    ))}
                    <button
                        onClick={handleAddLink}
                        className="w-full bg-white border border-slate-200 text-slate-900 py-2.5 px-4 font-medium hover:bg-slate-50 rounded-xl flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Another Link
                    </button>
                </div>
            )}
        </div>
    );
}
