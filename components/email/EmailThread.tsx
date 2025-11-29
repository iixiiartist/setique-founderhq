import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { EmailComposer } from './EmailComposer';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../lib/services/database';
import { getAiResponse, Content, AILimitError } from '../../services/groqService';
import { showSuccess, showError } from '../../lib/utils/toast';
import { fixEmailEncoding, fixHtmlEncoding } from '../../lib/utils/textDecoder';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { Paperclip, Download, FolderPlus, Loader2, FileText, Image, File, UserPlus, X, Check } from 'lucide-react';

interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface ExtractedContact {
  name: string;
  email: string;
  phone?: string;
  title?: string;
  company?: string;
  linkedin?: string;
}

interface EmailThreadProps {
  messageId: string;
  onClose: () => void;
}

export const EmailThread: React.FC<EmailThreadProps> = ({ messageId, onClose }) => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [processingAi, setProcessingAi] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [savingAttachment, setSavingAttachment] = useState<string | null>(null);
  const [aiLimitError, setAiLimitError] = useState<AILimitError | null>(null);
  
  // Contact extraction state
  const [extractedContacts, setExtractedContacts] = useState<ExtractedContact[]>([]);
  const [showContactsPanel, setShowContactsPanel] = useState(false);
  const [savingContact, setSavingContact] = useState<string | null>(null);
  const [savedContacts, setSavedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMessageDetails();
  }, [messageId]);

    const cleanEmailContent = (text: string) => {
        // Remove potential prompt injection triggers
        return text
            .replace(/System:/gi, 'Sys:')
            .replace(/User:/gi, 'Usr:')
            .replace(/Assistant:/gi, 'Asst:')
            .replace(/<\|im_start\|>/gi, '')
            .replace(/<\|im_end\|>/gi, '')
            .replace(/\[INST\]/gi, '')
            .replace(/\[\/INST\]/gi, '');
    };

    const handleCreateTask = async () => {
    if (!data) return;
    setProcessingAi(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const workspaceId = data.integrated_accounts.workspace_id;

        // Enhanced prompt to extract dates/times for calendar visibility
        const systemPrompt = `You are an intelligent assistant. Extract task details from the email and call the 'createTask' tool. 
        
IMPORTANT: If the email mentions any dates, times, deadlines, or scheduled events, make sure to extract them and include them as the dueDate (format: YYYY-MM-DD) and dueTime (format: HH:MM in 24-hour). 
If the date is relative (like 'tomorrow', 'next week', 'Friday'), calculate the actual date based on today's date: ${new Date().toISOString().split('T')[0]}.
Tasks with dates will automatically appear on the calendar.`;
        
        const cleanedBody = cleanEmailContent(data.body?.text || data.snippet);
        const userPrompt = `
        Sender: ${data.from_address}
        Subject: ${data.subject}
        Body: ${cleanedBody}
        
        Create a task from this email. Extract any dates/deadlines mentioned so the task appears on the calendar.`;

        const history: Content[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
        
        const response = await getAiResponse(history, systemPrompt, true, workspaceId, 'tasks');

        if (response.functionCalls && response.functionCalls.length > 0) {
            for (const call of response.functionCalls) {
                if (call.name === 'createTask') {
                    const args = call.args;
                    await DatabaseService.createTask(session.user.id, {
                        category: args.category || 'productsServicesTasks',
                        text: args.text,
                        priority: args.priority || 'Medium',
                        due_date: args.dueDate,
                        assigned_to: args.assignedTo,
                        status: 'Todo'
                    } as any, workspaceId);
                    
                    // Show appropriate success message
                    if (args.dueDate) {
                        showSuccess('Task created and added to calendar!');
                    } else {
                        showSuccess('Task created successfully!');
                    }
                }
            }
        } else {
            showError('AI could not extract a task.');
        }
    } catch (e: any) {
        console.error(e);
        if (e instanceof AILimitError) {
            setAiLimitError(e);
            showError(`AI limit reached: ${e.usage}/${e.limit} requests used. Upgrade for unlimited AI.`);
        } else {
            showError(`Failed to create task: ${e.message}`);
        }
    } finally {
        setProcessingAi(false);
    }
  };

    const handleSummarize = async () => {
    if (!data) return;
    setProcessingAi(true);
    console.log('[EmailThread] Starting summarization...');
    try {
        const workspaceId = data.integrated_accounts?.workspace_id;
        console.log('[EmailThread] workspaceId:', workspaceId);
        
        if (!workspaceId) {
            showError('Unable to determine workspace. Please refresh the page.');
            return;
        }
        
        const systemPrompt = `You are a helpful assistant. Summarize the following email thread concisely in 2-3 sentences.`;
        const cleanedBody = cleanEmailContent(data.body?.text || data.snippet || '');
        console.log('[EmailThread] Email body length:', cleanedBody.length);
        
        const userPrompt = `Please summarize this email:
        
From: ${data.from_address}
Subject: ${data.subject}
Content: ${cleanedBody}`;

        const history: Content[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
        
        console.log('[EmailThread] Calling getAiResponse...');
        // We don't need tools for summarization, just text generation
        const response = await getAiResponse(history, systemPrompt, false, workspaceId, 'email');
        console.log('[EmailThread] AI Response received:', JSON.stringify(response, null, 2));

        if (response.candidates && response.candidates.length > 0) {
            const summaryText = response.candidates[0]?.content?.parts?.[0]?.text;
            console.log('[EmailThread] Summary text:', summaryText);
            
            if (summaryText && summaryText.trim()) {
                setSummary(summaryText);
                showSuccess('Summary generated!');
            } else {
                console.error('[EmailThread] Empty summary text received');
                setSummary('Unable to generate summary. The email content may be too short or the AI service returned an empty response.');
                showError('Summary was empty. Please try again.');
            }
        } else {
            console.error('[EmailThread] No candidates in response:', response);
            setSummary('No summary could be generated. Please try again.');
            showError('No summary was generated. Please try again.');
        }
    } catch (e: any) {
        console.error('[EmailThread] Summarization error:', e);
        if (e instanceof AILimitError) {
            setAiLimitError(e);
            showError(`AI limit reached: ${e.usage}/${e.limit} requests used. Upgrade for unlimited AI.`);
        } else {
            showError(`Failed to summarize: ${e.message}`);
        }
    } finally {
        setProcessingAi(false);
    }
  };

  // Scan email for contacts using AI
  const handleScanForContacts = async () => {
    if (!data) return;
    setProcessingAi(true);
    setShowContactsPanel(false);
    setExtractedContacts([]);
    
    try {
      const workspaceId = data.integrated_accounts?.workspace_id;
      if (!workspaceId) {
        showError('Unable to determine workspace. Please refresh the page.');
        return;
      }

      const systemPrompt = `You are a contact extraction assistant. Analyze the email and extract any contact information mentioned.

Look for:
- Names of people (from signature, mentioned in text, CC'd)
- Email addresses
- Phone numbers
- Job titles/roles
- Company names
- LinkedIn URLs

Return a JSON array of contacts found. Each contact should have these fields (include only if found):
- name (required): Full name of the person
- email (required): Email address
- phone: Phone number
- title: Job title or role
- company: Company or organization name
- linkedin: LinkedIn profile URL

Return ONLY the JSON array, nothing else. Example:
[{"name": "John Smith", "email": "john@company.com", "title": "Sales Manager", "company": "Acme Inc"}]

If no contacts are found, return an empty array: []`;

      const cleanedBody = cleanEmailContent(data.body?.text || data.snippet || '');
      
      // Also include the sender info
      const senderInfo = `From: ${data.from_address}`;
      const toInfo = data.to_addresses?.length ? `To: ${data.to_addresses.join(', ')}` : '';
      const ccInfo = data.cc_addresses?.length ? `CC: ${data.cc_addresses.join(', ')}` : '';
      
      const userPrompt = `Extract contacts from this email:

${senderInfo}
${toInfo}
${ccInfo}
Subject: ${data.subject}

Body:
${cleanedBody}

Return the JSON array of contacts found.`;

      const history: Content[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
      
      const response = await getAiResponse(history, systemPrompt, false, workspaceId, 'email');

      if (response.candidates && response.candidates.length > 0) {
        const responseText = response.candidates[0]?.content?.parts?.[0]?.text || '';
        
        // Try to parse JSON from response
        let contacts: ExtractedContact[] = [];
        try {
          // Extract JSON array from response
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            contacts = JSON.parse(jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error('[EmailThread] Failed to parse contacts JSON:', parseErr);
        }

        if (contacts.length > 0) {
          setExtractedContacts(contacts);
          setShowContactsPanel(true);
          showSuccess(`Found ${contacts.length} contact${contacts.length > 1 ? 's' : ''}`);
        } else {
          showError('No contacts found in this email');
        }
      } else {
        showError('Failed to analyze email for contacts');
      }
    } catch (e: any) {
      console.error('[EmailThread] Contact extraction error:', e);
      if (e instanceof AILimitError) {
        setAiLimitError(e);
        showError(`AI limit reached: ${e.usage}/${e.limit} requests used.`);
      } else {
        showError(`Failed to scan for contacts: ${e.message}`);
      }
    } finally {
      setProcessingAi(false);
    }
  };

  // Add extracted contact to CRM
  const handleAddContactToCRM = async (contact: ExtractedContact) => {
    if (!workspace?.id || !user?.id) {
      showError('Please ensure you are logged in');
      return;
    }

    const contactKey = contact.email;
    setSavingContact(contactKey);

    try {
      const { data: newContact, error } = await DatabaseService.createContact(user.id, workspace.id, {
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        title: contact.title || null,
        linkedin: contact.linkedin || '',
        tags: ['from-email'],
      });

      if (error) throw error;

      if (newContact) {
        setSavedContacts(prev => new Set(prev).add(contactKey));
        showSuccess(`Added "${contact.name}" to CRM`);
      }
    } catch (err: any) {
      console.error('[EmailThread] Add contact error:', err);
      showError(`Failed to add contact: ${err.message}`);
    } finally {
      setSavingContact(null);
    }
  };

  // Download attachment to user's device
  const handleDownloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-api?action=get_attachment&messageId=${messageId}&attachmentId=${attachment.id}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );
      
      if (!res.ok) throw new Error('Failed to fetch attachment');
      
      const { data: base64Data } = await res.json();
      
      // Convert base64 to blob and download
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.mimeType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess(`Downloaded ${attachment.filename}`);
    } catch (err: any) {
      console.error('[EmailThread] Download error:', err);
      showError(`Failed to download: ${err.message}`);
    }
  };

  // Save attachment to file library
  const handleSaveToLibrary = async (attachment: EmailAttachment) => {
    if (!workspace?.id || !user?.id) {
      showError('Please ensure you are logged in');
      return;
    }
    
    setSavingAttachment(attachment.id);
    try {
      // Fetch the attachment data
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-api?action=get_attachment&messageId=${messageId}&attachmentId=${attachment.id}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );
      
      if (!res.ok) throw new Error('Failed to fetch attachment');
      
      const { data: base64Data } = await res.json();
      
      // Create document in the file library
      const { data: newDoc, error } = await DatabaseService.createDocument(user.id, workspace.id, {
        name: attachment.filename,
        content: base64Data,
        mime_type: attachment.mimeType,
        size: attachment.size,
        tags: ['email-attachment'],
      });
      
      if (error) throw error;
      
      if (newDoc) {
        showSuccess(`Saved "${attachment.filename}" to File Library`);
      } else {
        throw new Error('Failed to create document');
      }
    } catch (err: any) {
      console.error('[EmailThread] Save to library error:', err);
      showError(`Failed to save: ${err.message}`);
    } finally {
      setSavingAttachment(null);
    }
  };

  // Helper to get icon for attachment type
  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) 
      return <FileText size={16} className="text-red-500" />;
    return <File size={16} className="text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fetchMessageDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-api?action=get_message&id=${messageId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch message');
      
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-gray-500">Loading message...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-8 bg-white flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <div className="text-gray-900 font-medium mb-2">Error loading message</div>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={onClose} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">{fixEmailEncoding(data.subject)}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {data.from_address.charAt(0).toUpperCase()}
            </div>
            <div>
                <div className="font-medium text-gray-900 text-sm">
                    {data.from_address.replace(/<.*>/, '').trim()}
                </div>
                <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(data.received_at), { addSuffix: true })}
                </div>
            </div>
          </div>
          
          {/* AI Actions Toolbar */}
          <div className="flex gap-2 flex-wrap">
            <button 
                onClick={handleSummarize}
                disabled={processingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
                title="Summarize with AI"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Summarize
            </button>
            <button 
                onClick={handleCreateTask}
                disabled={processingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
                title="Create Task (with date = appears on calendar)"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Create Task
            </button>
            <button 
                onClick={handleScanForContacts}
                disabled={processingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:text-purple-900 transition-colors disabled:opacity-50"
                title="Scan for contacts to add to CRM"
            >
                <UserPlus className="w-3.5 h-3.5" />
                Scan Contacts
            </button>
          </div>
        </div>
      </div>

      {/* AI Limit Warning Banner */}
      {aiLimitError && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
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

      {/* AI Summary Section - Dedicated Space */}
      {(processingAi || summary) && (
        <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 animate-in slide-in-from-top-2">
            {processingAi ? (
                <div className="flex items-center gap-3 text-blue-600">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Processing...</span>
                </div>
            ) : summary ? (
                <div className="relative">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Summary
                        </h3>
                        <button 
                            onClick={() => setSummary(null)}
                            className="text-blue-400 hover:text-blue-600 p-1 hover:bg-blue-100 rounded"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                        {summary}
                    </div>
                </div>
            ) : null}
        </div>
      )}

      {/* Extracted Contacts Panel */}
      {showContactsPanel && extractedContacts.length > 0 && (
        <div className="px-6 py-4 bg-purple-50/50 border-b border-purple-100">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Found {extractedContacts.length} Contact{extractedContacts.length > 1 ? 's' : ''}
            </h3>
            <button 
              onClick={() => setShowContactsPanel(false)}
              className="text-purple-400 hover:text-purple-600 p-1 hover:bg-purple-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {extractedContacts.map((contact, idx) => {
              const contactKey = contact.email;
              const isSaved = savedContacts.has(contactKey);
              const isSaving = savingContact === contactKey;
              
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {contact.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {contact.email}
                      {contact.title && ` • ${contact.title}`}
                      {contact.company && ` at ${contact.company}`}
                    </div>
                    {contact.phone && (
                      <div className="text-xs text-gray-400">{contact.phone}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddContactToCRM(contact)}
                    disabled={isSaving || isSaved}
                    className={`ml-3 p-2 rounded-lg transition-colors ${
                      isSaved 
                        ? 'bg-green-100 text-green-600 cursor-default' 
                        : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                    } disabled:opacity-50`}
                    title={isSaved ? 'Added to CRM' : 'Add to CRM'}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSaved ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-white relative">
        {data.body?.html ? (
            <div className="w-full min-h-[500px] bg-white rounded-lg border border-gray-100 overflow-hidden">
                <iframe 
                    srcDoc={fixHtmlEncoding(data.body.html)}
                    className="w-full h-full min-h-[600px]"
                    sandbox="allow-scripts allow-popups"
                    title="Email Content"
                    style={{ border: 'none', width: '100%', height: '100%' }}
                />
            </div>
        ) : (
            <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {fixEmailEncoding(data.body?.text || data.snippet)}
            </div>
        )}
      </div>

      {/* Attachments Section */}
      {data.attachments && data.attachments.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {data.attachments.length} Attachment{data.attachments.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-2">
            {data.attachments.map((attachment: EmailAttachment) => (
              <div 
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getAttachmentIcon(attachment.mimeType)}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleSaveToLibrary(attachment)}
                    disabled={savingAttachment === attachment.id}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Save to File Library"
                  >
                    {savingAttachment === attachment.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <FolderPlus size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply Box */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        {!isComposerOpen ? (
            <button 
                onClick={() => setIsComposerOpen(true)}
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-lg text-left text-gray-500 text-sm hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Click to reply...
            </button>
        ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-xs font-medium text-gray-500">Replying to {data.from_address}</span>
                    <button onClick={() => setIsComposerOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <EmailComposer 
                    isOpen={true}
                    replyTo={data} 
                    onClose={() => setIsComposerOpen(false)}
                    isInline={true}
                />
            </div>
        )}
      </div>
    </div>
  );
};
