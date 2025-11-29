import React from 'react';
import { EmailInbox } from './email/EmailInbox';

export const EmailTab: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="p-4 pb-0 flex-shrink-0">
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
      </div>
      
      <div className="flex-1 min-h-0 p-4 pt-0">
        <EmailInbox />
      </div>
    </div>
  );
};

export default EmailTab;
