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
                    enum: ['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks']
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
                dueTime: {
                    type: ['string', 'null'],
                    description: 'Optional. The due time for the task in HH:MM format (24-hour). Set to null if no due time.'
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
                    description: 'The collection where the item is stored.',
                    enum: ['investors', 'customers', 'partners', 'productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
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
                    enum: ['investors', 'customers', 'partners', 'productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
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
                    enum: ['investors', 'customers', 'partners', 'productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
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
                phone: { type: 'string', description: 'Optional. Phone number.' },
                assignedTo: { 
                    type: ['string', 'null'], 
                    description: 'Optional. User ID (UUID) of the team member to assign this account to. Set to null or omit if unassigned.' 
                }
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
                title: { type: 'string', description: 'Contact title/role.' },
                email: { type: 'string', description: 'Email address.' },
                phone: { type: 'string', description: 'Phone number.' },
                linkedin: { type: 'string', description: 'LinkedIn profile URL.' }
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

const searchContactsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'searchContacts',
        description: 'Searches for contacts across all CRM items by name, email, title, or company name. Returns matching contacts with their linked CRM accounts.',
        parameters: {
            type: 'object',
            properties: {
                query: { 
                    type: 'string', 
                    description: 'Search query - can be contact name, email, title, or company name.' 
                },
                collection: {
                    type: 'string',
                    description: 'Optional. Filter by CRM type (investors, customers, or partners). Omit to search all.',
                    enum: ['investors', 'customers', 'partners', 'all']
                }
            },
            required: ['query']
        }
    }
};

const createMeetingTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createMeeting',
        description: 'Creates a new meeting for a contact in a CRM item.',
        parameters: {
            type: 'object',
            properties: {
                collection: {
                    type: 'string',
                    description: 'The parent collection.',
                    enum: ['investors', 'customers', 'partners']
                },
                crmItemId: { type: 'string', description: 'The ID of the parent CRM item.' },
                contactId: { type: 'string', description: 'The ID of the contact.' },
                title: { type: 'string', description: 'Meeting title.' },
                date: { type: 'string', description: 'Meeting date in YYYY-MM-DD format.' },
                attendees: { type: 'string', description: 'Comma-separated list of attendees.' },
                summary: { type: 'string', description: 'Meeting summary/agenda (markdown supported).' }
            },
            required: ['collection', 'crmItemId', 'contactId', 'title', 'date']
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

const createExpenseTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createExpense',
        description: 'Creates a new expense record. Use this to log business expenses like software subscriptions, marketing costs, etc.',
        parameters: {
            type: 'object',
            properties: {
                date: { type: 'string', description: 'Expense date in YYYY-MM-DD format.' },
                category: { 
                    type: 'string', 
                    enum: ['Software/SaaS', 'Marketing', 'Office', 'Legal', 'Contractors', 'Travel', 'Meals', 'Equipment', 'Subscriptions', 'Other'],
                    description: 'Category of the expense.' 
                },
                amount: { type: 'number', description: 'Expense amount in dollars.' },
                description: { type: 'string', description: 'Description of the expense.' },
                vendor: { type: 'string', description: 'Optional. Name of the vendor/company.' },
                paymentMethod: { 
                    type: 'string', 
                    enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other'],
                    description: 'Optional. Payment method used.' 
                }
            },
            required: ['date', 'category', 'amount', 'description']
        }
    }
};

const updateExpenseTool: GroqTool = {
    type: 'function',
    function: {
        name: 'updateExpense',
        description: 'Updates an existing expense record.',
        parameters: {
            type: 'object',
            properties: {
                expenseId: { type: 'string', description: 'ID of the expense to update.' },
                updates: {
                    type: 'object',
                    description: 'Fields to update.',
                    properties: {
                        date: { type: 'string' },
                        category: { type: 'string', enum: ['Software/SaaS', 'Marketing', 'Office', 'Legal', 'Contractors', 'Travel', 'Meals', 'Equipment', 'Subscriptions', 'Other'] },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        vendor: { type: 'string' },
                        paymentMethod: { type: 'string', enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other'] }
                    }
                }
            },
            required: ['expenseId', 'updates']
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
                    enum: ['investors', 'customers', 'partners', 'productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents']
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
                title: { type: 'string', description: 'Title of the marketing item.' },
                type: { type: 'string', enum: ['Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other'], description: 'Type of marketing item.' },
                status: { type: 'string', enum: ['Planned', 'In Progress', 'Completed', 'Published', 'Cancelled'], description: 'Current status.' },
                dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format.' },
                dueTime: { type: 'string', description: 'Due time in HH:MM format (24-hour).' }
            },
            required: ['title']
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
                itemId: { type: 'string', description: 'ID of the marketing item to update.' },
                updates: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        type: { type: 'string', enum: ['Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other'] },
                        status: { type: 'string', enum: ['Planned', 'In Progress', 'Completed', 'Published', 'Cancelled'] },
                        dueDate: { type: 'string' },
                        dueTime: { type: 'string' }
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

const createEventTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createEvent',
        description: 'Creates a new calendar event. This will appear as a task with a date and time.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'The title of the event.' },
                date: { type: 'string', description: 'The date of the event in YYYY-MM-DD format.' },
                time: { type: 'string', description: 'The time of the event in HH:MM format (24-hour).' },
                duration: { type: 'string', description: 'Duration in minutes (default 60).' },
                description: { type: 'string', description: 'Optional description or details for the event.' }
            },
            required: ['title', 'date', 'time']
        }
    }
};

