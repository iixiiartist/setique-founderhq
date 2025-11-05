import { FunctionDeclaration, Type } from '@google/genai';

const createTaskDeclaration: FunctionDeclaration = {
    name: 'createTask',
    description: 'Creates a new task for a specific category. You can optionally assign the task to a specific team member.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: {
                type: Type.STRING,
                description: 'The category of the task.',
                enum: ['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks']
            },
            text: { type: Type.STRING, description: 'The content or description of the task.' },
            priority: {
                type: Type.STRING,
                description: 'The priority of the task.',
                enum: ['Low', 'Medium', 'High']
            },
            dueDate: { type: Type.STRING, description: 'Optional. The due date for the task in YYYY-MM-DD format.' },
            assignedTo: { type: Type.STRING, description: 'Optional. Email address of the team member to assign this task to. Only use if a specific person should handle this task.' }
        },
        required: ['category', 'text', 'priority']
    }
};

const updateTaskDeclaration: FunctionDeclaration = {
    name: 'updateTask',
    description: 'Updates an existing task. To find the taskId, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            taskId: { type: Type.STRING, description: 'The ID of the task to update.' },
            updates: {
                type: Type.OBJECT,
                description: 'The fields to update.',
                properties: {
                    text: { type: Type.STRING, description: 'The new content of the task.' },
                    status: { type: Type.STRING, description: 'The new status of the task.', enum: ['Todo', 'InProgress', 'Done'] },
                    priority: {
                        type: Type.STRING,
                        description: 'The new priority for the task.',
                        enum: ['Low', 'Medium', 'High']
                    },
                    dueDate: { type: Type.STRING, description: 'The new due date for the task in YYYY-MM-DD format.' }
                }
            }
        },
        required: ['taskId', 'updates']
    }
};

const addNoteDeclaration: FunctionDeclaration = {
    name: 'addNote',
    description: 'Adds a note to a CRM item, task, document, or marketing item. To find the itemId, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: {
                type: Type.STRING,
                description: 'The collection where the item exists.',
                enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
            },
            itemId: { type: Type.STRING, description: 'The ID of the item to add the note to.' },
            noteText: { type: Type.STRING, description: 'The content of the note.' },
            crmItemId: { type: Type.STRING, description: 'Required if collection is "contacts". The ID of the parent CRM item.' }
        },
        required: ['collection', 'itemId', 'noteText']
    }
};

const updateNoteDeclaration: FunctionDeclaration = {
    name: 'updateNote',
    description: 'Updates an existing note on an item. To find the itemId and noteTimestamp, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: {
                type: Type.STRING,
                description: 'The collection where the item exists.',
                enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
            },
            itemId: { type: Type.STRING, description: 'The ID of the item containing the note.' },
            noteTimestamp: { type: Type.NUMBER, description: 'The timestamp of the note to update.' },
            newText: { type: Type.STRING, description: 'The new content for the note.' },
            crmItemId: { type: Type.STRING, description: 'Required if collection is "contacts". The ID of the parent CRM item.' }
        },
        required: ['collection', 'itemId', 'noteTimestamp', 'newText']
    }
};

const deleteNoteDeclaration: FunctionDeclaration = {
    name: 'deleteNote',
    description: 'Deletes a note from an item. To find the itemId and noteTimestamp, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: {
                type: Type.STRING,
                description: 'The collection where the item exists.',
                enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts']
            },
            itemId: { type: Type.STRING, description: 'The ID of the item containing the note.' },
            noteTimestamp: { type: Type.NUMBER, description: 'The timestamp of the note to delete.' },
            crmItemId: { type: Type.STRING, description: 'Required if collection is "contacts". The ID of the parent CRM item.' }
        },
        required: ['collection', 'itemId', 'noteTimestamp']
    }
};

const createCrmItemDeclaration: FunctionDeclaration = {
    name: 'createCrmItem',
    description: 'Creates a new CRM item (investor, customer, or partner).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: {
                type: Type.STRING,
                description: 'The type of CRM item to create.',
                enum: ['investors', 'customers', 'partners']
            },
            data: {
                type: Type.OBJECT,
                description: 'The data for the new CRM item.',
                properties: {
                    company: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    status: { type: Type.STRING },
                    checkSize: { type: Type.NUMBER, description: 'For investors only.' },
                    dealValue: { type: Type.NUMBER, description: 'For customers only.' },
                    opportunity: { type: Type.STRING, description: 'For partners only.' },
                },
                required: ['company']
            }
        },
        required: ['collection', 'data']
    }
};

const updateCrmItemDeclaration: FunctionDeclaration = {
    name: 'updateCrmItem',
    description: 'Updates an existing CRM item. To find the itemId, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: {
                type: Type.STRING,
                description: 'The type of CRM item to update.',
                enum: ['investors', 'customers', 'partners']
            },
            itemId: { type: Type.STRING, description: 'The ID of the item to update.' },
            updates: {
                type: Type.OBJECT,
                description: 'The fields to update.',
                properties: {
                    company: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    status: { type: Type.STRING },
                    nextAction: { type: Type.STRING },
                    nextActionDate: { type: Type.STRING, description: 'Date in YYYY-MM-DD format.' },
                    checkSize: { type: Type.NUMBER, description: 'For investors only.' },
                    dealValue: { type: Type.NUMBER, description: 'For customers only.' },
                    opportunity: { type: Type.STRING, description: 'For partners only.' },
                }
            }
        },
        required: ['collection', 'itemId', 'updates']
    }
};

