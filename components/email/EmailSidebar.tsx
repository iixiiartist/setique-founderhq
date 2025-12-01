import React from 'react';
import { Inbox, Send, FileEdit, PenSquare } from 'lucide-react';
import { EmailFolder } from './types';

interface EmailSidebarProps {
    activeFolder: EmailFolder;
    onFolderChange: (folder: EmailFolder) => void;
    onCompose: () => void;
}

export const EmailSidebar: React.FC<EmailSidebarProps> = ({ activeFolder, onFolderChange, onCompose }) => {
    return (
        <div className="w-48 border-r border-gray-200 bg-gray-50/50 flex-shrink-0 hidden lg:flex flex-col h-full">
            <div className="p-4">
                <button
                    onClick={onCompose}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors shadow-sm"
                >
                    <PenSquare size={16} />
                    <span>Compose</span>
                </button>
            </div>
            <nav className="flex-1 px-2">
                <button
                    onClick={() => onFolderChange('inbox')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
                        ${activeFolder === 'inbox' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                    <Inbox size={18} />
                    <span>Inbox</span>
                </button>
                <button
                    onClick={() => onFolderChange('sent')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
                        ${activeFolder === 'sent' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                    <Send size={18} />
                    <span>Sent</span>
                </button>
                <button
                    onClick={() => onFolderChange('drafts')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
                        ${activeFolder === 'drafts' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                    <FileEdit size={18} />
                    <span>Drafts</span>
                </button>
            </nav>
        </div>
    );
};