// ============================================================================
// Email Tools
// ============================================================================

const listEmailsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'listEmails',
        description: 'Lists emails from the connected inbox. Returns recent emails with subject, sender, date, and preview snippet. Use the email data already provided in context first before calling this.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'Filter emails by status.',
                    enum: ['all', 'unread', 'read']
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of emails to return (default 10, max 20).'
                }
            },
            required: []
        }
    }
};

const searchEmailsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'searchEmails',
        description: 'Searches emails by subject or sender. Returns matching emails from the synced inbox.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query to match against email subject, sender, or snippet.'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default 5, max 10).'
                }
            },
            required: ['query']
        }
    }
};

const getEmailDetailsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'getEmailDetails',
        description: 'Gets detailed information about a specific email by ID, including full body content if available.',
        parameters: {
            type: 'object',
            properties: {
                emailId: {
                    type: 'string',
                    description: 'The ID of the email to retrieve details for.'
                }
            },
            required: ['emailId']
        }
    }
};

const createTaskFromEmailTool: GroqTool = {
    type: 'function',
    function: {
        name: 'createTaskFromEmail',
        description: 'Creates a task based on an email. Useful for tracking action items from emails.',
        parameters: {
            type: 'object',
            properties: {
                emailId: {
                    type: 'string',
                    description: 'The ID of the email to create a task from.'
                },
                taskText: {
                    type: 'string',
                    description: 'The task description. If not provided, will use email subject.'
                },
                priority: {
                    type: 'string',
                    description: 'Priority of the task.',
                    enum: ['Low', 'Medium', 'High']
                },
                dueDate: {
                    type: ['string', 'null'],
                    description: 'Optional due date in YYYY-MM-DD format.'
                },
                category: {
                    type: 'string',
                    description: 'The task category.',
                    enum: ['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks']
                }
            },
            required: ['emailId', 'category']
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
    searchContactsTool,
    createMeetingTool,
    updateMeetingTool,
    deleteMeetingTool,
    logFinancialsTool,
    createExpenseTool,
    updateExpenseTool,
    deleteItemTool,
    createMarketingItemTool,
    updateMarketingItemTool,
    updateSettingsTool,
    uploadDocumentTool,
    updateDocumentTool,
    getFileContentTool,
    createEventTool,
    // Email tools
    listEmailsTool,
    searchEmailsTool,
    getEmailDetailsTool,
    createTaskFromEmailTool,
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
    
    // Task tools (available everywhere for cross-module task creation)
    const taskTools = [createTaskTool, updateTaskTool, deleteItemTool, createEventTool];
    
    // CRM tools (available everywhere for cross-module CRM management)
    const crmTools = [
        createCrmItemTool,
        updateCrmItemTool,
        createContactTool,
        updateContactTool,
        deleteContactTool,
        searchContactsTool,
        createMeetingTool,
        updateMeetingTool,
        deleteMeetingTool
    ];
    
    // Marketing tools (available everywhere)
    const marketingTools = [createMarketingItemTool, updateMarketingItemTool];
    
    // Financial tools (available everywhere)
    const financialTools = [logFinancialsTool, createExpenseTool, updateExpenseTool];
    
    // Email tools (for Email tab and available in general context)
    const emailTools = [listEmailsTool, searchEmailsTool, getEmailDetailsTool, createTaskFromEmailTool];
    
    // Tab-specific tools
    switch(tab) {
        case 'settings':
            // Settings: only settings-specific tools
            return [
                updateSettingsTool,
                ...coreTools
            ];
        
        case 'email':
            // Email tab: prioritize email tools + task creation
            return [
                ...emailTools,
                ...taskTools,
                ...coreTools,
                createEventTool
            ];
        
        default:
            // All other tabs: full toolset for complete AI capabilities
            return [
                ...taskTools,
                ...crmTools,
                ...marketingTools,
                ...financialTools,
                ...emailTools,
                ...coreTools,
                ...fileTools
            ];
    }
};
