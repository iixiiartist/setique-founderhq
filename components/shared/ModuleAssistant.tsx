import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AppActions, TaskCollectionName, NoteableCollectionName, CrmCollectionName, DeletableCollectionName, TabType, GTMDocMetadata, AnyCrmItem } from '../../types';
import { getAiResponse, AILimitError } from '../../services/groqService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tab } from '../../constants';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useFullscreenChat } from '../../hooks/useFullscreenChat';
import { getRelevantHistory, pruneFunctionResponse } from '../../utils/conversationUtils';
import { DocLibraryPicker } from '../workspace/DocLibraryPicker';
import { useAuth } from '../../contexts/AuthContext';
import { QuickActionsToolbar } from './QuickActionsToolbar';
import { InlineFormModal } from './InlineFormModal';

// Keep using Content format for compatibility
interface Part {
    text?: string;
    inlineData?: { mimeType: string; data: string };
    functionCall?: { id?: string; name: string; args: any };
    functionResponse?: { id?: string; name: string; response: any };
}

interface Content {
    role: 'user' | 'model' | 'tool';
    parts: Part[];
}

interface ModuleAssistantProps {
    title: string;
    systemPrompt: string;
    actions: AppActions;
    currentTab: TabType;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
    compact?: boolean; // For floating modal mode
    onNewMessage?: () => void; // Callback when AI responds (for notifications)
    allowFullscreen?: boolean; // Enable fullscreen toggle (default: true)
    autoFullscreenMobile?: boolean; // Auto-open fullscreen on mobile (default: true)
    businessContext?: string; // Optional context injected on first message
    teamContext?: string; // Optional context injected on first message
    maxFileSizeMB?: number; // Max file size for AI chat (default: 5MB, lower than storage limit due to base64 overhead)
    crmItems?: AnyCrmItem[]; // For contact form in quick actions
}

