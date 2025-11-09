// Tool definitions in OpenAI/Groq format
// These are function declarations for AI-powered operations

export interface GroqTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required: string[];
        };
    };
}

const createTaskTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createTask',
        description: 'Creates a new task for a specific category. You can optionally assign the task to a specific team member by providing their user ID (UUID format).',
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'The category of the task.',
                    enum: ['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks']
                },
                text: { type: 'string', description: 'The content or description of the task.' },
                priority: {
                    type: 'string',
                    description: 'The priority of the task.',
                    enum: ['Low', 'Medium', 'High']
                },
                dueDate: { 
                    type: ['string', 'null'], 
                    description: 'Optional. The due date for the task in YYYY-MM-DD format. Set to null if no due date.' 
                },
                assignedTo: { 
                    type: ['string', 'null'], 
                    description: 'Optional. User ID (UUID) of the team member to assign this task to. Set to null or omit if the task should be unassigned. Do NOT use email addresses.' 
                }
            },
            required: ['category', 'text', 'priority']
        }
    }
};

const updateTaskTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateTask',
        description: 'Updates an existing task. To find the taskId, look at the dashboard context.',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'The ID of the task to update.' },
                updates: {
                    type: 'object',
                    description: 'The fields to update.',
                    properties: {
                        text: { type: 'string', description: 'The new content of the task.' },
                        status: { type: 'string', description: 'The new status of the task.', enum: ['Todo', 'InProgress', 'Done'] },
                        priority: {
                            type: 'string',
                            description: 'The new priority for the task.',
                            enum: ['Low', 'Medium', 'High']
                        },
                        dueDate: { type: 'string', description: 'The new due date for the task in YYYY-MM-DD format.' }
                    }
                }
            },
            required: ['taskId', 'updates']
        }
    }
};

const addNoteTool: GroqTool = {
    type: 'function',
    function: {
        name: 'addNote',
        description: 'Adds a note to a CRM item, task, document, or marketing item. To find the itemId, look at the dashboard context.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The collection where the item exists.',
                    enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
                },
                itemId: { type: 'string', description: 'The ID of the item to add the note to.' },
                noteText: { type: 'string', description: 'The content of the note.' },
                crmItemId: { type: 'string', description: 'Required if collection is "contacts". The ID of the parent CRM item.' }
            },
            required: ['collection', 'itemId', 'noteText']
        }
    }
};

const updateNoteTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateNote',
        description: 'Updates an existing note on an item. To find the itemId and noteTimestamp, look at the dashboard context.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The collection where the item exists.',
                    enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
                },
                itemId: { type: 'string', description: 'The ID of the item containing the note.' },
                noteTimestamp: { type: 'number', description: 'The timestamp of the note to update.' },
                newText: { type: 'string', description: 'The new content for the note.' },
                crmItemId: { type: 'string', description: 'Required if collection is "contacts". The ID of the parent CRM item.' }
            },
            required: ['collection', 'itemId', 'noteTimestamp', 'newText']
        }
    }
};

const deleteNoteTool: GroqTool = {
    type: 'function',
    function: {
        name: 'deleteNote',
        description: 'Deletes a note from an item. To find the itemId and noteTimestamp, look at the dashboard context.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The collection where the item exists.',
                    enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
                },
                itemId: { type: 'string', description: 'The ID of the item containing the note.' },
                noteTimestamp: { type: 'number', description: 'The timestamp of the note to delete.' },
                crmItemId: { type: 'string', description: 'Required if collection is "contacts". The ID of the parent CRM item.' }
            },
            required: ['collection', 'itemId', 'noteTimestamp']
        }
    }
};

const createCrmItemTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createCrmItem',
        description: 'Creates a new CRM item (investor, customer, or partner).',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The type of CRM item to create.',
                    enum: ['investors', 'customers', 'partners']
                },
                name: { type: 'string', description: 'The name of the investor/customer/partner.' },
                details: { type: 'string', description: 'Optional. Additional details about the item.' },
                amount: { type: 'number', description: 'Optional. For investors: investment amount. For customers: deal value.' },
                stage: { type: 'string', description: 'Optional. Current stage in the pipeline.' },
                contactPerson: { type: 'string', description: 'Optional. Name of the main contact person.' },
                email: { type: 'string', description: 'Optional. Email address.' },
                phone: { type: 'string', description: 'Optional. Phone number.' }
            },
            required: ['collection', 'name']
        }
    }
};

const updateCrmItemTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateCrmItem',
        description: 'Updates an existing CRM item. To find the itemId, look at the dashboard context.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The collection type.',
                    enum: ['investors', 'customers', 'partners']
                },
                itemId: { type: 'string', description: 'The ID of the item to update.' },
                updates: {
                    type: 'object',
                    description: 'The fields to update.',
                    properties: {
                        name: { type: 'string' },
                        details: { type: 'string' },
                        amount: { type: 'number' },
                        stage: { type: 'string' },
                        contactPerson: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' }
                    }
                }
            },
            required: ['collection', 'itemId', 'updates']
        }
    }
};

const createContactTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createContact',
        description: 'Creates a new contact for a CRM item.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The parent collection.',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string', description: 'The ID of the parent CRM item.' },
                name: { type: 'string', description: 'Contact name.' },
                role: { type: 'string', description: 'Contact role/title.' },
                email: { type: 'string', description: 'Email address.' },
                phone: { type: 'string', description: 'Phone number.' }
            },
            required: ['collection', 'crmItemId', 'name', 'email']
        }
    }
};

const updateContactTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateContact',
        description: 'Updates an existing contact.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string', description: 'The ID of the parent CRM item.' },
                contactId: { type: 'string', description: 'The ID of the contact to update.' },
                updates: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        role: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' }
                    }
                }
            },
            required: ['collection', 'crmItemId', 'contactId', 'updates']
        }
    }
};

const deleteContactTool: GroqTool = {
    type: 'function',
    function: {
        name: 'deleteContact',
        description: 'Deletes a contact from a CRM item.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string' },
                contactId: { type: 'string' }
            },
            required: ['collection', 'crmItemId', 'contactId']
        }
    }
};

const createMeetingTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createMeeting',
        description: 'Creates a new meeting for a CRM item.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string' },
                title: { type: 'string' },
                date: { type: 'string', description: 'Meeting date in YYYY-MM-DD format.' },
                attendees: { type: 'string', description: 'Comma-separated list of attendees.' },
                agenda: { type: 'string' }
            },
            required: ['collection', 'crmItemId', 'title', 'date']
        }
    }
};

const updateMeetingTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateMeeting',
        description: 'Updates an existing meeting.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string' },
                meetingId: { type: 'string' },
                updates: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        date: { type: 'string' },
                        attendees: { type: 'string' },
                        agenda: { type: 'string' }
                    }
                }
            },
            required: ['collection', 'crmItemId', 'meetingId', 'updates']
        }
    }
};

const deleteMeetingTool: GroqTool = {
    type: 'function',
    function: {
        name: 'deleteMeeting',
        description: 'Deletes a meeting from a CRM item.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string' },
                meetingId: { type: 'string' }
            },
            required: ['collection', 'crmItemId', 'meetingId']
        }
    }
};

const logFinancialsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'logFinancials',
        description: 'Logs financial metrics (MRR, GMV, signups) for a specific date.',
        parameters: {
            type: 'object',
            properties: {
                date: { type: 'string', description: 'Date in YYYY-MM-DD format.' },
                mrr: { type: 'number', description: 'Monthly Recurring Revenue.' },
                gmv: { type: 'number', description: 'Gross Merchandise Value.' },
                signups: { type: 'number', description: 'Number of signups.' }
            },
            required: ['date', 'mrr', 'gmv', 'signups']
        }
    }
};

const deleteItemTool: GroqTool = {
    type: 'function',
    function: {
        name: 'deleteItem',
        description: 'Deletes an item from a collection.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents']
                },
                itemId: { type: 'string' }
            },
            required: ['collection', 'itemId']
        }
    }
};

const createMarketingItemTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createMarketingItem',
        description: 'Creates a new marketing campaign or initiative.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: ['Planning', 'Active', 'Completed'] },
                budget: { type: 'number' },
                startDate: { type: 'string' },
                endDate: { type: 'string' }
            },
            required: ['title', 'status']
        }
    }
};

const updateMarketingItemTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateMarketingItem',
        description: 'Updates an existing marketing item.',
        parameters: {
            type: 'object',
            properties: {
                itemId: { type: 'string' },
                updates: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string' },
                        budget: { type: 'number' },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' }
                    }
                }
            },
            required: ['itemId', 'updates']
        }
    }
};

const updateSettingsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateSettings',
        description: 'Updates workspace settings.',
        parameters: {
            type: 'object',
            properties: {
                settings: {
                    type: 'object',
                    properties: {
                        companyName: { type: 'string' },
                        industry: { type: 'string' },
                        goals: { type: 'string' }
                    }
                }
            },
            required: ['settings']
        }
    }
};

const uploadDocumentTool: GroqTool = {
    type: 'function',
    function: {
        name: 'uploadDocument',
        description: 'Uploads a new document to the file library.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                mimeType: { type: 'string' },
                content: { type: 'string', description: 'Base64 encoded file content.' },
                module: { type: 'string', enum: ['crm', 'tasks', 'marketing', 'financial', 'platform'] }
            },
            required: ['name', 'mimeType', 'content', 'module']
        }
    }
};

const updateDocumentTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateDocument',
        description: 'Updates an existing document in the file library.',
        parameters: {
            type: 'object',
            properties: {
                docId: { type: 'string' },
                name: { type: 'string' },
                mimeType: { type: 'string' },
                content: { type: 'string', description: 'Base64 encoded file content.' }
            },
            required: ['docId', 'name', 'mimeType', 'content']
        }
    }
};

const getFileContentTool: GroqTool = {
    type: 'function',
    function: {
        name: 'getFileContent',
        description: 'Retrieves the content of a specific file from the file library. The content will be returned to you in the next turn, do not try to make it up.',
        parameters: {
            type: 'object',
            properties: {
                fileId: { type: 'string', description: 'The ID of the file to retrieve.' }
            },
            required: ['fileId']
        }
    }
};

// All tools (for reference/debugging)
export const groqTools: GroqTool[] = [
    createTaskTool,
    updateTaskTool,
    addNoteTool,
    updateNoteTool,
    deleteNoteTool,
    createCrmItemTool,
    updateCrmItemTool,
    createContactTool,
    updateContactTool,
    deleteContactTool,
    createMeetingTool,
    updateMeetingTool,
    deleteMeetingTool,
    logFinancialsTool,
    deleteItemTool,
    createMarketingItemTool,
    updateMarketingItemTool,
    updateSettingsTool,
    uploadDocumentTool,
    updateDocumentTool,
    getFileContentTool,
];

/**
 * Get context-aware tools for a specific tab
 * Reduces token usage by only sending relevant tools (~800 token savings per request)
 */
export const getRelevantTools = (tab: string): GroqTool[] => {
    // Core tools available in all contexts
    const coreTools = [addNoteTool, updateNoteTool, deleteNoteTool];
    
    // File management tools (available everywhere)
    const fileTools = [uploadDocumentTool, updateDocumentTool, getFileContentTool];
    
    // Tab-specific tools
    switch(tab) {
        case 'dashboard':
        case 'platform':
            // Platform development: tasks + files
            return [
                createTaskTool,
                updateTaskTool,
                deleteItemTool,
                ...coreTools,
                ...fileTools
            ];
        
        case 'investors':
        case 'customers':
        case 'partners':
            // CRM: full CRM toolset + files
            return [
                createCrmItemTool,
                updateCrmItemTool,
                createContactTool,
                updateContactTool,
                deleteContactTool,
                createMeetingTool,
                updateMeetingTool,
                deleteMeetingTool,
                deleteItemTool,
                ...coreTools,
                ...fileTools
            ];
        
        case 'marketing':
            // Marketing: campaigns + tasks
            return [
                createMarketingItemTool,
                updateMarketingItemTool,
                createTaskTool,
                updateTaskTool,
                deleteItemTool,
                ...coreTools,
                ...fileTools
            ];
        
        case 'financials':
            // Financials: logs + tasks
            return [
                logFinancialsTool,
                createTaskTool,
                updateTaskTool,
                deleteItemTool,
                ...coreTools,
                ...fileTools
            ];
        
        case 'settings':
            // Settings: limited toolset
            return [
                updateSettingsTool,
                ...coreTools
            ];
        
        default:
            // Fallback: core tools only
            return [...coreTools, ...fileTools];
    }
};
