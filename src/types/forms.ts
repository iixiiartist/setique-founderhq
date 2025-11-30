// Forms Engine Types
// Branded Interactive Forms for GTM Docs Editor

export type FormStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type FormVisibility = 'public' | 'private' | 'password_protected';

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file'
  | 'rating'
  | 'nps'
  | 'scale'
  | 'signature'
  | 'address'
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'image';

export type FormAnalyticsEventType = 'view' | 'start' | 'submit' | 'abandon' | 'field_interaction';

// Theme and Styling Types
export interface FormTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  errorColor: string;
  successColor: string;
  fontFamily: string;
  fontSize: string;
  borderRadius: string;
  borderColor: string;
  inputBackground: string;
  buttonStyle: 'filled' | 'outlined' | 'ghost';
  spacing: 'compact' | 'normal' | 'relaxed';
}

export interface FormBranding {
  logoUrl?: string;
  logoPosition: 'left' | 'center' | 'right' | 'hidden';
  logoSize: 'small' | 'medium' | 'large';
  companyName?: string;
  showCompanyName: boolean;
  headerImageUrl?: string;
  favicon?: string;
  customCss?: string;
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundGradient?: {
    from: string;
    to: string;
    direction: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-tr' | 'to-tl' | 'to-br' | 'to-bl';
  };
  backgroundImageUrl?: string;
}

export interface FormSettings {
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  shuffleQuestions: boolean;
  allowMultipleSubmissions: boolean;
  captchaEnabled: boolean;
  captchaType: 'recaptcha' | 'hcaptcha' | 'none';
  autoSave: boolean;
  confirmationMessage: string;
  redirectUrl?: string;
  notificationEmails: string[];
  webhookUrl?: string;
  closedMessage?: string;
  limitMessage?: string;
}

export interface FormAnalyticsSettings {
  trackViews: boolean;
  trackCompletionTime: boolean;
  trackFieldDropoff: boolean;
  trackUtm: boolean;
  trackReferrer: boolean;
  enableHeatmaps: boolean;
}

// Field Types
export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customValidation?: string;
}

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
  imageUrl?: string;
  description?: string;
}

export interface FormFieldConditionalLogic {
  enabled: boolean;
  action: 'show' | 'hide' | 'require';
  conditions: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value: string | number | boolean;
  }[];
  logic: 'and' | 'or';
}

export interface FormFieldStyling {
  width: '25%' | '33%' | '50%' | '66%' | '75%' | '100%';
  alignment: 'left' | 'center' | 'right';
  customClasses?: string;
}

export interface FormField {
  id: string;
  form_id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  help_text?: string;
  required: boolean;
  validation_rules: FormFieldValidation;
  options?: FormFieldOption[];
  conditional_logic?: FormFieldConditionalLogic;
  styling?: FormFieldStyling;
  position: number;
  default_value?: string | number | boolean;
  created_at?: string;
  updated_at?: string;
}

// Main Form Type
export type FormType = 'form' | 'survey' | 'poll' | 'quiz' | 'feedback';

export interface Form {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description?: string;
  slug: string;
  status: FormStatus;
  form_type: FormType;
  settings: FormSettings;
  theme: FormTheme;
  branding: FormBranding;
  analytics_settings: FormAnalyticsSettings;
  visibility: FormVisibility;
  access_password?: string;
  expires_at?: string;
  response_limit?: number;
  total_submissions: number;
  // CRM Integration
  default_campaign_id?: string;
  default_account_id?: string;
  auto_create_contact?: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  // Relations
  fields?: FormField[];
  // Computed/joined
  type?: FormType; // Alternative alias for form_type
}

// Form Submission Types
export interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, any>;
  contact_id?: string;
  deal_id?: string;
  campaign_id?: string;
  account_id?: string;
  source_url?: string;
  utm_params?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
  completion_time_seconds?: number;
  ip_hash?: string;
  user_agent?: string;
  created_at: string;
}

// Form Analytics Types
export interface FormAnalyticsEvent {
  id: string;
  form_id: string;
  event_type: FormAnalyticsEventType;
  field_id?: string;
  metadata?: Record<string, any>;
  user_agent?: string;
  ip_hash?: string;
  referrer?: string;
  utm_params?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  session_id?: string;
  created_at: string;
}

export interface FormAnalyticsSummary {
  form_id: string;
  total_views: number;
  total_starts: number;
  total_submissions: number;
  total_abandons: number;
  conversion_rate: number;
  average_completion_time: number;
  top_referrers: { referrer: string; count: number }[];
  utm_breakdown: {
    source: Record<string, number>;
    medium: Record<string, number>;
    campaign: Record<string, number>;
  };
  field_dropoff: { field_id: string; label: string; dropoff_rate: number }[];
  submissions_over_time: { date: string; count: number }[];
}

// Form Theme Preset Type
export interface FormThemePreset {
  id: string;
  name: string;
  slug: string;
  description?: string;
  theme: FormTheme;
  branding: Partial<FormBranding>;
  preview_image_url?: string;
  is_default: boolean;
  created_by?: string;
  created_at: string;
}

