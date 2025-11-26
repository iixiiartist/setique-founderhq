import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Send, Sparkles, Globe, Wand2, ChevronDown, 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Loader2, Search, Lightbulb, RefreshCw,
  Type, Highlighter, Palette, Image as ImageIcon, FileText, Minus as HrIcon,
  Strikethrough, Quote, Undo, Redo, Check,
  Paperclip, FileUp, LayoutTemplate, Maximize2, Minimize2, Square, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAiResponse, Content, AILimitError } from '../../services/groqService';
import { searchWeb } from '../../src/lib/services/youSearchService';
import { showSuccess, showError } from '../../lib/utils/toast';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { GTM_TEMPLATES, DocumentTemplate } from '../../lib/templates/gtmTemplates';

// Rich text editor imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

interface DraftData {
  id: string;
  provider_message_id: string;
  subject?: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  body?: {
    html?: string;
    text?: string;
    attachments?: { name: string; url: string; type: string }[];
  };
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: any;
  defaultAccountId?: string;
  isInline?: boolean;
  initialSubject?: string;
  initialBody?: string;
  editDraft?: DraftData | null;
  onDraftDeleted?: () => void;
}

interface AIAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: 'draft' | 'improve' | 'shorten' | 'expand' | 'formal' | 'friendly' | 'research' | 'suggest';
}

// Font sizes for the dropdown
const FONT_SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '14px' },
  { label: 'Medium', value: '16px' },
  { label: 'Large', value: '18px' },
  { label: 'X-Large', value: '24px' },
  { label: 'XX-Large', value: '32px' },
];

// Text colors
const TEXT_COLORS = [
  { label: 'Default', value: '#000000' },
  { label: 'Gray', value: '#6B7280' },
  { label: 'Red', value: '#DC2626' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Yellow', value: '#CA8A04' },
  { label: 'Green', value: '#16A34A' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Purple', value: '#9333EA' },
  { label: 'Pink', value: '#DB2777' },
];

// Highlight colors
const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#FEF08A' },
  { label: 'Green', value: '#BBF7D0' },
  { label: 'Blue', value: '#BFDBFE' },
  { label: 'Purple', value: '#DDD6FE' },
  { label: 'Pink', value: '#FBCFE8' },
  { label: 'Orange', value: '#FED7AA' },
];

// Email templates for quick access
const EMAIL_TEMPLATES = [
  {
    id: 'follow-up',
    name: 'Follow-up',
    icon: '📬',
    subject: 'Following up on our conversation',
    content: `<p>Hi [Name],</p>
<p>I wanted to follow up on our recent conversation about [topic]. I hope you've had a chance to consider what we discussed.</p>
<p>Would you be available for a quick call this week to continue our discussion?</p>
<p>Best regards,<br/>[Your Name]</p>`,
  },
  {
    id: 'introduction',
    name: 'Introduction',
    icon: '👋',
    subject: 'Introduction - [Your Name] from [Company]',
    content: `<p>Hi [Name],</p>
<p>I hope this email finds you well. My name is [Your Name] and I'm reaching out from [Company].</p>
<p>I noticed that [observation/reason for reaching out] and thought it might be valuable to connect.</p>
<p>[Brief value proposition]</p>
<p>Would you be open to a brief conversation?</p>
<p>Best regards,<br/>[Your Name]</p>`,
  },
  {
    id: 'meeting-request',
    name: 'Meeting Request',
    icon: '📅',
    subject: 'Meeting Request - [Topic]',
    content: `<p>Hi [Name],</p>
<p>I'd like to schedule a meeting to discuss [topic/purpose].</p>
<p><strong>Proposed Times:</strong></p>
<ul>
<li>[Option 1: Day, Date, Time]</li>
<li>[Option 2: Day, Date, Time]</li>
<li>[Option 3: Day, Date, Time]</li>
</ul>
<p>Please let me know which time works best for you, or suggest an alternative.</p>
<p>Best regards,<br/>[Your Name]</p>`,
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    icon: '🙏',
    subject: 'Thank you for [topic]',
    content: `<p>Hi [Name],</p>
<p>Thank you so much for [reason - meeting, opportunity, help, etc.]. I really appreciate your time and [specific thing you're grateful for].</p>
<p>[Next steps or closing thought]</p>
<p>Best regards,<br/>[Your Name]</p>`,
  },
  {
    id: 'proposal',
    name: 'Proposal',
    icon: '📄',
    subject: 'Proposal: [Project Name]',
    content: `<p>Hi [Name],</p>
<p>Thank you for the opportunity to submit this proposal for [project/service].</p>
<p><strong>Overview:</strong></p>
<p>[Brief description of what you're proposing]</p>
<p><strong>Key Deliverables:</strong></p>
<ul>
<li>[Deliverable 1]</li>
<li>[Deliverable 2]</li>
<li>[Deliverable 3]</li>
</ul>
<p><strong>Timeline:</strong> [Expected duration]</p>
<p><strong>Investment:</strong> [Price or pricing structure]</p>
<p>I'm happy to discuss this proposal in more detail at your convenience.</p>
<p>Best regards,<br/>[Your Name]</p>`,
  },
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    icon: '🎯',
    subject: '[Personalized Hook] - Quick Question',
    content: `<p>Hi [Name],</p>
<p>[Personalized opening line based on their work/company]</p>
<p>I'm reaching out because [specific reason relevant to them]. At [Your Company], we help [target audience] achieve [key benefit].</p>
<p>[Brief case study or proof point]</p>
<p>Would you be open to a 15-minute call to explore if this could be valuable for [Their Company]?</p>
<p>Best,<br/>[Your Name]</p>`,
  },
];

