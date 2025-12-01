// Email module types and constants

export type EmailFolder = 'inbox' | 'sent' | 'drafts';

export interface EmailMessage {
  id: string;
  provider_message_id: string;
  subject: string;
  snippet: string;
  from_address: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  account_id: string;
  folder_id?: string;
  body?: { html?: string; text?: string; attachments?: any[] };
}

export interface EditingDraft {
  id: string;
  provider_message_id: string;
  subject?: string;
  body?: { html?: string; text?: string; attachments?: any[] };
  to_addresses?: string[];
  cc_addresses?: string[];
}