// Form Builder State Types (for UI)
export interface FormBuilderState {
  form: Partial<Form>;
  fields: FormField[];
  selectedFieldId: string | null;
  isDirty: boolean;
  isPreviewMode: boolean;
  activeTab: 'fields' | 'design' | 'settings' | 'logic' | 'integrations';
  undoStack: FormField[][];
  redoStack: FormField[][];
}

// Drag and Drop Types
export interface DragItem {
  type: 'new-field' | 'existing-field';
  fieldType?: FormFieldType;
  fieldId?: string;
  index?: number;
}

// Form Templates
export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'contact' | 'feedback' | 'registration' | 'survey' | 'order' | 'application' | 'custom';
  thumbnail_url?: string;
  form_structure: {
    settings: Partial<FormSettings>;
    theme: Partial<FormTheme>;
    branding: Partial<FormBranding>;
    fields: Omit<FormField, 'id' | 'form_id' | 'created_at' | 'updated_at'>[];
  };
}

// Default Values
export const DEFAULT_FORM_THEME: FormTheme = {
  primaryColor: '#8B5CF6',
  secondaryColor: '#A78BFA',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  accentColor: '#8B5CF6',
  errorColor: '#EF4444',
  successColor: '#10B981',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '16px',
  borderRadius: '8px',
  borderColor: '#E5E7EB',
  inputBackground: '#F9FAFB',
  buttonStyle: 'filled',
  spacing: 'normal',
};

export const DEFAULT_FORM_BRANDING: FormBranding = {
  logoPosition: 'left',
  logoSize: 'medium',
  showCompanyName: true,
  backgroundType: 'solid',
};

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  showProgressBar: true,
  showQuestionNumbers: false,
  shuffleQuestions: false,
  allowMultipleSubmissions: true,
  captchaEnabled: false,
  captchaType: 'none',
  autoSave: true,
  confirmationMessage: 'Thank you for your submission!',
  notificationEmails: [],
};

export const DEFAULT_ANALYTICS_SETTINGS: FormAnalyticsSettings = {
  trackViews: true,
  trackCompletionTime: true,
  trackFieldDropoff: true,
  trackUtm: true,
  trackReferrer: true,
  enableHeatmaps: false,
};

// Field Type Metadata (for builder UI)
export const FORM_FIELD_TYPES: {
  type: FormFieldType;
  label: string;
  icon: string;
  category: 'input' | 'choice' | 'advanced' | 'layout';
  description: string;
}[] = [
  { type: 'text', label: 'Short Text', icon: 'Type', category: 'input', description: 'Single line text input' },
  { type: 'email', label: 'Email', icon: 'Mail', category: 'input', description: 'Email address with validation' },
  { type: 'phone', label: 'Phone', icon: 'Phone', category: 'input', description: 'Phone number input' },
  { type: 'number', label: 'Number', icon: 'Hash', category: 'input', description: 'Numeric input' },
  { type: 'textarea', label: 'Long Text', icon: 'AlignLeft', category: 'input', description: 'Multi-line text area' },
  { type: 'select', label: 'Dropdown', icon: 'ChevronDown', category: 'choice', description: 'Single select dropdown' },
  { type: 'multi_select', label: 'Multi-Select', icon: 'ListChecks', category: 'choice', description: 'Multiple selection dropdown' },
  { type: 'radio', label: 'Radio Buttons', icon: 'Circle', category: 'choice', description: 'Single choice radio group' },
  { type: 'checkbox', label: 'Checkboxes', icon: 'CheckSquare', category: 'choice', description: 'Multiple choice checkboxes' },
  { type: 'date', label: 'Date', icon: 'Calendar', category: 'input', description: 'Date picker' },
  { type: 'time', label: 'Time', icon: 'Clock', category: 'input', description: 'Time picker' },
  { type: 'datetime', label: 'Date & Time', icon: 'CalendarClock', category: 'input', description: 'Combined date and time' },
  { type: 'file', label: 'File Upload', icon: 'Upload', category: 'advanced', description: 'File upload field' },
  { type: 'rating', label: 'Rating', icon: 'Star', category: 'advanced', description: 'Star rating input' },
  { type: 'nps', label: 'NPS Score', icon: 'BarChart2', category: 'advanced', description: 'Net Promoter Score (0-10)' },
  { type: 'scale', label: 'Scale', icon: 'Sliders', category: 'advanced', description: 'Linear scale selection' },
  { type: 'signature', label: 'Signature', icon: 'PenTool', category: 'advanced', description: 'Digital signature pad' },
  { type: 'address', label: 'Address', icon: 'MapPin', category: 'advanced', description: 'Full address input' },
  { type: 'heading', label: 'Heading', icon: 'Heading', category: 'layout', description: 'Section heading text' },
  { type: 'paragraph', label: 'Paragraph', icon: 'FileText', category: 'layout', description: 'Descriptive text block' },
  { type: 'divider', label: 'Divider', icon: 'Minus', category: 'layout', description: 'Visual separator line' },
  { type: 'image', label: 'Image', icon: 'Image', category: 'layout', description: 'Display an image' },
];
