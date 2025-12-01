import React from 'react';
import { Inbox, Send, FileEdit, PenSquare, RefreshCw, Search } from 'lucide-react';
import { EmailFolder } from './types';

interface EmailToolbarProps {
    activeFolder: EmailFolder;
    searchQuery: string;
    syncing: boolean;
    onSearchChange: (query: string) => void;
    onRefresh: () => void;
    onCompose: () => void;
    onFolderChange: (folder: EmailFolder) => void;
}

export const EmailToolbar: React.FC<EmailToolbarProps> = ({
    activeFolder,
    searchQuery,
    syncing,
    onSearchChange,
    onRefresh,
    onCompose,
    onFolderChange
}) => {
    return (
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col gap-2 sm:gap-3 bg-white flex-shrink-0">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">{activeFolder}</h2>
                <div className="flex items-center gap-2">
                    {/* Compose Button - Mobile/Tablet */}
                    <button
                        onClick={onCompose}
                        className="lg:hidden flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors shadow-sm"
                        title="Compose new email"
                    >
                        <PenSquare size={18} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Compose</span>
                    </button>
                    {/* Refresh Button */}
                    <button 
                        onClick={onRefresh}
                        disabled={syncing}
                        className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Sync emails"
                    >
                        <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            {/* Mobile Folder Tabs */}
            <div className="flex lg:hidden border-t border-gray-100 pt-2 sm:pt-3 -mx-3 sm:-mx-4 px-1 sm:px-4 gap-1">
                <button
                    onClick={() => onFolderChange('inbox')}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 min-h-[44px] sm:min-h-0 py-2 text-xs font-medium rounded-lg transition-colors
                        ${activeFolder === 'inbox' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <Inbox size={16} className="sm:w-3.5 sm:h-3.5" />
                    <span>Inbox</span>
                </button>
                <button
                    onClick={() => onFolderChange('sent')}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 min-h-[44px] sm:min-h-0 py-2 text-xs font-medium rounded-lg transition-colors
                        ${activeFolder === 'sent' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <Send size={16} className="sm:w-3.5 sm:h-3.5" />
                    <span>Sent</span>
                </button>
                <button
                    onClick={() => onFolderChange('drafts')}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 min-h-[44px] sm:min-h-0 py-2 text-xs font-medium rounded-lg transition-colors
                        ${activeFolder === 'drafts' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <FileEdit size={16} className="sm:w-3.5 sm:h-3.5" />
                    <span>Drafts</span>
                </button>
            </div>
        </div>
    );
};
