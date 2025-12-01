import React, { useState, useEffect } from 'react';
import { QuickLink, SettingsData } from '../../types';

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
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="text-2xl shrink-0">
                🌐
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                    type="text"
                    value={text || ''}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Link Text"
                    className="border border-gray-300 rounded px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
                <input
                    type="url"
                    value={href || ''}
                    onChange={(e) => setHref(e.target.value)}
                    placeholder="https://example.com"
                    className="border border-gray-300 rounded px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-black focus:outline-none"
                />
            </div>
            {hasChanges && (
                <button
                    onClick={handleSave}
                    className="bg-green-600 text-white px-3 py-1 text-sm font-mono font-semibold border border-green-700 rounded hover:bg-green-700"
                    title="Save changes"
                >
                    Save
                </button>
            )}
            <button
                onClick={onDelete}
                className="text-xl font-bold hover:text-red-500 px-2"
                title="Delete link"
            >
                ×
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
            <p className="text-sm text-gray-600">
                Add custom quick links to your dashboard for easy access to your frequently used tools.
            </p>
            {(!quickLinks || quickLinks.length === 0) ? (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="text-gray-500 mb-4">No quick links added yet</p>
                    <button
                        onClick={handleAddLink}
                        className="font-mono bg-blue-600 border border-gray-300 text-white py-2 px-4 font-semibold rounded-md hover:bg-blue-700"
                    >
                        + Add First Quick Link
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
                        className="w-full font-mono bg-white border border-gray-300 text-black py-2 px-4 font-semibold hover:bg-gray-100 rounded-md"
                    >
                        + Add Another Link
                    </button>
                </div>
            )}
        </div>
    );
}
