import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { EmailComposer } from './EmailComposer';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../lib/services/database';
import { getAiResponse, Content } from '../../services/groqService';
import { showSuccess, showError } from '../../lib/utils/toast';
import { fixEmailEncoding, fixHtmlEncoding } from '../../lib/utils/textDecoder';

interface EmailThreadProps {
  messageId: string;
  onClose: () => void;
}

export const EmailThread: React.FC<EmailThreadProps> = ({ messageId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [processingAi, setProcessingAi] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

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
        showError(`Failed to create task: ${e.message}`);
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
        showError(`Failed to summarize: ${e.message}`);
    } finally {
        setProcessingAi(false);
    }
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
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>

      {/* AI Summary Section - Dedicated Space */}
      {(processingAi || summary) && (
        <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 animate-in slide-in-from-top-2">
            {processingAi ? (
                <div className="flex items-center gap-3 text-blue-600">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Generating summary...</span>
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-white relative">
        {data.body?.html ? (
            <div className="w-full min-h-[500px] bg-white rounded-lg border border-gray-100 overflow-hidden">
                <iframe 
                    srcDoc={fixHtmlEncoding(data.body.html)}
                    className="w-full h-full min-h-[600px]"
                    sandbox="allow-same-origin allow-popups allow-scripts"
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
