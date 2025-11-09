import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AppActions, TaskCollectionName, NoteableCollectionName, CrmCollectionName, DeletableCollectionName, TabType } from '../../types';
import { getAiResponse, AILimitError } from '../../services/groqService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tab } from '../../constants';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useFullscreenChat } from '../../hooks/useFullscreenChat';

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
    autoFullscreenMobile = true
}) => {
    // Use conversation history hook for persistence
    const {
        history,
        addMessage,
        updateHistory,
        clearHistory: clearPersistedHistory,
        messageCount,
        exportAsText
    } = useConversationHistory(currentTab);
    
    // Fullscreen mode management
    const { isFullscreen, toggleFullscreen, exitFullscreen, isMobileDevice } = useFullscreenChat();
    
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>(''); // base64 content
    const [isCopied, setIsCopied] = useState(false);
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const [aiLimitError, setAiLimitError] = useState<AILimitError | null>(null);
    const [rateLimitError, setRateLimitError] = useState<string | null>(null);
    const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
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
                    return await actions.createCrmItem(args.collection as CrmCollectionName, args.data);
                case 'updateCrmItem':
                    return await actions.updateCrmItem(args.collection as CrmCollectionName, args.itemId, args.updates);
                case 'createContact':
                    return await actions.createContact(args.collection as CrmCollectionName, args.crmItemId, args.contactData);
                case 'updateContact':
                    return await actions.updateContact(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.updates);
                case 'deleteContact':
                    return await actions.deleteContact(args.collection as CrmCollectionName, args.crmItemId, args.contactId);
                case 'createMeeting':
                    return await actions.createMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingData);
                case 'updateMeeting':
                    return await actions.updateMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingId, args.updates);
                case 'deleteMeeting':
                    return await actions.deleteMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingId);
                case 'logFinancials':
                    return await actions.logFinancials(args.data);
                case 'deleteItem':
                    return await actions.deleteItem(args.collection as DeletableCollectionName, args.itemId);
                case 'createMarketingItem':
                    return await actions.createMarketingItem(args.itemData);
                case 'updateMarketingItem':
                    return await actions.updateMarketingItem(args.itemId, args.updates);
                case 'updateSettings':
                    return await actions.updateSettings(args.updates);
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
        let textPart = prompt;

        if (file && fileContent && prompt === userInput) {
            textPart = `[File Attached: ${file.name}]\n\n${prompt}`;
            
            userMessageParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: fileContent
                }
            });
        }

        userMessageParts.unshift({ text: textPart });

        // Add user message to history
        addMessage({ role: 'user', parts: userMessageParts });
        let currentHistory: Content[] = [...history, { role: 'user', parts: userMessageParts }];
        setAiLimitError(null); // Clear any previous error
        
        clearFile();

        try {
            // Send to AI
            // Only use tools if the user's message suggests they want to take action
            const userMessage = textPart.toLowerCase();
            const wantsAction = /\b(create|add|make|update|change|delete|remove|log|upload|set)\b/i.test(userMessage);
            
            let modelResponse = await getAiResponse(currentHistory, systemPromptRef.current, wantsAction, workspaceId);

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

                        return {
                            functionResponse: { 
                                id: call.id, // Preserve the tool_call_id
                                name: call.name, 
                                response: result 
                            },
                        };
                    })
                );

                currentHistory = [
                    ...currentHistory,
                    { role: 'tool', parts: functionResponseParts },
                ];
                
                // Continue with tools enabled since we're in a function-calling loop
                modelResponse = await getAiResponse(currentHistory, systemPromptRef.current, true, workspaceId);
            }
            
            // Extract text from the response
            const finalResponseText = modelResponse.candidates?.[0]?.content?.parts?.find(p => 'text' in p)?.text ?? "I've completed the action.";
            addMessage({ role: 'model', parts: [{ text: finalResponseText }] });
            
            // Trigger notification callback if provided
            if (onNewMessage) {
                onNewMessage();
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
                case Tab.Platform: return "Please generate a performance report for the platform development tasks.";
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
                <div className="flex justify-between items-center mb-4 shrink-0 flex-wrap gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-xl font-semibold text-black truncate">{title}</h2>
                        {messageCount > 0 && (
                            <span className="text-xs text-gray-500 shrink-0" title="Message count">
                                ({messageCount})
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
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
                            <div key={index} className={`group relative max-w-[80%] p-3 border-2 border-black whitespace-pre-wrap break-words ${
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
                                            className="absolute top-1 right-1 bg-white border border-black p-1 rounded-none shadow-neo-btn text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-yellow-800 mb-1">AI Usage Limit Reached</h3>
                            <p className="text-sm text-yellow-700 mb-2">
                                You've used <strong>{aiLimitError.usage}/{aiLimitError.limit}</strong> AI requests on the <strong>{aiLimitError.planType}</strong> plan.
                            </p>
                            {onUpgradeNeeded && (
                                <button
                                    onClick={onUpgradeNeeded}
                                    className="px-4 py-2 border-2 border-black bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-neo"
                                >
                                    Upgrade Plan →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleChatSubmit} className="flex flex-col gap-2 shrink-0">
                {file && (
                    <div className="flex items-center justify-between p-2 bg-gray-100 border-2 border-dashed border-black text-sm">
                        <span className="truncate pr-2">{file.name}</span>
                        <button type="button" onClick={clearFile} className="font-bold text-lg hover:text-red-500" aria-label="Remove attached file">&times;</button>
                    </div>
                )}
                <div className="flex gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id={`file-upload-${title.replace(/\s+/g, '-')}`} />
                    <label htmlFor={`file-upload-${title.replace(/\s+/g, '-')}`} className="p-3 border-2 border-black shadow-neo-btn cursor-pointer flex items-center justify-center" aria-label="Attach a file">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" />
                        </svg>
                    </label>
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
                        disabled={isLoading || (!userInput && !file)}
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
            <div 
                className="fixed inset-0 z-[1000] bg-white overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label={`${title} - Fullscreen mode`}
            >
                {chatContent}
            </div>,
            document.body
        );
    }
    
    // Normal embedded view
    return chatContent;
};

export default ModuleAssistant;
