import React from 'react';
import { Mail } from 'lucide-react';

export const EmailEmptyState: React.FC = () => {
    return (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50/50">
            <div className="text-center text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select an email to read</p>
                <p className="text-xs text-gray-400 mt-1">Or compose a new message</p>
            </div>
        </div>
    );
};
