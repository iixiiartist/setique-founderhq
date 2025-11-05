import { DashboardData, Task, AnyCrmItem, Contact, Meeting, FinancialLog, MarketingItem, Document, SettingsData, TaskCollectionName, CrmCollectionName, NoteableCollectionName, DeletableCollectionName, Priority, AchievementId } from './types';
import { ACHIEVEMENTS } from './constants';

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

const handleGamification = (state: DashboardData, actionType: string, payload?: any): DashboardData => {
    let gamification = { ...state.gamification };
    let newAchievements: AchievementId[] = [];

    // XP Values
    const XP_MAP: Record<string, number> = {
        CREATE_TASK: 5,
        CREATE_CRM_ITEM: 20,
        WIN_DEAL: 100,
        CREATE_CONTACT: 10,
        PUBLISH_MARKETING: 50,
        CREATE_MARKETING_ITEM: 25,
    };

    // 1. Update XP
    let xpToAdd = 0;
    if (actionType === 'COMPLETE_TASK' && payload?.priority) {
        const priorityXpMap: Record<Priority, number> = { 'Low': 10, 'Medium': 50, 'High': 100 };
        xpToAdd = priorityXpMap[payload.priority] || 50;
        if (payload.isOverdue) {
            xpToAdd += 5;
        }
    } else if (actionType === 'LOG_FINANCIALS' && payload?.logData) {
        const BASE_XP = 10;
        const XP_PER_SIGNUP = 2;
        xpToAdd = BASE_XP + (payload.logData.signups * XP_PER_SIGNUP);
    } else {
        xpToAdd = (XP_MAP as any)[actionType] || 0;
    }
    gamification.xp += xpToAdd;

    // 2. Update Streak
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (gamification.lastActivityDate !== todayStr) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (gamification.lastActivityDate === yesterdayStr) {
            gamification.streak += 1;
        } else {
            gamification.streak = 1;
        }
        gamification.lastActivityDate = todayStr;
    }

    // 3. Check for Level Up
    const levelThreshold = (level: number) => 100 * level + Math.pow(level, 2) * 50;
    let currentThreshold = levelThreshold(gamification.level);
    while (gamification.xp >= currentThreshold) {
        gamification.level += 1;
        gamification.xp -= currentThreshold;
        currentThreshold = levelThreshold(gamification.level);
    }

    // 4. Check for Achievements
    const checkAndAddAchievement = (id: AchievementId) => {
        if (!gamification.achievements.includes(id)) {
            newAchievements.push(id);
        }
    };
    
    const allTasksInNewData = [...state.platformTasks, ...state.investorTasks, ...state.customerTasks, ...state.partnerTasks, ...state.marketingTasks, ...state.financialTasks];
    const completedTasks = allTasksInNewData.filter(t => t.status === 'Done');

    if (completedTasks.length >= 1) checkAndAddAchievement('first-task');
    if (completedTasks.length >= 10) checkAndAddAchievement('ten-tasks');
    if (state.investors.length >= 1) checkAndAddAchievement('first-investor');
    if (state.customers.length >= 1) checkAndAddAchievement('first-customer');
    if (state.partners.length >= 1) checkAndAddAchievement('first-partner');
    if (state.customers.some(c => c.status === 'Won')) checkAndAddAchievement('first-deal');
    if (state.marketing.filter(m => m.status === 'Published').length >= 5) checkAndAddAchievement('content-machine');
    
    if (gamification.streak >= 3) checkAndAddAchievement('streak-3');
    if (gamification.streak >= 7) checkAndAddAchievement('streak-7');
    if (gamification.streak >= 30) checkAndAddAchievement('streak-30');

    if (gamification.level >= 2) checkAndAddAchievement('level-2');
    if (gamification.level >= 5) checkAndAddAchievement('level-5');
    if (gamification.level >= 10) checkAndAddAchievement('level-10');

    if (newAchievements.length > 0) {
        gamification.achievements = [...gamification.achievements, ...newAchievements];
    }

    return { ...state, gamification };
};

export const appReducer = (state: DashboardData, action: AppAction): DashboardData => {
    switch(action.type) {
        case 'CREATE_TASK': {
            const { category, task } = action.payload;
            const newState = { ...state, [category]: [task, ...state[category]] };
            return handleGamification(newState, 'CREATE_TASK');
        }
        case 'UPDATE_TASK': {
            const { taskId, updates } = action.payload;
            const taskCollections: TaskCollectionName[] = ['platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'];
            
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
                return handleGamification(newState, 'COMPLETE_TASK', { priority: taskBeforeUpdate.priority, isOverdue });
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
            return handleGamification(newState, 'CREATE_CRM_ITEM');
        }

        case 'UPDATE_CRM_ITEM': {
            const { collection, itemId, updates } = action.payload;
            const itemIndex = state[collection].findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                const newItems = [...state[collection]];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
                const newState = { ...state, [collection]: newItems };
                if (updates.status === 'Won') {
                    return handleGamification(newState, 'WIN_DEAL');
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
                return handleGamification(newState, 'CREATE_CONTACT');
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
            return handleGamification(newState, 'LOG_FINANCIALS', { logData: newLog });
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
            return handleGamification(newState, 'CREATE_MARKETING_ITEM');
        }

        case 'UPDATE_MARKETING_ITEM': {
            const { itemId, updates } = action.payload;
            const itemIndex = state.marketing.findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                const newItems = [...state.marketing];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
                const newState = { ...state, marketing: newItems };
                if (updates.status === 'Published') {
                    return handleGamification(newState, 'PUBLISH_MARKETING');
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
