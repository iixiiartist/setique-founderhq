// types/huddle.ts
// Type definitions for the Huddle chat system

export type HuddleRoomType = 'channel' | 'dm';
export type HuddleMemberRole = 'member' | 'admin';
export type HuddleNotificationSetting = 'all' | 'mentions' | 'none';
export type HuddleBodyFormat = 'markdown' | 'plain';
export type HuddleAttachmentType = 'upload' | 'file_library' | 'document' | 'form';

export interface HuddleRoomSettings {
  ai_allowed: boolean;
  auto_summarize: boolean;
  ai_can_write: boolean;
  retention_days: number | null;
}

export interface HuddleRoom {
  id: string;
  workspace_id: string;
  type: HuddleRoomType;
  name: string | null;
  slug: string | null;
  description: string | null;
  is_private: boolean;
  created_by: string;
  settings: HuddleRoomSettings;
  last_message_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  members?: HuddleMember[];
  unread_count?: number;
  last_message?: HuddleMessage;
}

export interface HuddleMember {
  room_id: string;
  workspace_id: string;
  user_id: string;
  role: HuddleMemberRole;
  notifications: HuddleNotificationSetting;
  joined_at: string;
  // Joined fields
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

export interface HuddleAttachment {
  id: string;
  type: HuddleAttachmentType;
  name: string;
  mime?: string;
  size?: number;
  url?: string;
  source_id?: string; // Reference to documents.id, forms.id, etc.
}

export interface HuddleLinkedEntities {
  tasks?: string[];
  contacts?: string[];
  deals?: string[];
  documents?: string[];
  forms?: string[];
  files?: string[];
  accounts?: string[];
  expenses?: string[];
  revenue?: string[];
  calendar_events?: string[];
  marketing_campaigns?: string[];
}

// Individual linked entity for UI
export interface LinkedEntity {
  entity_type: 'task' | 'contact' | 'deal' | 'document' | 'form' | 'file' | 'account' | 'expense' | 'revenue' | 'calendar_event' | 'marketing_campaign';
  entity_id: string;
  entity_title?: string;
}

export interface HuddleToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

export interface HuddleWebSource {
  title: string;
  url: string;
  snippet: string;
}

export interface HuddleMessageMetadata {
  ai_request_id?: string;
  tool_calls?: HuddleToolCall[];
  web_sources?: HuddleWebSource[];
  linked_entities?: HuddleLinkedEntities;
  mentions?: string[];
  moderation?: {
    flagged: boolean;
    reason?: string;
  };
}

export interface HuddleMessage {
  id: string;
  room_id: string;
  workspace_id: string;
  user_id: string | null;
  body: string;
  body_format: HuddleBodyFormat;
  thread_root_id: string | null;
  reply_count: number;
  metadata: HuddleMessageMetadata | null;
  attachments: HuddleAttachment[];
  is_system: boolean;
  is_ai: boolean;
  is_pinned: boolean;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  // Joined fields
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reactions?: HuddleReaction[];
  thread_messages?: HuddleMessage[];
}

export interface HuddleReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  // Joined fields
  user?: {
    id: string;
    full_name: string;
  };
}

export interface HuddleReadReceipt {
  room_id: string;
  user_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
}

export interface HuddleSummary {
  id: string;
  room_id: string;
  workspace_id: string;
  thread_root_id: string | null;
  summary: string;
  key_points: string[];
  action_items: string[];
  decisions: string[];
  message_range: {
    from_id: string;
    to_id: string;
    count: number;
  } | null;
  is_pinned: boolean;
  generated_by: string | null;
  created_at: string;
}

// API Request/Response types
export interface CreateRoomRequest {
  workspace_id: string;
  type: HuddleRoomType;
  name?: string;
  description?: string;
  is_private?: boolean;
  member_ids?: string[]; // For private channels and DMs
  settings?: Partial<HuddleRoomSettings>;
}

export interface SendMessageRequest {
  room_id: string;
  body: string;
  body_format?: HuddleBodyFormat;
  thread_root_id?: string;
  attachments?: HuddleAttachment[];
  linked_entities?: HuddleLinkedEntities;
  mentions?: string[];
}

export interface AIRunRequest {
  room_id: string;
  thread_root_id?: string;
  prompt: string;
  user_timezone?: string; // User's timezone (e.g., 'America/New_York')
  context_options: {
    include_recent_messages?: boolean;
    message_count?: number;
    include_thread?: boolean;
    include_workspace_data?: boolean;
    workspace_data_types?: ('tasks' | 'contacts' | 'deals' | 'documents' | 'forms' | 'pipeline')[];
    include_web_research?: boolean;
    web_research_query?: string;
    selected_files?: string[];
    selected_documents?: string[];
    selected_forms?: string[];
  };
  tool_options: {
    allow_task_creation?: boolean;
    allow_contact_creation?: boolean;
    allow_account_creation?: boolean;
    allow_deal_creation?: boolean;
    allow_expense_creation?: boolean;
    allow_revenue_creation?: boolean;
    allow_note_creation?: boolean;
    allow_calendar_event_creation?: boolean;
    allow_marketing_campaign_creation?: boolean;
    allow_web_search?: boolean;
  };
}

export interface AIStreamEvent {
  type: 'content' | 'tool_result' | 'complete' | 'error';
  content?: string;
  tool?: string;
  result?: any;
  message_id?: string;
  tool_calls?: HuddleToolCall[];
  web_sources?: HuddleWebSource[];
  error?: string;
}

// UI State types
export interface HuddleState {
  rooms: HuddleRoom[];
  activeRoom: HuddleRoom | null;
  messages: Record<string, HuddleMessage[]>; // room_id -> messages
  threadMessages: Record<string, HuddleMessage[]>; // thread_root_id -> messages
  unreadCounts: Record<string, number>; // room_id -> count
  typingUsers: Record<string, string[]>; // room_id -> user_ids
  loading: {
    rooms: boolean;
    messages: boolean;
    sending: boolean;
    aiRunning: boolean;
  };
}

export interface HuddleComposerState {
  body: string;
  attachments: HuddleAttachment[];
  mentions: string[];
  linkedEntities: HuddleLinkedEntities;
  replyingTo: HuddleMessage | null;
}

// Share to Huddle types (for integration from other tabs)
export interface ShareToHuddlePayload {
  type: 'task' | 'contact' | 'deal' | 'document' | 'form' | 'file' | 'calendar_event' | 'account' | 'expense' | 'revenue' | 'marketing_campaign';
  id: string;
  title: string;
  description?: string;
  url?: string;
  preview?: {
    image?: string;
    snippet?: string;
  };
  askAi?: boolean;
  aiPrompt?: string;
  // Calendar event specific fields
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string[];
}