const createContactDeclaration: FunctionDeclaration = {
    name: 'createContact',
    description: 'Creates a new contact for a specific company (CRM item). Find crmItemId in the context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: { type: Type.STRING, description: 'The CRM collection of the parent company.', enum: ['investors', 'customers', 'partners'] },
            crmItemId: { type: Type.STRING, description: 'The ID of the CRM item to add the contact to.' },
            contactData: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    email: { type: Type.STRING },
                    linkedin: { type: Type.STRING }
                },
                required: ['name']
            }
        },
        required: ['collection', 'crmItemId', 'contactData']
    }
};

const updateContactDeclaration: FunctionDeclaration = {
    name: 'updateContact',
    description: 'Updates an existing contact. Find IDs in the context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: { type: Type.STRING, description: 'The CRM collection of the parent company.', enum: ['investors', 'customers', 'partners'] },
            crmItemId: { type: Type.STRING, description: 'The ID of the parent CRM item.' },
            contactId: { type: Type.STRING, description: 'The ID of the contact to update.' },
            updates: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    email: { type: Type.STRING },
                    linkedin: { type: Type.STRING }
                }
            }
        },
        required: ['collection', 'crmItemId', 'contactId', 'updates']
    }
};

const deleteContactDeclaration: FunctionDeclaration = {
    name: 'deleteContact',
    description: 'Deletes a contact from a CRM item. Find IDs in the context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: { type: Type.STRING, description: 'The CRM collection of the parent company.', enum: ['investors', 'customers', 'partners'] },
            crmItemId: { type: Type.STRING, description: 'The ID of the parent CRM item.' },
            contactId: { type: Type.STRING, description: 'The ID of the contact to delete.' }
        },
        required: ['collection', 'crmItemId', 'contactId']
    }
};

const createMeetingDeclaration: FunctionDeclaration = {
    name: 'createMeeting',
    description: 'Creates a meeting note for a specific contact. To find the crmItemId and contactId, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: { type: Type.STRING, description: 'The CRM collection of the parent company.', enum: ['investors', 'customers', 'partners'] },
            crmItemId: { type: Type.STRING, description: 'The ID of the parent CRM item (company).' },
            contactId: { type: Type.STRING, description: 'The ID of the contact the meeting was with.' },
            meetingData: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'The title of the meeting.' },
                    attendees: { type: Type.STRING, description: 'A comma-separated list of attendees.' },
                    summary: { type: Type.STRING, description: 'A summary of the meeting. Can be in Markdown format.' },
                    timestamp: { type: Type.NUMBER, description: 'The epoch timestamp of the meeting.' }
                },
                required: ['title', 'summary', 'timestamp']
            }
        },
        required: ['collection', 'crmItemId', 'contactId', 'meetingData']
    }
};

const updateMeetingDeclaration: FunctionDeclaration = {
    name: 'updateMeeting',
    description: 'Updates an existing meeting note for a contact. To find IDs, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: { type: Type.STRING, description: 'The CRM collection of the parent company.', enum: ['investors', 'customers', 'partners'] },
            crmItemId: { type: Type.STRING, description: 'The ID of the parent CRM item (company).' },
            contactId: { type: Type.STRING, description: 'The ID of the contact.' },
            meetingId: { type: Type.STRING, description: 'The ID of the meeting to update.' },
            updates: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'The new title.' },
                    attendees: { type: Type.STRING, description: 'The updated list of attendees.' },
                    summary: { type: Type.STRING, description: 'The new summary.' }
                }
            }
        },
        required: ['collection', 'crmItemId', 'contactId', 'meetingId', 'updates']
    }
};

const deleteMeetingDeclaration: FunctionDeclaration = {
    name: 'deleteMeeting',
    description: 'Deletes a meeting note from a contact. To find IDs, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            collection: { type: Type.STRING, description: 'The CRM collection of the parent company.', enum: ['investors', 'customers', 'partners'] },
            crmItemId: { type: Type.STRING, description: 'The ID of the parent CRM item (company).' },
            contactId: { type: Type.STRING, description: 'The ID of the contact.' },
            meetingId: { type: Type.STRING, description: 'The ID of the meeting to delete.' },
        },
        required: ['collection', 'crmItemId', 'contactId', 'meetingId']
    }
};

const logFinancialsDeclaration: FunctionDeclaration = {
    name: 'logFinancials',
    description: 'Logs a new financial snapshot for a specific date.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            data: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: 'The date for the log, in YYYY-MM-DD format.' },
                    mrr: { type: Type.NUMBER, description: 'Monthly Recurring Revenue in USD.' },
                    gmv: { type: Type.NUMBER, description: 'Gross Merchandise Value in USD.' },
                    signups: { type: Type.NUMBER, description: 'Total number of new signups.' }
                },
                required: ['date', 'mrr', 'gmv', 'signups']
            }
        },
        required: ['data']
    }
};