const ModuleAssistant: React.FC<ModuleAssistantProps> = ({ 
    title, 
    systemPrompt, 
    actions, 
    currentTab,
    workspaceId,
    onUpgradeNeeded,
    compact = false,
    onNewMessage,
    allowFullscreen = true,
    autoFullscreenMobile = true,
    businessContext,
    teamContext,
    maxFileSizeMB = 5, // Default 5MB for AI chat (base64 encoding adds ~33% overhead)
    crmItems = []
}) => {
    // Use conversation history hook for persistence with workspace/user scoping
    const {
        history,
        addMessage,
        updateHistory,
        clearHistory: clearPersistedHistory,
        messageCount,
        exportAsText
    } = useConversationHistory(currentTab, workspaceId, user?.id);
    
    // Fullscreen mode management
    const { isFullscreen, toggleFullscreen, exitFullscreen, isMobileDevice } = useFullscreenChat();
    
    const { user } = useAuth();
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>(''); // base64 content
    const [isCopied, setIsCopied] = useState(false);
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const [aiLimitError, setAiLimitError] = useState<AILimitError | null>(null);
    const [rateLimitError, setRateLimitError] = useState<string | null>(null);
    const [fileSizeError, setFileSizeError] = useState<string | null>(null);
    const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [attachedDoc, setAttachedDoc] = useState<GTMDocMetadata | null>(null);
    const [showInlineForm, setShowInlineForm] = useState<{ type: 'task' | 'crm' | 'contact' | 'event' | 'expense' | 'document'; data?: any } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const systemPromptRef = useRef(systemPrompt);

    // Rate limit: 10 requests per minute
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
    const RATE_LIMIT_MAX_REQUESTS = 10;

    useEffect(() => {
        systemPromptRef.current = systemPrompt;
    }, [systemPrompt]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [history, isLoading]);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().split(',')[1] || '';
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const checkRateLimit = (): { allowed: boolean; remainingTime?: number } => {
        const now = Date.now();
        
        // Remove timestamps older than the rate limit window
        const recentTimestamps = requestTimestamps.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW
        );
        
        // Update state with filtered timestamps
        setRequestTimestamps(recentTimestamps);
        
        // Check if we've hit the limit
        if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
            const oldestTimestamp = Math.min(...recentTimestamps);
            const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);
            return { allowed: false, remainingTime };
        }
        
        return { allowed: true };
    };

    const recordRequest = () => {
        setRequestTimestamps(prev => [...prev, Date.now()]);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validate file size
            const fileSizeInMB = selectedFile.size / (1024 * 1024);
            if (fileSizeInMB > maxFileSizeMB) {
                setFileSizeError(`File too large. Maximum size is ${maxFileSizeMB}MB (file is ${fileSizeInMB.toFixed(2)}MB)`);
                // Clear the file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }
            
            // Clear any previous errors
            setFileSizeError(null);
            
            setFile(selectedFile);
            const content = await blobToBase64(selectedFile);
            setFileContent(content);
        }
    };
    
    const clearFile = () => {
        setFile(null);
        setFileContent('');
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const clearDoc = () => {
        setAttachedDoc(null);
    };
    
    const executeAction = async (call: { name: string, args: any }) => {
        const { name, args } = call;
        try {
            switch (name) {
                case 'createTask':
                    return await actions.createTask(args.category as TaskCollectionName, args.text, args.priority, undefined, undefined, args.dueDate, args.assignedTo);
                case 'updateTask':
                    return await actions.updateTask(args.taskId, args.updates);
                case 'addNote':
                    return await actions.addNote(args.collection as NoteableCollectionName, args.itemId, args.noteText);
                case 'updateNote':
                    return await actions.updateNote(args.collection as NoteableCollectionName, args.itemId, args.noteTimestamp, args.newText);
                case 'deleteNote':
                    return await actions.deleteNote(args.collection as NoteableCollectionName, args.itemId, args.noteTimestamp);
                case 'createCrmItem':
                    return await actions.createCrmItem(args.collection as CrmCollectionName, {
                        company: args.name,
                        priority: 'Medium',
                        status: args.stage || 'New',
                        ...(args.amount && (args.collection === 'investors' ? { checkSize: args.amount } : { dealValue: args.amount }))
                    });
                case 'updateCrmItem':
                    return await actions.updateCrmItem(args.collection as CrmCollectionName, args.itemId, args.updates);
                case 'createContact':
                    return await actions.createContact(args.collection as CrmCollectionName, args.crmItemId, {
                        name: args.name,
                        title: args.title || '',
                        email: args.email,
                        phone: args.phone || '',
                        linkedin: args.linkedin || ''
                    });
                case 'updateContact':
                    return await actions.updateContact(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.updates);
                case 'deleteContact':
                    return await actions.deleteContact(args.collection as CrmCollectionName, args.crmItemId, args.contactId);
                case 'searchContacts': {
                    const query = args.query.toLowerCase();
                    const targetCollection = args.collection && args.collection !== 'all' ? args.collection : null;
                    
                    const results: any[] = [];
                    crmItems.forEach(item => {
                        // Filter by collection if specified
                        if (targetCollection) {
                            const itemType = 'checkSize' in item ? 'investors' : 
                                           'dealValue' in item ? 'customers' : 'partners';
                            if (itemType !== targetCollection) return;
                        }
                        
                        // Check if company name matches
                        const companyMatches = item.company.toLowerCase().includes(query);
                        
                        // Search contacts
                        (item.contacts || []).forEach(contact => {
                            const matches = 
                                contact.name.toLowerCase().includes(query) ||
                                contact.email.toLowerCase().includes(query) ||
                                (contact.title && contact.title.toLowerCase().includes(query)) ||
                                (contact.phone && contact.phone.toLowerCase().includes(query)) ||
                                companyMatches;
                            
                            if (matches) {
                                results.push({
                                    contactId: contact.id,
                                    name: contact.name,
                                    email: contact.email,
                                    phone: contact.phone,
                                    title: contact.title,
                                    company: item.company,
                                    companyId: item.id,
                                    crmType: 'checkSize' in item ? 'investors' : 
                                             'dealValue' in item ? 'customers' : 'partners'
                                });
                            }
                        });
                    });
                    
                    return {
                        success: true,
                        message: `Found ${results.length} contact(s) matching "${args.query}"`,
                        results
                    };
                }
                case 'createMeeting':
                    return await actions.createMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, {
                        title: args.title,
                        timestamp: new Date(args.date).getTime(),
                        attendees: args.attendees || '',
                        summary: args.summary || ''
                    });
                case 'updateMeeting':
                    return await actions.updateMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingId, args.updates);
                case 'deleteMeeting':
                    return await actions.deleteMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingId);
                case 'logFinancials':
                    return await actions.logFinancials({ date: args.date, mrr: args.mrr, gmv: args.gmv, signups: args.signups });
                case 'createExpense':
                    return await actions.createExpense({
                        date: args.date,
                        category: args.category,
                        amount: args.amount,
                        description: args.description,
                        vendor: args.vendor,
                        paymentMethod: args.paymentMethod
                    });
                case 'updateExpense':
                    return await actions.updateExpense(args.expenseId, args.updates);
                case 'deleteItem':
                    return await actions.deleteItem(args.collection as DeletableCollectionName, args.itemId);
                case 'createMarketingItem':
                    return await actions.createMarketingItem({
                        title: args.title,
                        type: args.type || 'Other',
                        status: args.status || 'Planned',
                        dueDate: args.dueDate,
                        dueTime: args.dueTime
                    });
                case 'updateMarketingItem':
                    return await actions.updateMarketingItem(args.itemId, args.updates);
                case 'updateSettings':
                    return await actions.updateSettings(args.settings);
                case 'uploadDocument':
                    return await actions.uploadDocument(args.name, args.mimeType, args.content, args.module as TabType, args.companyId, args.contactId);
                case 'updateDocument':
                    return await actions.updateDocument(args.docId, args.name, args.mimeType, args.content);
                case 'getFileContent':
                    return await actions.getFileContent(args.fileId);
                default:
                    return { success: false, message: `Unknown function: ${name}` };
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred';
            return { success: false, message: `Error executing ${name}: ${message}` };
        }
    };

    const sendMessage = async (prompt: string) => {
        if ((!prompt.trim() && !file) || isLoading) return;

        // Check rate limit before processing
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            const errorMessage = `Rate limit exceeded. Please wait ${rateLimitCheck.remainingTime} seconds before sending another message.`;
            setRateLimitError(errorMessage);
            
            // Add error message to history
            addMessage({ role: 'user', parts: [{ text: prompt }] });
            addMessage({ role: 'model', parts: [{ text: `⚠️ ${errorMessage}` }] });
            
            // Clear rate limit error after the remaining time
            setTimeout(() => {
                setRateLimitError(null);
            }, (rateLimitCheck.remainingTime || 0) * 1000);
            
            return;
        }

        // Record this request
        recordRequest();

        setIsLoading(true);
        setUserInput('');
        setAiLimitError(null); // Clear any previous AI limit errors
        setRateLimitError(null); // Clear any previous rate limit errors

        const userMessageParts: any[] = [];
        let textPart = prompt; // This is what the user actually typed
        let textPartForAI = prompt; // This is what we send to AI (may include context)

        // Inject business/team context on first message only (for AI, not displayed to user)
        if (history.length === 0 && (businessContext || teamContext)) {
            const contextParts: string[] = [];
            if (businessContext) contextParts.push(businessContext);
            if (teamContext) contextParts.push(teamContext);
            // Prepend context to AI message, but keep user's displayed message clean
            textPartForAI = `${contextParts.join('\n\n')}\n\n${prompt}`;
        }

        // Inject GTM doc content if attached
        if (attachedDoc) {
            const docContext = `

--- GTM Document Reference ---
Title: ${attachedDoc.title}
Type: ${attachedDoc.docType}
Visibility: ${attachedDoc.visibility}
${attachedDoc.isTemplate ? 'Template: Yes\n' : ''}${attachedDoc.tags.length > 0 ? `Tags: ${attachedDoc.tags.join(', ')}\n` : ''}${attachedDoc.contentPreview ? `Content: ${attachedDoc.contentPreview}` : ''}
--- End Document ---
`;
            textPart = `📎 [GTM Doc: ${attachedDoc.title}]\n\n${textPart}`;
            textPartForAI = `${docContext}\n\n${textPartForAI}`;
        }

        // Handle file attachment with cost optimization
        let fileSaved = false;
        let fileName = '';
        if (file && fileContent && prompt === userInput) {
            fileName = file.name;
            
            // Calculate file size for validation (base64 is ~33% larger than original)
            const fileSizeBytes = Math.ceil((fileContent.length * 3) / 4);
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            
            // Double-check file size before sending to AI
            if (fileSizeMB > maxFileSizeMB) {
                setFileSizeError(`File too large to send to AI. Maximum size is ${maxFileSizeMB}MB (file is ${fileSizeMB.toFixed(2)}MB)`);
                setIsLoading(false);
                clearFile();
                return;
            }
            
            textPart = `[File Attached: ${fileName}]\n\n${prompt}`;
            textPartForAI = `[File Attached: ${fileName}]\n\n${textPartForAI}`;
            
            // Auto-save to file library for future reference
            // COST OPTIMIZATION: File stored once in library, AI can reference by name
            // This prevents sending large base64 in context for every future message
            try {
                await actions.uploadDocument(
                    fileName,
                    file.type,
                    fileContent,
                    currentTab,
                    undefined, // companyId
                    undefined  // contactId
                );
                fileSaved = true;
                console.log(`✅ Auto-saved to library: ${fileName} (${fileSizeMB.toFixed(2)}MB)`);
            } catch (error) {
                console.warn('⚠️ Auto-save failed:', error);
                // Continue - still send file to AI even if save fails
            }
            
            // Send file to AI as inline data (for this conversation only)
            // OPTIMIZATION: AI can now reference file by name from library in future messages
            userMessageParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: fileContent
                }
            });
        }

        // Use textPartForAI for sending to AI, but textPart for display
        userMessageParts.unshift({ text: textPartForAI });

        // Add user message to history (with display text, not AI text)
        addMessage({ role: 'user', parts: [{ text: textPart }, ...userMessageParts.slice(1)] });
        
        // Send to AI with context included
        let currentHistory: Content[] = [...history, { role: 'user', parts: userMessageParts }];
        setAiLimitError(null); // Clear any previous error
        
        clearFile();
        clearDoc();

        try {
            // Send to AI with sliding window history (last 15 messages)
            // Only use tools if the user's message suggests they want to take action
            const userMessage = textPart.toLowerCase();
            const wantsAction = /\b(create|add|make|update|change|delete|remove|log|upload|set)\b/i.test(userMessage);
            
            const relevantHistory = getRelevantHistory(currentHistory);
            let modelResponse = await getAiResponse(relevantHistory, systemPromptRef.current, wantsAction, workspaceId, currentTab);

            while (modelResponse.functionCalls && modelResponse.functionCalls.length > 0) {
                const functionCalls = modelResponse.functionCalls;
                
                const modelResponseWithCall = modelResponse.candidates?.[0]?.content;
                if (!modelResponseWithCall) {
                    throw new Error("Model response with function call is missing content.");
                }

                currentHistory = [...currentHistory, modelResponseWithCall];

                const functionResponseParts = await Promise.all(
                    functionCalls.map(async (call) => {
                        if (!call.name) {
                            throw new Error('Function call missing name.');
                        }

                        const result = await executeAction({
                            name: call.name,
                            args: call.args ?? {},
                        });

                        // Prune large responses to save tokens
                        const prunedResult = pruneFunctionResponse(result, call.name);

                        return {
                            functionResponse: { 
                                id: call.id, // Preserve the tool_call_id
                                name: call.name, 
                                response: prunedResult 
                            },
                        };
                    })
                );

                currentHistory = [
                    ...currentHistory,
                    { role: 'tool', parts: functionResponseParts },
                ];
                
                // Continue with tools enabled since we're in a function-calling loop
                // Use sliding window history for function-calling loops too
                const relevantHistory = getRelevantHistory(currentHistory);
                modelResponse = await getAiResponse(relevantHistory, systemPromptRef.current, true, workspaceId, currentTab);
            }
            
            // Extract text from the response
            const finalResponseText = modelResponse.candidates?.[0]?.content?.parts?.find(p => 'text' in p)?.text ?? "I've completed the action.";
            
            // Only add message if response is not empty (avoid empty assistant messages that cause 400 errors)
            if (finalResponseText && finalResponseText.trim().length > 0) {
                addMessage({ role: 'model', parts: [{ text: finalResponseText }] });
                
                // Trigger notification callback if provided
                if (onNewMessage) {
                    onNewMessage();
                }
            } else {
                console.warn('[ModuleAssistant] Received empty response from AI, not adding to conversation history');
            }

        } catch (error) {
            // Handle AI limit errors specifically
            if (error instanceof AILimitError) {
                setAiLimitError(error);
                addMessage({ 
                    role: 'model', 
                    parts: [{ text: `⚠️ ${error.message}\n\nPlease upgrade your plan to continue using the AI assistant.` }] 
                });
                return;
            }
            
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addMessage({ role: 'model', parts: [{ text: `Error: ${errorMessage}` }] });
        } finally {
            setIsLoading(false);
        }
    }


    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(userInput);
    };

    const handleGenerateReport = () => {
        const getReportPrompt = (tab: TabType): string => {
            switch(tab) {
                case Tab.ProductsServices: return "Please generate a performance report for products and services management.";
                case Tab.Investors:
                case Tab.Customers:
                case Tab.Partners:
                     return "Please generate a performance report for the CRM pipeline.";
                case Tab.Marketing: return "Please generate a performance report for the marketing calendar.";
                case Tab.Financials: return "Please generate a performance report for the financial data.";
                default: return "Please provide a summary of the current module.";
            }
        };
        const prompt = getReportPrompt(currentTab);
        sendMessage(prompt);
    }

    const handleCopyConversation = () => {
        const formattedHistory = history
            .map(msg => {
                const isUserModel = msg.role === 'user';
                const isModelMessage = msg.role === 'model';
                const shouldRenderModelMessage = isModelMessage && !msg.parts.some(p => 'functionCall' in p);

                if (isUserModel) {
                    const textPart = msg.parts.find(p => 'text' in p)?.text || '';
                    const hasFile = msg.parts.some(p => 'inlineData' in p);
                    return `User: ${hasFile ? '[File Attached]\n' : ''}${textPart}`;
                }
                if (shouldRenderModelMessage) {
                    const textPart = msg.parts.find(p => 'text' in p)?.text || '';
                    return `Assistant: ${textPart}`;
                }
                return null;
            })
            .filter(Boolean)
            .join('\n\n---\n\n');

        if (formattedHistory) {
            navigator.clipboard.writeText(formattedHistory).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const handleCopyMessage = (text: string, index: number) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => setCopiedMessageIndex(null), 2000);
        });
    };
    
    // Main chat content
    const chatContent = (
        <div className={`bg-white h-full flex flex-col ${
            compact 
                ? 'p-4' 
                : isFullscreen
                    ? 'p-6 h-full'
                    : 'p-6 border-2 border-black shadow-neo max-h-[85vh]'
        }`}>
            {(!compact || isFullscreen) && (
                <div className="flex justify-between items-start mb-4 shrink-0 flex-wrap gap-2 relative">
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-xl font-semibold text-black truncate">{title}</h2>
                        {messageCount > 0 && (
                            <span className="text-xs text-gray-500 shrink-0" title="Message count">
                                ({messageCount})
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {/* Quick Actions Toolbar - moved to top */}
                        <QuickActionsToolbar
                            actions={actions}
                            currentTab={currentTab}
                            workspaceId={workspaceId}
                            onActionComplete={(message) => {
                                // Add system message to chat
                                addMessage({
                                    role: 'model',
                                    parts: [{ text: message }]
                                });
                            }}
                            onOpenForm={(formType, data) => {
                                setShowInlineForm({ type: formType, data });
                            }}
                        />
                        <button
                            onClick={handleGenerateReport}
                            className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                            disabled={isLoading}
                            title="Generate a summary report of this module"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 20V10H4V20H12ZM14 20V4H22V20H14Z" /></svg>
                            <span className="hidden sm:inline">Report</span>
                        </button>
                        <button
                            onClick={() => {
                                const text = exportAsText();
                                navigator.clipboard.writeText(text).then(() => {
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000);
                                });
                            }}
                            className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all disabled:opacity-50 shrink-0"
                            disabled={history.length === 0 || isCopied}
                            title="Copy conversation to clipboard"
                        >
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('Clear this conversation? This cannot be undone.')) {
                                    clearPersistedHistory();
                                }
                            }}
                            className="font-mono bg-white border-2 border-black text-red-600 hover:bg-red-50 cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all disabled:opacity-50 shrink-0"
                            disabled={history.length === 0}
                            title="Clear conversation history"
                        >
                            Clear
                        </button>
                        {allowFullscreen && !compact && (
                            <button
                                onClick={toggleFullscreen}
                                className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-gray-50 shrink-0"
                                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                aria-pressed={isFullscreen}
                            >
                                {isFullscreen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 mb-4 border-2 border-black bg-gray-50 p-4 min-h-[200px] flex flex-col gap-4" role="log" aria-live="polite" aria-atomic="false">
                {history.length === 0 && (
                    <div className="m-auto text-center text-gray-500">
                        Ask me anything about this module!
                    </div>
                )}
                {history.map((msg, index) => {
                     const isUserModel = msg.role === 'user';
                     const isModelMessage = msg.role === 'model';
                     
                     // We only want to render messages from the user, or final text-only responses from the model.
                     // Intermediate model responses that contain function calls should not be rendered.
                     const shouldRenderModelMessage = isModelMessage && !msg.parts.some(p => 'functionCall' in p);

                     if (isUserModel || shouldRenderModelMessage) {
                        const textPart = msg.parts.find(p => 'text' in p)?.text;
                        const hasFile = msg.parts.some(p => 'inlineData' in p);

                        // Avoid rendering empty bubbles
                        if (!textPart && !hasFile) {
                            return null;
                        }

                        return (
                            <div key={index} className={`group relative max-w-[95%] sm:max-w-[85%] md:max-w-[80%] p-3 border-2 border-black whitespace-pre-wrap break-words ${
                                isUserModel 
                                ? 'bg-blue-500 text-white self-end shadow-neo-sm' 
                                : 'bg-gray-100 text-black self-start'
                            }`}>
                                {isUserModel ? (
                                    <>
                                        {textPart}
                                    </>
                                ) : (
                                    <>
                                        <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                                            {textPart || '...'}
                                        </ReactMarkdown>
                                        <button 
                                            onClick={() => handleCopyMessage(textPart || '', index)} 
                                            className="absolute top-1 right-1 bg-white border border-black p-1 rounded-none shadow-neo-btn text-xs font-mono hover:bg-gray-50 transition-colors"
                                            title="Copy response"
                                            aria-label="Copy response"
                                        >
                                            {copiedMessageIndex === index ? 'Copied!' : (
                                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5v1A1.5 1.5 0 0 1 11.5 6h-3A1.5 1.5 0 0 1 7 4.5v-1Z" />
                                                    <path d="M5.5 4.5A2.5 2.5 0 0 1 8 2h4a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 12 7H8a2.5 2.5 0 0 1-2.5-2.5v-1Zm3-1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-3Z" />
                                                    <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h10a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 15 16H5a1.5 1.5 0 0 1-1.5-1.5v-8Zm2 1a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-8Z" />
                                                </svg>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        )
                     }
                     return null; // Don't render tool call/response messages or intermediate model turns
                })}
                {isLoading && (
                    <div className="bg-gray-100 text-black self-start p-3 border-2 border-black">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-black rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-black rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* AI Limit Warning */}
            {/* Rate Limit Warning */}
            {rateLimitError && (
                <div className="bg-orange-100 border-2 border-orange-500 p-4 shrink-0">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⏱️</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-orange-800 mb-1">Rate Limit Exceeded</h3>
                            <p className="text-sm text-orange-700">
                                {rateLimitError}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Limit Warning */}
            {aiLimitError && (
                <div className="bg-yellow-100 border-2 border-yellow-400 p-4 shrink-0">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">✨</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-yellow-800 mb-1">
                                {aiLimitError.limit === 0 ? 'AI Features Not Available on Free Plan' : 'AI Usage Limit Reached'}
                            </h3>
                            <p className="text-sm text-yellow-700 mb-2">
                                {aiLimitError.limit === 0 ? (
                                    <>
                                        The Free plan includes task management, basic CRM, and calendar features. 
                                        <strong> Upgrade to Power ($49/mo)</strong> or <strong>Team Pro ($99/mo)</strong> to unlock unlimited AI assistants, document library, and premium features.
                                    </>
                                ) : (
                                    <>
                                        You've used <strong>{aiLimitError.usage}/{aiLimitError.limit}</strong> AI requests on the <strong>{aiLimitError.planType}</strong> plan. 
                                        Upgrade for unlimited AI access.
                                    </>
                                )}
                            </p>
                            {onUpgradeNeeded && (
                                <button
                                    onClick={onUpgradeNeeded}
                                    className="px-4 py-2 border-2 border-black bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-neo text-sm"
                                >
                                    View Pricing & Upgrade →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* File Size Error */}
            {fileSizeError && (
                <div className="bg-red-100 border-2 border-red-500 p-4 shrink-0">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">📁</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800 mb-1">File Too Large</h3>
                            <p className="text-sm text-red-700">
                                {fileSizeError}
                            </p>
                            <button
                                onClick={() => setFileSizeError(null)}
                                className="mt-2 text-xs underline text-red-600 hover:text-red-800"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleChatSubmit} className="flex flex-col gap-2 shrink-0">
                {file && (
                    <div className="flex items-center justify-between p-2 bg-gray-100 border-2 border-dashed border-black text-sm">
                        <div className="flex-1 truncate pr-2">
                            <div className="font-medium">{file.name}</div>
                            <div className="text-xs text-gray-600">
                                {(file.size / (1024 * 1024)).toFixed(2)}MB
                            </div>
                        </div>
                        <button type="button" onClick={clearFile} className="font-bold text-lg hover:text-red-500" aria-label="Remove attached file">&times;</button>
                    </div>
                )}
                {attachedDoc && (
                    <div className="flex items-center justify-between p-2 bg-purple-50 border-2 border-purple-600 text-sm">
                        <div className="flex-1 truncate pr-2">
                            <div className="font-medium">📎 {attachedDoc.title}</div>
                            <div className="text-xs text-purple-700">
                                {attachedDoc.docType} • {attachedDoc.visibility}
                            </div>
                        </div>
                        <button type="button" onClick={clearDoc} className="font-bold text-lg hover:text-red-500" aria-label="Remove attached document">&times;</button>
                    </div>
                )}
                <div className="flex gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id={`file-upload-${title.replace(/\s+/g, '-')}`} />
                    <label 
                        htmlFor={`file-upload-${title.replace(/\s+/g, '-')}`} 
                        className="p-3 border-2 border-black shadow-neo-btn cursor-pointer flex items-center justify-center hover:bg-gray-50 transition-colors" 
                        aria-label={`Attach a file (max ${maxFileSizeMB}MB)`}
                        title={`Attach a file (max ${maxFileSizeMB}MB)`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" />
                        </svg>
                    </label>
                    {workspaceId && user && (
                        <button
                            type="button"
                            onClick={() => setShowDocPicker(true)}
                            className="p-3 border-2 border-purple-600 bg-purple-50 shadow-neo-btn cursor-pointer flex items-center justify-center hover:bg-purple-100 transition-colors"
                            aria-label="Attach GTM document"
                            title="Attach GTM document"
                        >
                            <span className="text-xl">📄</span>
                        </button>
                    )}
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black p-3 rounded-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Ask a question..."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="font-mono font-semibold bg-blue-500 text-white p-3 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-gray-200"
                        disabled={isLoading || (!userInput && !file && !attachedDoc)}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
    
    // Auto-enter fullscreen on mobile if enabled
    useEffect(() => {
        if (autoFullscreenMobile && isMobileDevice() && allowFullscreen && !isFullscreen) {
            // Small delay to ensure component is mounted
            const timer = setTimeout(() => {
                toggleFullscreen();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, []); // Empty deps - only run on mount
    
    // Render fullscreen via portal
    if (isFullscreen && allowFullscreen) {
        return ReactDOM.createPortal(
            <>
                <div 
                    className="fixed inset-0 z-[1000] bg-white overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${title} - Fullscreen mode`}
                >
                    {chatContent}
                </div>
                {showDocPicker && workspaceId && user && (
                    <DocLibraryPicker
                        isOpen={showDocPicker}
                        workspaceId={workspaceId}
                        userId={user.id}
                        onSelect={async (doc) => {
                            // Load full doc content for AI context
                            const { DatabaseService } = await import('../../lib/services/database');
                            const { data: fullDoc } = await DatabaseService.loadGTMDocById(doc.id, workspaceId);
                            if (fullDoc) {
                                // Add contentPreview from contentPlain for AI
                                const docWithContent = {
                                    ...doc,
                                    contentPreview: fullDoc.contentPlain || 'No content available'
                                };
                                setAttachedDoc(docWithContent);
                            } else {
                                setAttachedDoc(doc);
                            }
                            setShowDocPicker(false);
                        }}
                        onClose={() => setShowDocPicker(false)}
                        title="Attach GTM Document to Chat"
                    />
                )}
            </>,
            document.body
        );
    }
    
    // Normal embedded view
    return (
        <>
            {chatContent}
            {showDocPicker && workspaceId && user && (
                <DocLibraryPicker
                    isOpen={showDocPicker}
                    workspaceId={workspaceId}
                    userId={user.id}
                    onSelect={async (doc) => {
                        // Load full doc content for AI context
                        const { DatabaseService } = await import('../../lib/services/database');
                        const { data: fullDoc } = await DatabaseService.loadGTMDocById(doc.id, workspaceId);
                        if (fullDoc) {
                            // Add contentPreview from contentPlain for AI
                            const docWithContent = {
                                ...doc,
                                contentPreview: fullDoc.contentPlain || 'No content available'
                            };
                            setAttachedDoc(docWithContent);
                        } else {
                            setAttachedDoc(doc);
                        }
                        setShowDocPicker(false);
                    }}
                    onClose={() => setShowDocPicker(false)}
                    title="Attach GTM Document to Chat"
                />
            )}
            {showInlineForm && (
                <InlineFormModal
                    formType={showInlineForm.type}
                    formData={showInlineForm.data}
                    actions={actions}
                    onClose={() => setShowInlineForm(null)}
                    onSuccess={(message) => {
                        addMessage({
                            role: 'model',
                            parts: [{ text: message }]
                        });
                        setShowInlineForm(null);
                    }}
                    crmItems={crmItems}
                    currentTab={currentTab}
                    workspaceId={workspaceId}
                />
            )}
        </>
    );
};

export default ModuleAssistant;
