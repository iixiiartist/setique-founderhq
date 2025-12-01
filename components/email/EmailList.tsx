import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Inbox, Send, FileEdit, Trash2 } from 'lucide-react';
import { fixEmailEncoding } from '../../lib/utils/textDecoder';
import { EmailMessage, EmailFolder } from './types';

interface EmailListProps {
    messages: EmailMessage[];
    activeFolder: EmailFolder;
    selectedMessageId: string | null;
    onMessageClick: (msg: EmailMessage) => void;
    onDeleteDraft: (e: React.MouseEvent, msg: EmailMessage) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
    messages,
    activeFolder,
    selectedMessageId,
    onMessageClick,
    onDeleteDraft
}) => {
    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center text-gray-500">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    {activeFolder === 'inbox' && <Inbox className="w-6 h-6 text-gray-400" />}
                    {activeFolder === 'sent' && <Send className="w-6 h-6 text-gray-400" />}
                    {activeFolder === 'drafts' && <FileEdit className="w-6 h-6 text-gray-400" />}
                </div>
                <p className="text-sm font-medium">
                    {activeFolder === 'inbox' && 'No emails in inbox'}
                    {activeFolder === 'sent' && 'No sent emails'}
                    {activeFolder === 'drafts' && 'No draft emails'}
                </p>
                <p className="text-xs mt-1">
                    {activeFolder === 'inbox' && 'Your inbox is empty or sync is needed.'}
                    {activeFolder === 'sent' && 'Emails you send will appear here.'}
                    {activeFolder === 'drafts' && 'Saved drafts will appear here.'}
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {messages.map((msg) => {
                const displayAddress = activeFolder === 'sent' && msg.to_addresses?.length
                    ? `To: ${msg.to_addresses[0].replace(/<.*>/, '').trim()}`
                    : msg.from_address.replace(/<.*>/, '').trim() || msg.from_address;
                
                return (
                    <div 
                        key={msg.id} 
                        onClick={() => onMessageClick(msg)}
                        className={`p-3 sm:p-4 min-h-[72px] cursor-pointer transition-all hover:bg-gray-50 group
                            ${selectedMessageId === msg.id ? 'bg-blue-50/50 border-l-4 border-blue-500 pl-[8px] sm:pl-[12px]' : 'border-l-4 border-transparent pl-[8px] sm:pl-[12px]'}
                            ${!msg.is_read ? 'bg-white' : 'bg-white/50'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm truncate pr-2 ${!msg.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {displayAddress}
                            </span>
                            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                {formatDistanceToNow(new Date(msg.received_at), { addSuffix: true })}
                            </span>
                        </div>
                        <h3 className={`text-sm mb-1 truncate ${!msg.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {fixEmailEncoding(msg.subject) || '(No Subject)'}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {fixEmailEncoding(msg.snippet)}
                        </p>
                        {activeFolder === 'drafts' && (
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Draft</span>
                                <button
                                    onClick={(e) => onDeleteDraft(e, msg)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete draft"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