const deleteItemDeclaration: FunctionDeclaration = {
    name: 'deleteItem',
    description: 'Deletes an item from the dashboard. This is permanent. To find the itemId, look at the dashboard context.',
     parameters: {
        type: Type.OBJECT,
        properties: {
            collection: {
                type: Type.STRING,
                description: 'The collection from which to delete the item.',
                 enum: ['investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'financials', 'marketingTasks', 'financialTasks']
            },
            itemId: { type: Type.STRING, description: 'The ID of the item to delete.' }
        },
        required: ['collection', 'itemId']
    }
};

const createMarketingItemDeclaration: FunctionDeclaration = {
    name: 'createMarketingItem',
    description: 'Creates a new marketing item, like a blog post or campaign.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            itemData: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other'] },
                    status: { type: Type.STRING, enum: ['Planned', 'In Progress', 'Completed', 'Published', 'Cancelled'] },
                    dueDate: { type: Type.STRING, description: 'Optional. The due date for the marketing item in YYYY-MM-DD format.' }
                },
                required: ['title', 'type', 'status']
            }
        },
        required: ['itemData']
    }
};

const updateMarketingItemDeclaration: FunctionDeclaration = {
    name: 'updateMarketingItem',
    description: 'Updates an existing marketing item. To find the itemId, look at the dashboard context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            itemId: { type: Type.STRING, description: 'The ID of the marketing item to update.' },
            updates: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other'] },
                    status: { type: Type.STRING, enum: ['Planned', 'In Progress', 'Completed', 'Published', 'Cancelled'] },
                    dueDate: { type: Type.STRING, description: 'The new due date for the marketing item in YYYY-MM-DD format.' }
                }
            }
        },
        required: ['itemId', 'updates']
    }
};

const updateSettingsDeclaration: FunctionDeclaration = {
    name: 'updateSettings',
    description: 'Updates the user settings for notifications.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            updates: {
                type: Type.OBJECT,
                properties: {
                    desktopNotifications: { type: Type.BOOLEAN, description: 'Enable or disable desktop notifications for overdue items.' },
                }
            }
        },
        required: ['updates']
    }
};

const uploadDocumentDeclaration: FunctionDeclaration = {
    name: 'uploadDocument',
    description: 'Saves a file to the File Library for future reference. Use the content provided in the user message. Infer related company or contact from the conversation context if possible.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'The name of the file.' },
            mimeType: { type: Type.STRING, description: 'The MIME type of the file.' },
            content: { type: Type.STRING, description: 'The base64 encoded content of the file.' },
            module: { type: Type.STRING, description: 'The dashboard module this file relates to.', enum: ['dashboard', 'calendar', 'platform-dev', 'investor-crm', 'customer-crm', 'partnerships', 'marketing', 'financials', 'documents', 'achievements', 'settings'] },
            companyId: { type: Type.STRING, description: 'Optional. The ID of the company this document relates to. Find the ID in the CRM context.' },
            contactId: { type: Type.STRING, description: 'Optional. The ID of the contact this document relates to. Find the ID in the CRM context.' },
        },
        required: ['name', 'mimeType', 'content', 'module']
    }
};

const updateDocumentDeclaration: FunctionDeclaration = {
    name: 'updateDocument',
    description: 'Replaces an existing document in the File Library with new content. To find the docId, look at the File Library context.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            docId: { type: Type.STRING, description: 'The ID of the document to replace.' },
            name: { type: Type.STRING, description: 'The new name of the file.' },
            mimeType: { type: Type.STRING, description: 'The new MIME type of the file.' },
            content: { type: Type.STRING, description: 'The new base64 encoded content of the file.' },
        },
        required: ['docId', 'name', 'mimeType', 'content']
    }
};

const getFileContentDeclaration: FunctionDeclaration = {
    name: 'getFileContent',
    description: 'Retrieves the content of a specific file from the file library. The content will be returned to you in the next turn, do not try to make it up.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            fileId: { type: Type.STRING, description: 'The ID of the file to retrieve.' }
        },
        required: ['fileId']
    }
};

export const geminiTools: FunctionDeclaration[] = [
    createTaskDeclaration,
    updateTaskDeclaration,
    addNoteDeclaration,
    updateNoteDeclaration,
    deleteNoteDeclaration,
    createCrmItemDeclaration,
    updateCrmItemDeclaration,
    createContactDeclaration,
    updateContactDeclaration,
    deleteContactDeclaration,
    createMeetingDeclaration,
    updateMeetingDeclaration,
    deleteMeetingDeclaration,
    logFinancialsDeclaration,
    deleteItemDeclaration,
    createMarketingItemDeclaration,
    updateMarketingItemDeclaration,
    updateSettingsDeclaration,
    uploadDocumentDeclaration,
    updateDocumentDeclaration,
    getFileContentDeclaration,
];