const AI_ACTIONS: AIAction[] = [
  { id: 'draft', label: 'Draft Reply', icon: <Wand2 size={14} />, description: 'Generate a complete reply', action: 'draft' },
  { id: 'improve', label: 'Improve Writing', icon: <Sparkles size={14} />, description: 'Enhance clarity and tone', action: 'improve' },
  { id: 'shorten', label: 'Make Shorter', icon: <RefreshCw size={14} />, description: 'Condense the message', action: 'shorten' },
  { id: 'expand', label: 'Expand', icon: <List size={14} />, description: 'Add more detail', action: 'expand' },
  { id: 'formal', label: 'More Formal', icon: <AlignCenter size={14} />, description: 'Professional tone', action: 'formal' },
  { id: 'friendly', label: 'More Friendly', icon: <Lightbulb size={14} />, description: 'Casual, warm tone', action: 'friendly' },
  { id: 'research', label: 'Research Topic', icon: <Globe size={14} />, description: 'Web search for context', action: 'research' },
  { id: 'suggest', label: 'Suggest Points', icon: <Search size={14} />, description: 'Key points to include', action: 'suggest' },
];

export const EmailComposer: React.FC<EmailComposerProps> = ({ 
  isOpen, 
  onClose, 
  replyTo, 
  defaultAccountId, 
  isInline = false,
  initialSubject = '',
  initialBody = '',
  editDraft = null,
  onDraftDeleted
}) => {
  const { workspace } = useWorkspace();
  
  // Initialize state from draft if editing, otherwise use defaults
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiActionLabel, setAiActionLabel] = useState('');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLimitError, setAiLimitError] = useState<AILimitError | null>(null);
  const [showCc, setShowCc] = useState(false);
  const [researchResults, setResearchResults] = useState<string | null>(null);
  
  // Dropdown states
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showGTMTemplateMenu, setShowGTMTemplateMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showImageSizeMenu, setShowImageSizeMenu] = useState(false);
  
  // Attachments
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);

  // Initialize form when opening or when draft changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (editDraft) {
      // Editing a draft
      setTo(editDraft.to_addresses?.join(', ') || '');
      setCc(editDraft.cc_addresses?.join(', ') || '');
      setSubject(editDraft.subject || '');
      setCurrentDraftId(editDraft.provider_message_id);
      setAttachments(editDraft.body?.attachments || []);
      setShowCc((editDraft.cc_addresses?.length || 0) > 0);
      // Set editor content after editor is ready
      setTimeout(() => {
        if (editor && editDraft.body?.html) {
          editor.commands.setContent(editDraft.body.html);
        }
      }, 100);
    } else if (replyTo) {
      // Replying to an email
      setTo(extractEmail(replyTo.from_address));
      setCc('');
      setSubject(replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`);
      setCurrentDraftId(null);
      setAttachments([]);
    } else {
      // New email
      setTo('');
      setCc('');
      setSubject(initialSubject);
      setCurrentDraftId(null);
      setAttachments([]);
      // Set initial body if provided
      if (initialBody && editor) {
        setTimeout(() => {
          editor?.commands.setContent(`<p>${initialBody.replace(/\n/g, '</p><p>')}</p>`);
        }, 100);
      }
    }
  }, [isOpen, editDraft, replyTo, initialSubject, initialBody]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [aiMenuPosition, setAiMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const aiMenuRef = useRef<HTMLDivElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const imageSizeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Rich text editor with more extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Type your message here... Use AI to help draft or improve your email.',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'email-resizable-image',
        },
      }),
      CharacterCount,
      Subscript,
      Superscript,
    ],
    content: initialBody ? `<p>${initialBody.replace(/\n/g, '</p><p>')}</p>` : '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  // Image upload handler - defined before conditional return to satisfy hook rules
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    // Convert to base64 and insert
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      editor?.chain().focus().setImage({ src: base64 }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  // File attachment handler
  const handleFileAttachment = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showError('Attachment must be less than 10MB');
      return;
    }

    setUploadingAttachment(true);
    try {
      // Upload to Supabase storage
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `email-attachments/${workspace?.id || 'temp'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setAttachments(prev => [...prev, {
        name: file.name,
        url: publicUrl,
        type: file.type,
      }]);

      showSuccess('Attachment uploaded');
    } catch (err: any) {
      console.error('[EmailComposer] Attachment upload error:', err);
      showError(`Failed to upload: ${err.message}`);
    } finally {
      setUploadingAttachment(false);
    }
  }, [workspace?.id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node) && 
          aiButtonRef.current && !aiButtonRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSizeMenu(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) {
        setShowHighlightMenu(false);
      }
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false);
      }
      if (attachmentRef.current && !attachmentRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
      if (imageSizeRef.current && !imageSizeRef.current.contains(e.target as Node)) {
        setShowImageSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle AI menu with position calculation for portal - must be before early return
  const toggleAiMenu = useCallback(() => {
    if (!showAiMenu && aiButtonRef.current) {
      const rect = aiButtonRef.current.getBoundingClientRect();
      setAiMenuPosition({
        top: rect.top - 8, // Position above the button
        left: rect.right - 256, // Align right edge (menu width is 256px / w-64)
      });
    }
    setShowAiMenu(!showAiMenu);
  }, [showAiMenu]);

  // Early return after all hooks
  if (!isOpen) return null;

  // Helper functions
  function extractEmail(str: string) {
    const match = str?.match(/<(.+)>/);
    return match ? match[1] : str || '';
  }

  const getEditorHtml = () => {
    return editor?.getHTML() || '';
  };

  const getEditorText = () => {
    return editor?.getText() || '';
  };

  const setEditorContent = (html: string) => {
    editor?.commands.setContent(html);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const applyTemplate = (template: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(template.subject);
    setEditorContent(template.content);
    setShowTemplateMenu(false);
    showSuccess(`Applied "${template.name}" template`);
  };

  const applyGTMTemplate = (template: DocumentTemplate) => {
    // For GTM templates, we extract just the text content and convert to email-friendly format
    const emailContent = template.content
      .replace(/<h1>/g, '<p style="font-size: 24px; font-weight: bold;">')
      .replace(/<\/h1>/g, '</p>')
      .replace(/<h2>/g, '<p style="font-size: 18px; font-weight: bold; margin-top: 16px;">')
      .replace(/<\/h2>/g, '</p>')
      .replace(/<h3>/g, '<p style="font-size: 16px; font-weight: bold; margin-top: 12px;">')
      .replace(/<\/h3>/g, '</p>');

    setEditorContent(emailContent);
    setShowGTMTemplateMenu(false);
    showSuccess(`Applied "${template.name}" template`);
  };

  const handleSend = async () => {
    if (!to.trim()) {
      showError('Please enter a recipient');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-api?action=send_email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: defaultAccountId || replyTo?.account_id,
          to: to.split(',').map(e => e.trim()),
          cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
          subject,
          htmlBody: getEditorHtml(),
          attachments: attachments.length > 0 ? attachments : undefined,
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to send');
      }
      
      // If we were editing a draft, delete it after successful send
      if (currentDraftId && defaultAccountId) {
        await supabase
          .from('email_messages')
          .delete()
          .eq('provider_message_id', currentDraftId)
          .eq('account_id', defaultAccountId);
        onDraftDeleted?.();
      }
      
      onClose();
      showSuccess('Email sent successfully!');
    } catch (err: any) {
      console.error(err);
      showError(`Failed to send email: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    const bodyContent = getEditorHtml();
    const textContent = getEditorText();
    
    // Check if there's any content to save
    if (!subject.trim() && !textContent.trim() && !to.trim()) {
      showError('Nothing to save - add a recipient, subject, or message');
      return;
    }

    setSavingDraft(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const accountId = defaultAccountId || replyTo?.account_id;
      
      if (!accountId) {
        showError('No email account selected');
        setSavingDraft(false);
        return;
      }
      
      // Use existing draft ID if editing, otherwise generate new one
      const draftId = currentDraftId || `draft-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Save to email_messages table with DRAFT folder
      const { error } = await supabase.from('email_messages').upsert({
        account_id: accountId,
        provider_message_id: draftId,
        thread_id: replyTo?.thread_id || null,
        subject: subject || '(No Subject)',
        snippet: textContent.slice(0, 200),
        from_address: session.user.email,
        to_addresses: to ? to.split(',').map(e => e.trim()).filter(Boolean) : [],
        cc_addresses: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        folder_id: 'DRAFT',
        is_read: true,
        is_draft: true,
        has_attachments: attachments.length > 0,
        received_at: new Date().toISOString(),
        body: { html: bodyContent, text: textContent, attachments },
      }, {
        onConflict: 'account_id,provider_message_id'
      });

      if (error) throw error;
      
      // Update the current draft ID so subsequent saves update the same draft
      setCurrentDraftId(draftId);
      
      showSuccess('Draft saved!');
    } catch (err: any) {
      console.error('[EmailComposer] Save draft error:', err);
      showError(`Failed to save draft: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const cleanContent = (text: string) => {
    return (text || '')
      .replace(/System:/gi, 'Sys:')
      .replace(/User:/gi, 'Usr:')
      .replace(/Assistant:/gi, 'Asst:')
      .replace(/<\|im_start\|>/gi, '')
      .replace(/<\|im_end\|>/gi, '');
  };

  const handleAiAction = async (action: AIAction['action']) => {
    setAiProcessing(true);
    setAiActionLabel(AI_ACTIONS.find(a => a.action === action)?.label || 'Processing');
    setShowAiMenu(false);

    try {
      const currentContent = getEditorText();
      const emailContext = replyTo ? `
Original Email:
From: ${replyTo.from_address || 'Unknown'}
Subject: ${replyTo.subject || 'No Subject'}
Content: ${cleanContent(replyTo.body?.text || replyTo.snippet || '')}
` : '';

      let systemPrompt = '';
      let userPrompt = '';

      switch (action) {
        case 'draft':
          systemPrompt = `You are an expert email assistant. Draft a professional and concise reply to the email provided.
Your output should be ONLY the body of the email reply in HTML format.
Do not include subject line or email headers.
Use <p> tags for paragraphs. Keep it professional yet personable.`;
          userPrompt = `${emailContext}\n\nDraft a reply to this email.`;
          break;

        case 'improve':
          systemPrompt = `You are an expert writing assistant. Improve the following email draft for clarity, professionalism, and impact.
Maintain the original intent but enhance the writing quality. Return only the improved HTML content.`;
          userPrompt = `Improve this email draft:\n\n${currentContent}`;
          break;

        case 'shorten':
          systemPrompt = `You are an expert editor. Condense the following email while maintaining all key points.
Make it more concise and scannable. Return only the shortened HTML content.`;
          userPrompt = `Shorten this email:\n\n${currentContent}`;
          break;

        case 'expand':
          systemPrompt = `You are an expert writing assistant. Expand the following email with more detail, context, and supporting points.
Make it more comprehensive while staying focused. Return only the expanded HTML content.`;
          userPrompt = `Expand this email with more detail:\n\n${currentContent}`;
          break;

        case 'formal':
          systemPrompt = `You are an expert business writer. Rewrite the following email in a more formal, professional tone.
Suitable for executive communication. Return only the rewritten HTML content.`;
          userPrompt = `Make this email more formal:\n\n${currentContent}`;
          break;

        case 'friendly':
          systemPrompt = `You are an expert communication coach. Rewrite the following email in a warmer, more friendly tone.
Keep it professional but personable. Return only the rewritten HTML content.`;
          userPrompt = `Make this email friendlier:\n\n${currentContent}`;
          break;

        case 'research':
          await handleWebResearch();
          return;

        case 'suggest':
          systemPrompt = `You are an expert email strategist. Based on the email context, suggest 3-5 key points that should be included in the reply.
Format as a bulleted list. Consider: goals, objections to address, questions to answer, next steps, and relationship building.`;
          userPrompt = `${emailContext}\n\nCurrent draft:\n${currentContent}\n\nSuggest key points to include in the reply.`;
          break;
      }

      const history: Content[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
      const response = await getAiResponse(history, systemPrompt, false, workspace?.id, 'email');

      if (response.candidates && response.candidates.length > 0) {
        const result = response.candidates[0].content.parts[0].text || '';
        
        if (action === 'suggest') {
          setResearchResults(result);
        } else {
          const htmlContent = result.includes('<p>') ? result : `<p>${result.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
          setEditorContent(htmlContent);
        }
        showSuccess(`${AI_ACTIONS.find(a => a.action === action)?.label} complete!`);
      } else {
        showError('AI could not generate a response. Please try again.');
      }
    } catch (e: any) {
      console.error('[EmailComposer] AI action error:', e);
      if (e instanceof AILimitError) {
        setAiLimitError(e);
        showError(`AI limit reached: ${e.usage}/${e.limit} requests used on ${e.planType} plan. Upgrade for unlimited AI.`);
      } else {
        showError(`AI action failed: ${e.message}`);
      }
    } finally {
      setAiProcessing(false);
      setAiActionLabel('');
    }
  };

  const handleWebResearch = async () => {
    try {
      const topic = subject || replyTo?.subject || getEditorText().slice(0, 100);
      
      if (!topic.trim()) {
        showError('Please add a subject or content to research');
        setAiProcessing(false);
        setAiActionLabel('');
        return;
      }

      const searchResults = await searchWeb(topic, 'search', { count: 5 });

      if (searchResults?.hits?.length) {
        let researchSummary = '### Web Research Results\n\n';
        
        searchResults.hits.slice(0, 5).forEach((hit: any, i: number) => {
          researchSummary += `${i + 1}. **${hit.title || 'Untitled'}**\n`;
          if (hit.description) {
            researchSummary += `   ${hit.description}\n`;
          }
          if (hit.url) {
            researchSummary += `   [Source](${hit.url})\n`;
          }
          researchSummary += '\n';
        });

        setResearchResults(researchSummary);
        showSuccess('Research complete! See results below.');
      } else {
        showError('No research results found. Try a different topic.');
      }
    } catch (e: any) {
      console.error('[EmailComposer] Research error:', e);
      showError(`Research failed: ${e.message}`);
    } finally {
      setAiProcessing(false);
      setAiActionLabel('');
    }
  };

  const insertResearchIntoEmail = () => {
    if (researchResults) {
      const currentHtml = getEditorHtml();
      const researchHtml = `<p><br/></p><p><strong>Research Notes:</strong></p><p>${researchResults.replace(/\n/g, '<br/>')}</p>`;
      setEditorContent(currentHtml + researchHtml);
      setResearchResults(null);
      showSuccess('Research inserted into email');
    }
  };

  // Toolbar button component for consistent styling
  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    disabled, 
    title, 
    children,
    className = ''
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean;
    title: string; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-1.5 rounded-md transition-all duration-150
        ${isActive 
          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={title}
    >
      {children}
    </button>
  );

  // Dropdown button with indicator
  const DropdownButton = ({
    onClick,
    isOpen,
    title,
    children,
    indicator,
  }: {
    onClick: () => void;
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
    indicator?: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-0.5 p-1.5 rounded-md transition-all duration-150
        ${isOpen 
          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
      title={title}
    >
      {children}
      {indicator}
      <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  const EditorToolbar = () => (
    <div className="border-b border-gray-200 bg-gray-50/80 relative z-40 overflow-visible">
      {/* Main Toolbar Row */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap overflow-visible">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Font Size Dropdown */}
        <div className="relative" ref={fontSizeRef}>
          <DropdownButton
            onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
            isOpen={showFontSizeMenu}
            title="Font Size"
          >
            <Type size={16} />
          </DropdownButton>
          {showFontSizeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[120px] z-50">
              {FONT_SIZES.map(size => (
                <button
                  key={size.value}
                  onClick={() => {
                    editor?.chain().focus().setMark('textStyle', { fontSize: size.value }).run();
                    setShowFontSizeMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                  style={{ fontSize: size.value }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editor?.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Text Color Dropdown */}
        <div className="relative" ref={colorRef}>
          <DropdownButton
            onClick={() => setShowColorMenu(!showColorMenu)}
            isOpen={showColorMenu}
            title="Text Color"
            indicator={
              <div 
                className="w-3 h-3 rounded-sm border border-gray-300" 
                style={{ backgroundColor: editor?.getAttributes('textStyle').color || '#000000' }}
              />
            }
          >
            <Palette size={16} />
          </DropdownButton>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
              <div className="grid grid-cols-3 gap-1">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => {
                      editor?.chain().focus().setColor(color.value).run();
                      setShowColorMenu(false);
                    }}
                    className="w-8 h-8 rounded-md border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: color.value === '#000000' ? 'white' : color.value }}
                    title={color.label}
                  >
                    {color.value === '#000000' && <span className="text-xs">A</span>}
                    {editor?.getAttributes('textStyle').color === color.value && (
                      <Check size={14} className="text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight Dropdown */}
        <div className="relative" ref={highlightRef}>
          <DropdownButton
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            isOpen={showHighlightMenu}
            title="Highlight"
            indicator={
              editor?.isActive('highlight') ? (
                <div 
                  className="w-3 h-3 rounded-sm border border-gray-300" 
                  style={{ backgroundColor: editor?.getAttributes('highlight').color || '#FEF08A' }}
                />
              ) : null
            }
          >
            <Highlighter size={16} />
          </DropdownButton>
          {showHighlightMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
              <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color.value || 'none'}
                    onClick={() => {
                      if (color.value) {
                        editor?.chain().focus().toggleHighlight({ color: color.value }).run();
                      } else {
                        editor?.chain().focus().unsetHighlight().run();
                      }
                      setShowHighlightMenu(false);
                    }}
                    className="w-8 h-8 rounded-md border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: color.value || 'white' }}
                    title={color.label}
                  >
                    {!color.value && <X size={14} className="text-gray-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          isActive={editor?.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          isActive={editor?.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          isActive={editor?.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Insert Actions */}
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor?.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor?.isActive('link')}
          title="Add Link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => imageInputRef.current?.click()}
          title="Insert Image"
        >
          <ImageIcon size={16} />
        </ToolbarButton>
        
        {/* Image Size Controls - Only show when image is selected */}
        {editor?.isActive('image') && (
          <div className="relative" ref={imageSizeRef}>
            <DropdownButton
              onClick={() => setShowImageSizeMenu(!showImageSizeMenu)}
              isOpen={showImageSizeMenu}
              title="Resize Image"
            >
              <Maximize2 size={16} />
            </DropdownButton>
            {showImageSizeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px] z-50">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Image Size</div>
                <button
                  onClick={() => {
                    // Get current selection and update image width
                    const { state } = editor;
                    const { selection } = state;
                    const node = state.doc.nodeAt(selection.from);
                    if (node?.type.name === 'image') {
                      editor.chain().focus().updateAttributes('image', { 
                        class: 'email-resizable-image size-small'
                      }).run();
                    }
                    setShowImageSizeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
                >
                  <Minimize2 size={14} />
                  Small (200px)
                </button>
                <button
                  onClick={() => {
                    const { state } = editor;
                    const { selection } = state;
                    const node = state.doc.nodeAt(selection.from);
                    if (node?.type.name === 'image') {
                      editor.chain().focus().updateAttributes('image', { 
                        class: 'email-resizable-image size-medium'
                      }).run();
                    }
                    setShowImageSizeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
                >
                  <Square size={14} />
                  Medium (400px)
                </button>
                <button
                  onClick={() => {
                    const { state } = editor;
                    const { selection } = state;
                    const node = state.doc.nodeAt(selection.from);
                    if (node?.type.name === 'image') {
                      editor.chain().focus().updateAttributes('image', { 
                        class: 'email-resizable-image size-large'
                      }).run();
                    }
                    setShowImageSizeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
                >
                  <Maximize2 size={14} />
                  Large (600px)
                </button>
                <button
                  onClick={() => {
                    const { state } = editor;
                    const { selection } = state;
                    const node = state.doc.nodeAt(selection.from);
                    if (node?.type.name === 'image') {
                      editor.chain().focus().updateAttributes('image', { 
                        class: 'email-resizable-image size-full'
                      }).run();
                    }
                    setShowImageSizeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
                >
                  <Maximize2 size={14} className="text-blue-600" />
                  Full Width
                </button>
              </div>
            )}
          </div>
        )}

        <ToolbarButton
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <HrIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Attachment Button */}
        <div className="relative" ref={attachmentRef}>
          <DropdownButton
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            isOpen={showAttachmentMenu}
            title="Attachments"
          >
            <Paperclip size={16} />
            {attachments.length > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 rounded-full">
                {attachments.length}
              </span>
            )}
          </DropdownButton>
          {showAttachmentMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
              >
                <FileUp size={16} />
                {uploadingAttachment ? 'Uploading...' : 'Attach File'}
              </button>
              {attachments.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="text-xs text-gray-500 px-3 mb-1">Attached Files</div>
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 rounded">
                      <span className="truncate flex-1 mr-2">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="relative" ref={templateRef}>
          <DropdownButton
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            isOpen={showTemplateMenu}
            title="Email Templates"
          >
            <LayoutTemplate size={16} />
          </DropdownButton>
          {showTemplateMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[220px] z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                Email Templates
              </div>
              {EMAIL_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <span className="text-lg">{template.icon}</span>
                  <span className="text-sm font-medium text-gray-800">{template.name}</span>
                </button>
              ))}
              <div className="border-t border-gray-200 mt-1">
                <button
                  onClick={() => {
                    setShowTemplateMenu(false);
                    setShowGTMTemplateMenu(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left text-blue-600"
                >
                  <FileText size={16} />
                  <span className="text-sm font-medium">Browse GTM Templates...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Actions Button */}
        <div className="relative">
          <button
            ref={aiButtonRef}
            type="button"
            onClick={toggleAiMenu}
            disabled={aiProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            {aiProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{aiActionLabel}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>AI Assist</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-500 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          {editor?.isActive('bold') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Bold</span>}
          {editor?.isActive('italic') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Italic</span>}
          {editor?.isActive('underline') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Underline</span>}
          {editor?.isActive('link') && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Link</span>}
          {editor?.isActive('bulletList') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Bullet List</span>}
          {editor?.isActive('orderedList') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Numbered List</span>}
        </div>
        <div>
          {editor?.storage.characterCount?.characters()} characters
        </div>
      </div>
    </div>
  );

  // Hidden file inputs
  const FileInputs = () => (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileAttachment(file);
          e.target.value = '';
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />
    </>
  );

  // GTM Template Modal
  const GTMTemplateModal = () => {
    if (!showGTMTemplateMenu) return null;
    
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">GTM Document Templates</h3>
            <button
              onClick={() => setShowGTMTemplateMenu(false)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <p className="text-sm text-gray-600 mb-4">
              Select a GTM template to use as a starting point for your email.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {GTM_TEMPLATES.slice(0, 12).map(template => (
                <button
                  key={template.id}
                  onClick={() => applyGTMTemplate(template)}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 text-left transition-colors"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const content = (
    <div className={`bg-white w-full flex flex-col ${isInline ? 'h-full border-none shadow-none' : 'max-w-4xl max-h-[85vh] min-h-[500px] shadow-2xl border border-gray-200 rounded-xl animate-in fade-in zoom-in duration-200'}`}>
      <FileInputs />
      <GTMTemplateModal />
      
      {/* Header */}
      {!isInline && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
          <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            {replyTo ? 'Reply' : 'New Message'}
            <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={10} />
              AI-Powered
            </span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* To/Cc/Subject Fields */}
        <div className="p-4 space-y-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-500 w-16">To</label>
            <input 
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                +Cc
              </button>
            )}
          </div>
          
          {showCc && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-500 w-16">Cc</label>
              <input 
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={cc}
                onChange={e => setCc(e.target.value)}
                placeholder="cc@example.com"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-500 w-16">Subject</label>
            <input 
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject line"
            />
          </div>
        </div>

        {/* AI Limit Warning Banner */}
        {aiLimitError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mx-4 mt-2 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 text-sm">AI Limit Reached</h4>
              <p className="text-xs text-yellow-700 mt-1">
                You've used <strong>{aiLimitError.usage}/{aiLimitError.limit}</strong> AI requests on the <strong>{aiLimitError.planType}</strong> plan.
                Upgrade to Power ($49/mo) or Team Pro ($99/mo) for unlimited AI features.
              </p>
              <button
                onClick={() => setAiLimitError(null)}
                className="mt-2 text-xs text-yellow-700 underline hover:text-yellow-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Editor Toolbar */}
        <EditorToolbar />

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <EditorContent editor={editor} className="h-full" />
        </div>

        {/* Attachments Bar */}
        {attachments.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Attachments:</span>
              {attachments.map((file, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 text-xs"
                >
                  <Paperclip size={12} className="text-gray-400" />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research Results Panel */}
        {researchResults && (
          <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Globe size={14} />
                Research & Suggestions
              </span>
              <div className="flex gap-2">
                <button
                  onClick={insertResearchIntoEmail}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                >
                  Insert into Email
                </button>
                <button
                  onClick={() => setResearchResults(null)}
                  className="text-xs px-3 py-1.5 text-gray-600 hover:bg-white/50 rounded-lg"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white/50 rounded-lg p-3">
              {researchResults}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t border-gray-100 bg-gray-50/80 flex justify-between items-center flex-shrink-0 ${!isInline ? 'rounded-b-xl' : ''}`}>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{editor?.storage.characterCount?.characters() || 0} characters</span>
          {attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={12} />
              {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveDraft}
            disabled={savingDraft || sending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {savingDraft ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={handleSend}
            disabled={sending || savingDraft || !to.trim()}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow transition-all"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );

  // AI Menu Portal - rendered outside the modal to avoid overflow clipping
  const aiMenuPortal = showAiMenu && !aiProcessing && aiMenuPosition && createPortal(
    <div 
      ref={aiMenuRef}
      className="fixed w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[10000] max-h-[300px] overflow-y-auto"
      style={{ 
        top: Math.max(8, aiMenuPosition.top - 300), // Position above button, keep in viewport
        left: Math.max(8, aiMenuPosition.left),
      }}
    >
      {AI_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => handleAiAction(action.action)}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 text-left transition-colors"
        >
          <span className="text-purple-600 p-1.5 bg-purple-100 rounded">{action.icon}</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{action.label}</div>
            <div className="text-xs text-gray-500">{action.description}</div>
          </div>
        </button>
      ))}
    </div>,
    document.body
  );

  if (isInline) {
    return (
      <>
        {content}
        {aiMenuPortal}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
      {content}
      {aiMenuPortal}
    </div>
  );
};
