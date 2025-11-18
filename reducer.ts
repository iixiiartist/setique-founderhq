import { DashboardData, Task, AnyCrmItem, Contact, Meeting, FinancialLog, MarketingItem, Document, SettingsData, TaskCollectionName, CrmCollectionName, NoteableCollectionName, DeletableCollectionName, Priority } from './types';

type AppAction =
    | { type: 'CREATE_TASK'; payload: { category: TaskCollectionName, task: Task } }
    | { type: 'UPDATE_TASK'; payload: { taskId: string, updates: Partial<Task>, allTasks: DashboardData } }
    | { type: 'ADD_NOTE'; payload: { collection: NoteableCollectionName, itemId: string, noteText: string, crmItemId?: string } }
    | { type: 'UPDATE_NOTE'; payload: { collection: NoteableCollectionName, itemId: string, noteTimestamp: number, newText: string, crmItemId?: string } }
    | { type: 'DELETE_NOTE'; payload: { collection: NoteableCollectionName, itemId: string, noteTimestamp: number, crmItemId?: string } }
    | { type: 'CREATE_CRM_ITEM'; payload: { collection: CrmCollectionName, item: AnyCrmItem } }
    | { type: 'UPDATE_CRM_ITEM'; payload: { collection: CrmCollectionName, itemId: string, updates: Partial<AnyCrmItem> } }
    | { type: 'CREATE_CONTACT'; payload: { collection: CrmCollectionName, crmItemId: string, contact: Contact } }
    | { type: 'UPDATE_CONTACT'; payload: { collection: CrmCollectionName, crmItemId: string, contactId: string, updates: Partial<Contact> } }
    | { type: 'DELETE_CONTACT'; payload: { collection: CrmCollectionName, crmItemId: string, contactId: string } }
    | { type: 'CREATE_MEETING'; payload: { collection: CrmCollectionName, crmItemId: string, contactId: string, meeting: Meeting } }
    | { type: 'UPDATE_MEETING'; payload: { collection: CrmCollectionName, crmItemId: string, contactId: string, meetingId: string, updates: Partial<Omit<Meeting, 'id'>> } }
    | { type: 'DELETE_MEETING'; payload: { collection: CrmCollectionName, crmItemId: string, contactId: string, meetingId: string } }
    | { type: 'LOG_FINANCIALS'; payload: FinancialLog }
    | { type: 'DELETE_ITEM'; payload: { collection: DeletableCollectionName, itemId: string } }
    | { type: 'CREATE_MARKETING_ITEM'; payload: MarketingItem }
    | { type: 'UPDATE_MARKETING_ITEM'; payload: { itemId: string, updates: Partial<MarketingItem> } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<SettingsData> }
    | { type: 'UPLOAD_DOCUMENT'; payload: Document }
    | { type: 'UPDATE_DOCUMENT'; payload: { docId: string, name: string, mimeType: string, content: string } }
    | { type: 'DELETE_DOCUMENT'; payload: { docId: string } };

