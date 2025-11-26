import React from 'react';
import { EmailInbox } from './email/EmailInbox';

export const EmailTab: React.FC = () => {
  return (
    <div className="h-full p-4 bg-gray-50 overflow-hidden flex flex-col">
      <div className="mb-4 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">
            Communications
            </h1>
            <p className="text-sm text-gray-500 mt-1">
            Manage your inbox and draft replies with AI.
            </p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <EmailInbox />
      </div>
    </div>
  );
};

export default EmailTab;