export const appReducer = (state: DashboardData, action: AppAction): DashboardData => {
    switch(action.type) {
        case 'CREATE_TASK': {
            const { category, task } = action.payload;
            const newState = { ...state, [category]: [task, ...state[category]] };
            return newState;
        }
        case 'UPDATE_TASK': {
            const { taskId, updates } = action.payload;
            const taskCollections: TaskCollectionName[] = ['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'];
            
            let taskBeforeUpdate: Task | undefined;
            for (const collection of taskCollections) {
                const task = state[collection].find(t => t.id === taskId);
                if (task) {
                    taskBeforeUpdate = task;
                    break;
                }
            }

            const newState = { ...state };
            let updated = false;
            for (const collection of taskCollections) {
                const taskIndex = newState[collection].findIndex(t => t.id === taskId);
                if (taskIndex > -1) {
                    const newCollection = [...newState[collection]];
                    const oldTask = newCollection[taskIndex];
                    newCollection[taskIndex] = { 
                        ...oldTask, 
                        ...updates, 
                        ...(updates.status === 'Done' && !oldTask.completedAt && { completedAt: Date.now() }) 
                    };
                    newState[collection] = newCollection;
                    updated = true;
                    break;
                }
            }

            if (updated && updates.status === 'Done' && taskBeforeUpdate?.status !== 'Done') {
                const todayStr = new Date().toISOString().split('T')[0];
                const isOverdue = !!taskBeforeUpdate.dueDate && taskBeforeUpdate.dueDate < todayStr;
                return newState;
            }
            
            return newState;
        }

        case 'ADD_NOTE': {
            const { collection, itemId, noteText, crmItemId } = action.payload;
            const newState = { ...state };
            if (collection === 'contacts' && crmItemId) {
                const crmCollectionName = (crmItemId.split('-')[0] === 'in' ? 'investors' : crmItemId.split('-')[0] === 'cu' ? 'customers' : 'partners') as CrmCollectionName;
                const crmItemIndex = newState[crmCollectionName].findIndex(c => c.id === crmItemId);
                if (crmItemIndex > -1) {
                    const contactIndex = newState[crmCollectionName][crmItemIndex].contacts.findIndex(con => con.id === itemId);
                    if (contactIndex > -1) {
                        const newCrmItems = [...newState[crmCollectionName]];
                        const newContacts = [...newCrmItems[crmItemIndex].contacts];
                        const oldNotes = newContacts[contactIndex].notes || [];
                        newContacts[contactIndex] = { ...newContacts[contactIndex], notes: [{ text: noteText, timestamp: Date.now() }, ...oldNotes] };
                        newCrmItems[crmItemIndex] = { ...newCrmItems[crmItemIndex], contacts: newContacts };
                        return { ...newState, [crmCollectionName]: newCrmItems };
                    }
                }
            } else {
                const currentCollection = newState[collection as Exclude<NoteableCollectionName, 'contacts'>] as (Task | AnyCrmItem | MarketingItem | Document)[];
                const itemIndex = currentCollection.findIndex(item => item.id === itemId);

                if (itemIndex > -1) {
                    const newItems = [...currentCollection];
                    const item = newItems[itemIndex];
                    const updatedNotes = item.notes ? [{ text: noteText, timestamp: Date.now() }, ...item.notes] : [{ text: noteText, timestamp: Date.now() }];
                    newItems[itemIndex] = { ...item, notes: updatedNotes };
                    return { ...newState, [collection as Exclude<NoteableCollectionName, 'contacts'>]: newItems as any};
                }
            }
            return newState;
        }

        case 'UPDATE_NOTE': {
             const { collection, itemId, noteTimestamp, newText, crmItemId } = action.payload;
            const newState = { ...state };
             if (collection === 'contacts' && crmItemId) {
                const crmCollectionName = (crmItemId.split('-')[0] === 'in' ? 'investors' : crmItemId.split('-')[0] === 'cu' ? 'customers' : 'partners') as CrmCollectionName;
                const crmItemIndex = newState[crmCollectionName].findIndex(c => c.id === crmItemId);
                if (crmItemIndex > -1) {
                    const contactIndex = newState[crmCollectionName][crmItemIndex].contacts.findIndex(con => con.id === itemId);
                    if (contactIndex > -1) {
                         const noteIndex = newState[crmCollectionName][crmItemIndex].contacts[contactIndex].notes.findIndex(n => n.timestamp === noteTimestamp);
                         if (noteIndex > -1) {
                            const newCrmItems = [...newState[crmCollectionName]];
                            const newContacts = [...newCrmItems[crmItemIndex].contacts];
                            const newNotes = [...newContacts[contactIndex].notes];
                            newNotes[noteIndex] = { ...newNotes[noteIndex], text: newText };
                            newContacts[contactIndex] = { ...newContacts[contactIndex], notes: newNotes };
                            newCrmItems[crmItemIndex] = { ...newCrmItems[crmItemIndex], contacts: newContacts };
                            return { ...newState, [crmCollectionName]: newCrmItems };
                         }
                    }
                }
            } else {
                const currentCollection = newState[collection as Exclude<NoteableCollectionName, 'contacts'>] as (Task | AnyCrmItem | MarketingItem | Document)[];
                const itemIndex = currentCollection.findIndex(item => item.id === itemId);

                if (itemIndex > -1) {
                    const item = currentCollection[itemIndex];
                    const noteIndex = item.notes.findIndex(note => note.timestamp === noteTimestamp);
                    if (noteIndex > -1) {
                        const newItems = [...currentCollection];
                        const newNotes = [...item.notes];
                        newNotes[noteIndex] = { ...newNotes[noteIndex], text: newText };
                        newItems[itemIndex] = { ...item, notes: newNotes };
                        return { ...newState, [collection as Exclude<NoteableCollectionName, 'contacts'>]: newItems as any };
                    }
                }
            }
            return newState;
        }

        case 'DELETE_NOTE': {
            const { collection, itemId, noteTimestamp, crmItemId } = action.payload;
            const newState = { ...state };
            if (collection === 'contacts' && crmItemId) {
                const crmCollectionName = (crmItemId.split('-')[0] === 'in' ? 'investors' : crmItemId.split('-')[0] === 'cu' ? 'customers' : 'partners') as CrmCollectionName;
                 const crmItemIndex = newState[crmCollectionName].findIndex(c => c.id === crmItemId);
                if (crmItemIndex > -1) {
                    const contactIndex = newState[crmCollectionName][crmItemIndex].contacts.findIndex(con => con.id === itemId);
                    if (contactIndex > -1) {
                         const updatedNotes = newState[crmCollectionName][crmItemIndex].contacts[contactIndex].notes.filter(n => n.timestamp !== noteTimestamp);
                         const newCrmItems = [...newState[crmCollectionName]];
                         const newContacts = [...newCrmItems[crmItemIndex].contacts];
                         newContacts[contactIndex] = { ...newContacts[contactIndex], notes: updatedNotes };
                         newCrmItems[crmItemIndex] = { ...newCrmItems[crmItemIndex], contacts: newContacts };
                         return { ...newState, [crmCollectionName]: newCrmItems };
                    }
                }
            } else {
                const currentCollection = newState[collection as Exclude<NoteableCollectionName, 'contacts'>] as (Task | AnyCrmItem | MarketingItem | Document)[];
                const itemIndex = currentCollection.findIndex(item => item.id === itemId);

                if (itemIndex > -1) {
                    const item = currentCollection[itemIndex];
                    const updatedNotes = item.notes.filter(note => note.timestamp !== noteTimestamp);
                    const newItems = [...currentCollection];
                    newItems[itemIndex] = { ...item, notes: updatedNotes };
                    return { ...newState, [collection as Exclude<NoteableCollectionName, 'contacts'>]: newItems as any };
                }
            }
            return newState;
        }

        case 'CREATE_CRM_ITEM': {
            const { collection, item } = action.payload;
            const newState = { ...state, [collection]: [item, ...state[collection]] };
            return newState;
        }

        case 'UPDATE_CRM_ITEM': {
            const { collection, itemId, updates } = action.payload;
            const itemIndex = state[collection].findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                const newItems = [...state[collection]];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updates } as any;
                const newState = { ...state, [collection]: newItems };
                if (updates.status === 'Won') {
                    return newState;
                }
                return newState;
            }
            return state;
        }

        case 'CREATE_CONTACT': {
            const { collection, crmItemId, contact } = action.payload;
            const itemIndex = state[collection].findIndex(item => item.id === crmItemId);
             if (itemIndex > -1) {
                const newItems = [...state[collection]];
                const oldContacts = newItems[itemIndex].contacts || [];
                newItems[itemIndex] = { ...newItems[itemIndex], contacts: [contact, ...oldContacts] };
                const newState = { ...state, [collection]: newItems };
                return newState;
            }
            return state;
        }
        
        case 'UPDATE_CONTACT': {
            const { collection, crmItemId, contactId, updates } = action.payload;
            const newState = { ...state };
            const itemIndex = newState[collection].findIndex(item => item.id === crmItemId);
            if (itemIndex > -1) {
                const contactIndex = newState[collection][itemIndex].contacts.findIndex(c => c.id === contactId);
                if (contactIndex > -1) {
                    const newItems = [...newState[collection]];
                    const newContacts = [...newItems[itemIndex].contacts];
                    newContacts[contactIndex] = { ...newContacts[contactIndex], ...updates };
                    newItems[itemIndex] = { ...newItems[itemIndex], contacts: newContacts };
                    return { ...newState, [collection]: newItems };
                }
            }
            return newState;
        }

        case 'DELETE_CONTACT': {
            const { collection, crmItemId, contactId } = action.payload;
            const newState = { ...state };
            const itemIndex = newState[collection].findIndex(item => item.id === crmItemId);
            if (itemIndex > -1) {
                const updatedContacts = newState[collection][itemIndex].contacts.filter(c => c.id !== contactId);
                const newItems = [...newState[collection]];
                newItems[itemIndex] = { ...newItems[itemIndex], contacts: updatedContacts };
                return { ...newState, [collection]: newItems };
            }
            return newState;
        }

        case 'CREATE_MEETING': {
            const { collection, crmItemId, contactId, meeting } = action.payload;
            const newState = { ...state };
            const crmItemIndex = newState[collection].findIndex(c => c.id === crmItemId);
            if (crmItemIndex > -1) {
                const contactIndex = newState[collection][crmItemIndex].contacts.findIndex(con => con.id === contactId);
                if (contactIndex > -1) {
                    const newCrmItems = [...newState[collection]];
                    const crmItem = { ...newCrmItems[crmItemIndex] };
                    const newContacts = [...crmItem.contacts];
                    const contact = { ...newContacts[contactIndex] };
                    const oldMeetings = contact.meetings || [];
                    
                    contact.meetings = [meeting, ...oldMeetings];
                    newContacts[contactIndex] = contact;
                    crmItem.contacts = newContacts;
                    newCrmItems[crmItemIndex] = crmItem;
                    
                    return { ...newState, [collection]: newCrmItems };
                }
            }
            return newState;
        }

        case 'UPDATE_MEETING': {
            const { collection, crmItemId, contactId, meetingId, updates } = action.payload;
            const newState = { ...state };
            const crmItemIndex = newState[collection].findIndex(c => c.id === crmItemId);
            if (crmItemIndex > -1) {
                const contactIndex = newState[collection][crmItemIndex].contacts.findIndex(con => con.id === contactId);
                if (contactIndex > -1) {
                    const meetingIndex = newState[collection][crmItemIndex].contacts[contactIndex].meetings.findIndex(m => m.id === meetingId);
                    if (meetingIndex > -1) {
                        const newCrmItems = [...newState[collection]];
                        const crmItem = { ...newCrmItems[crmItemIndex] };
                        const newContacts = [...crmItem.contacts];
                        const contact = { ...newContacts[contactIndex] };
                        const newMeetings = [...contact.meetings];
                        newMeetings[meetingIndex] = { ...newMeetings[meetingIndex], ...updates };
                        contact.meetings = newMeetings;
                        newContacts[contactIndex] = contact;
                        crmItem.contacts = newContacts;
                        newCrmItems[crmItemIndex] = crmItem;

                        return { ...newState, [collection]: newCrmItems };
                    }
                }
            }
            return newState;
        }

        case 'DELETE_MEETING': {
             const { collection, crmItemId, contactId, meetingId } = action.payload;
            const newState = { ...state };
            const crmItemIndex = newState[collection].findIndex(c => c.id === crmItemId);
            if (crmItemIndex > -1) {
                const contactIndex = newState[collection][crmItemIndex].contacts.findIndex(con => con.id === contactId);
                if (contactIndex > -1) {
                    const newCrmItems = [...newState[collection]];
                    const crmItem = { ...newCrmItems[crmItemIndex] };
                    const newContacts = [...crmItem.contacts];
                    const contact = { ...newContacts[contactIndex] };
                    
                    contact.meetings = contact.meetings.filter(m => m.id !== meetingId);
                    newContacts[contactIndex] = contact;
                    crmItem.contacts = newContacts;
                    newCrmItems[crmItemIndex] = crmItem;

                    return { ...newState, [collection]: newCrmItems };
                }
            }
            return newState;
        }

        case 'LOG_FINANCIALS': {
            const newLog = action.payload;
            const newState = { ...state, financials: [newLog, ...state.financials] };
            return newState;
        }
        
        case 'DELETE_ITEM': {
            const { collection, itemId } = action.payload;
            const currentCollection = state[collection];
            const updatedCollection = currentCollection.filter((item: any) => item.id !== itemId);
            if (currentCollection.length !== updatedCollection.length) {
                return { ...state, [collection]: updatedCollection as any };
            }
            return state;
        }

        case 'CREATE_MARKETING_ITEM': {
            const newItem = action.payload;
            const newState = { ...state, marketing: [newItem, ...state.marketing] };
            return newState;
        }

        case 'UPDATE_MARKETING_ITEM': {
            const { itemId, updates } = action.payload;
            const itemIndex = state.marketing.findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                const newItems = [...state.marketing];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
                const newState = { ...state, marketing: newItems };
                if (updates.status === 'Published') {
                    return newState;
                }
                return newState;
            }
            return state;
        }

        case 'UPDATE_SETTINGS': {
            return { ...state, settings: { ...state.settings, ...action.payload } };
        }
        
        case 'UPLOAD_DOCUMENT': {
            return { ...state, documents: [action.payload, ...state.documents] };
        }

        case 'UPDATE_DOCUMENT': {
            const { docId, name, mimeType, content } = action.payload;
            const docIndex = state.documents.findIndex(d => d.id === docId);
            if (docIndex > -1) {
                const newDocs = [...state.documents];
                const oldDoc = newDocs[docIndex];
                newDocs[docIndex] = { ...oldDoc, name, mimeType, content, uploadedAt: Date.now() };
                return { ...state, documents: newDocs };
            }
            return state;
        }

        case 'DELETE_DOCUMENT': {
            return { ...state, documents: state.documents.filter(doc => doc.id !== action.payload.docId) };
        }

        default:
            return state;
    }
}
