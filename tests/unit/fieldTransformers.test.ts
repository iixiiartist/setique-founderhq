import { describe, it, expect } from 'vitest';
import {
  dbToTask,
  dbToMarketingItem,
  dbToCrmItem,
  dbToContact,
  dbToFinancialLog,
  taskToDb,
  marketingItemToDb,
  crmItemToDb,
  contactToDb,
  dbToTasks,
  dbToMarketingItems,
  dbToCrmItems,
  dbToContacts,
  dbToFinancialLogs,
} from '../../lib/utils/fieldTransformers';
import type { Task, MarketingItem, Contact, BaseCrmItem, FinancialLog } from '../../types';

const MOCK_TIMESTAMP = 1705320000000;

describe('Field Transformers - Database to Application', () => {
  describe('dbToTask', () => {
    it('should transform complete database task to application model', () => {
      const dbTask = {
        id: 'task-123',
        text: 'Complete project',
        status: 'Todo',
        priority: 'High',
        created_at: '2024-01-15T10:00:00.000Z',
        completed_at: '2024-01-20T15:30:00.000Z',
        due_date: '2024-01-25',
        due_time: '14:00',
        notes: [{ text: 'Important note', timestamp: 1705320000000 }],
        crm_item_id: 'crm-456',
        contact_id: 'contact-789',
        user_id: 'user-001',
        assigned_to: 'user-002',
        assigned_to_profile: { full_name: 'John Doe' },
      };

      const result = dbToTask(dbTask);

      expect(result).toEqual({
        id: 'task-123',
        text: 'Complete project',
        status: 'Todo',
        priority: 'High',
        category: 'productsServicesTasks',
        createdAt: new Date('2024-01-15T10:00:00.000Z').getTime(),
        completedAt: new Date('2024-01-20T15:30:00.000Z').getTime(),
        dueDate: '2024-01-25',
        dueTime: '14:00',
        notes: [{ text: 'Important note', timestamp: 1705320000000 }],
        subtasks: [],
        crmItemId: 'crm-456',
        contactId: 'contact-789',
        userId: 'user-001',
        assignedTo: 'user-002',
        assignedToName: 'John Doe',
      });
    });

    it('should handle null/undefined optional fields', () => {
      const dbTask = {
        id: 'task-123',
        text: 'Simple task',
        status: 'Todo',
        priority: 'Medium',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [],
        completed_at: null,
        due_date: null,
        due_time: null,
        crm_item_id: null,
        contact_id: null,
        assigned_to: null,
        assigned_to_profile: null,
      };

      const result = dbToTask(dbTask);

      expect(result.completedAt).toBeUndefined();
      expect(result.dueDate).toBeUndefined();
      expect(result.dueTime).toBeUndefined();
      expect(result.crmItemId).toBeUndefined();
      expect(result.contactId).toBeUndefined();
      expect(result.assignedTo).toBeUndefined();
      expect(result.assignedToName).toBeUndefined();
    });

    it('should handle missing assigned_to_profile', () => {
      const dbTask = {
        id: 'task-123',
        text: 'Task',
        status: 'Todo',
        priority: 'Low',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [],
        assigned_to: 'user-002',
        assigned_to_profile: { full_name: undefined },
      };

      const result = dbToTask(dbTask);

      expect(result.assignedTo).toBe('user-002');
      expect(result.assignedToName).toBeUndefined();
    });
  });

  describe('dbToMarketingItem', () => {
    it('should transform complete database marketing item to application model', () => {
      const dbItem = {
        id: 'marketing-123',
        title: 'Launch Campaign',
        type: 'Product Launch',
        status: 'In Progress',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [{ text: 'Campaign notes', timestamp: MOCK_TIMESTAMP }],
        due_date: '2024-02-01',
        due_time: '09:00',
        workspace_id: 'workspace-001',
      };

      const result = dbToMarketingItem(dbItem);

      expect(result).toEqual({
        id: 'marketing-123',
        title: 'Launch Campaign',
        type: 'Product Launch',
        status: 'In Progress',
        createdAt: new Date('2024-01-15T10:00:00.000Z').getTime(),
        notes: [{ text: 'Campaign notes', timestamp: MOCK_TIMESTAMP }],
        dueDate: '2024-02-01',
        dueTime: '09:00',
        workspaceId: 'workspace-001',
      });
    });

    it('should handle null optional fields', () => {
      const dbItem = {
        id: 'marketing-123',
        title: 'Item',
        type: 'Blog Post',
        status: 'Planned',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [],
        due_date: null,
        due_time: null,
        workspace_id: 'workspace-001',
      };

      const result = dbToMarketingItem(dbItem);

      expect(result.dueDate).toBeUndefined();
      expect(result.dueTime).toBeUndefined();
    });
  });

  describe('dbToCrmItem', () => {
    it('should transform complete database CRM item to application model', () => {
      const dbItem = {
        id: 'crm-123',
        company: 'Acme Corp',
        type: 'investor',
        priority: 'High',
        status: 'Active',
        next_action: 'Follow up call',
        next_action_date: '2024-02-01',
        next_action_time: '14:00',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [{ text: 'Meeting notes', timestamp: MOCK_TIMESTAMP }],
        assigned_to: 'user-002',
        assigned_to_name: 'Jane Smith',
      };

      const result = dbToCrmItem(dbItem as any);

      expect(result).toEqual({
        id: 'crm-123',
        company: 'Acme Corp',
        contacts: [],
        priority: 'High',
        status: 'Active',
        type: 'investor',
        nextAction: 'Follow up call',
        nextActionDate: '2024-02-01',
        nextActionTime: '14:00',
        createdAt: new Date('2024-01-15T10:00:00.000Z').getTime(),
        notes: [{ text: 'Meeting notes', timestamp: MOCK_TIMESTAMP }],
        assignedTo: 'user-002',
        assignedToName: 'Jane Smith',
      });
    });

    it('should handle null optional fields', () => {
      const dbItem = {
        id: 'crm-123',
        company: 'Test Inc',
        type: 'customer',
        priority: 'Medium',
        status: 'Active',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [],
        next_action: null,
        next_action_date: null,
        next_action_time: null,
        assigned_to: null,
        assigned_to_name: null,
      };

      const result = dbToCrmItem(dbItem as any);

      expect(result.nextAction).toBeUndefined();
      expect(result.nextActionDate).toBeUndefined();
      expect(result.nextActionTime).toBeUndefined();
      expect(result.assignedTo).toBeUndefined();
      expect(result.assignedToName).toBeUndefined();
    });
  });

  describe('dbToContact', () => {
    it('should transform complete database contact to application model', () => {
      const dbContact = {
        id: 'contact-123',
        crm_item_id: 'crm-456',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'CEO',
        linkedin: 'https://linkedin.com/in/johndoe',
        notes: [{ text: 'Contact note', timestamp: MOCK_TIMESTAMP }],
        meetings: [
          {
            id: 'meeting-1',
            timestamp: MOCK_TIMESTAMP,
            title: 'Initial meeting',
            attendees: 'John Doe',
            summary: 'Discuss product fit',
          },
        ],
        assigned_to: 'user-002',
        assigned_to_name: 'Jane Smith',
        created_by_name: 'Admin User',
      };

      const result = dbToContact(dbContact);

      expect(result).toEqual({
        id: 'contact-123',
        crmItemId: 'crm-456',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'CEO',
        linkedin: 'https://linkedin.com/in/johndoe',
        notes: [{ text: 'Contact note', timestamp: MOCK_TIMESTAMP }],
        meetings: [
          {
            id: 'meeting-1',
            timestamp: MOCK_TIMESTAMP,
            title: 'Initial meeting',
            attendees: 'John Doe',
            summary: 'Discuss product fit',
          },
        ],
        tags: [],
        assignedTo: 'user-002',
        assignedToName: 'Jane Smith',
        createdByName: 'Admin User',
      });
    });

    it('should handle null optional fields', () => {
      const dbContact = {
        id: 'contact-123',
        crm_item_id: 'crm-456',
        name: 'John Doe',
        email: 'john@example.com',
        linkedin: 'https://linkedin.com/in/johndoe',
        notes: [],
        meetings: [],
        phone: null,
        title: null,
        assigned_to: null,
        assigned_to_name: null,
        created_by_name: null,
      };

      const result = dbToContact(dbContact);

      expect(result.phone).toBeUndefined();
      expect(result.title).toBeUndefined();
      expect(result.assignedTo).toBeUndefined();
      expect(result.assignedToName).toBeUndefined();
      expect(result.createdByName).toBeUndefined();
    });
  });

  describe('dbToFinancialLog', () => {
    it('should transform database financial log to application model', () => {
      const dbLog = {
        id: 'log-123',
        date: '2024-01-15',
        mrr: 50000,
        gmv: 150000,
        signups: 120,
      };

      const result = dbToFinancialLog(dbLog);

      expect(result).toEqual({
        id: 'log-123',
        date: '2024-01-15',
        mrr: 50000,
        gmv: 150000,
        signups: 120,
      });
    });
  });
});

describe('Field Transformers - Application to Database', () => {
  describe('taskToDb', () => {
    it('should transform complete application task to database object', () => {
      const task: Partial<Task> = {
        text: 'Complete project',
        status: 'Done',
        priority: 'High',
        completedAt: new Date('2024-01-20T15:30:00.000Z').getTime(),
        dueDate: '2024-01-25',
        dueTime: '14:00',
        notes: [{ text: 'Note', timestamp: 1705320000000 }],
        crmItemId: 'crm-456',
        contactId: 'contact-789',
        assignedTo: 'user-002',
      };

      const result = taskToDb(task);

      expect(result).toEqual({
        text: 'Complete project',
        status: 'Done',
        priority: 'High',
        completed_at: new Date(task.completedAt!).toISOString(),
        due_date: '2024-01-25',
        due_time: '14:00',
        notes: [{ text: 'Note', timestamp: 1705320000000 }],
        crm_item_id: 'crm-456',
        contact_id: 'contact-789',
        assigned_to: 'user-002',
      });
    });

    it('should only include defined fields - undefined fields are omitted', () => {
      const task: Partial<Task> = {
        text: 'Simple task',
        status: 'Todo',
        priority: 'Medium',
      };

      const result = taskToDb(task);

      expect(result).toEqual({
        text: 'Simple task',
        status: 'Todo',
        priority: 'Medium',
      });
      expect(result).not.toHaveProperty('due_date');
      expect(result).not.toHaveProperty('due_time');
      expect(result).not.toHaveProperty('crm_item_id');
    });

    it('should convert empty string to null for optional fields', () => {
      const task: Partial<Task> = {
        text: 'Task',
        dueDate: '',
        dueTime: '',
      };

      const result = taskToDb(task);

      expect(result.due_date).toBeNull();
      expect(result.due_time).toBeNull();
    });

    it('should only include defined fields', () => {
      const task: Partial<Task> = {
        text: 'Minimal task',
      };

      const result = taskToDb(task);

      expect(result).toEqual({
        text: 'Minimal task',
      });
      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('priority');
    });
  });

  describe('marketingItemToDb', () => {
    it('should transform complete application marketing item to database object', () => {
      const item: Partial<MarketingItem> = {
        title: 'Launch Campaign',
        type: 'Product Launch',
        status: 'In Progress',
        notes: [{ text: 'Note', timestamp: MOCK_TIMESTAMP }],
        dueDate: '2024-02-01',
        dueTime: '09:00',
      };

      const result = marketingItemToDb(item);

      expect(result).toEqual({
        title: 'Launch Campaign',
        type: 'Product Launch',
        status: 'In Progress',
        notes: [{ text: 'Note', timestamp: MOCK_TIMESTAMP }],
        due_date: '2024-02-01',
        due_time: '09:00',
      });
    });

    it('should convert empty string to null for optional fields', () => {
      const item: Partial<MarketingItem> = {
        title: 'Item',
        dueDate: '',
        dueTime: '',
      };

      const result = marketingItemToDb(item);

      expect(result.due_date).toBeNull();
      expect(result.due_time).toBeNull();
    });
  });

  describe('crmItemToDb', () => {
    it('should transform complete application CRM item to database object', () => {
      const item: Partial<BaseCrmItem> = {
        company: 'Acme Corp',
        priority: 'High',
        status: 'Active',
        nextAction: 'Follow up',
        nextActionDate: '2024-02-01',
        nextActionTime: '14:00',
        notes: [{ text: 'Note', timestamp: MOCK_TIMESTAMP }],
        assignedTo: 'user-002',
        assignedToName: 'Jane Smith',
      };

      const result = crmItemToDb(item);

      expect(result).toEqual({
        company: 'Acme Corp',
        priority: 'High',
        status: 'Active',
        next_action: 'Follow up',
        next_action_date: '2024-02-01',
        next_action_time: '14:00',
        notes: [{ text: 'Note', timestamp: MOCK_TIMESTAMP }],
        assigned_to: 'user-002',
        assigned_to_name: 'Jane Smith',
      });
    });

    it('should convert empty string to null for optional fields', () => {
      const item: Partial<BaseCrmItem> = {
        company: 'Test Inc',
        nextAction: '',
        nextActionDate: '',
      };

      const result = crmItemToDb(item);

      expect(result.next_action).toBeNull();
      expect(result.next_action_date).toBeNull();
    });
  });

  describe('contactToDb', () => {
    it('should transform complete application contact to database object', () => {
      const contact: Partial<Contact> = {
        crmItemId: 'crm-456',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'CEO',
        linkedin: 'https://linkedin.com/in/johndoe',
        notes: [{ text: 'Note', timestamp: MOCK_TIMESTAMP }],
        meetings: [
          {
            id: 'meeting-1',
            timestamp: MOCK_TIMESTAMP,
            title: 'Meeting',
            attendees: 'John Doe',
            summary: 'Review roadmap',
          },
        ],
        assignedTo: 'user-002',
        assignedToName: 'Jane Smith',
      };

      const result = contactToDb(contact);

      expect(result).toEqual({
        crm_item_id: 'crm-456',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'CEO',
        linkedin: 'https://linkedin.com/in/johndoe',
        notes: [{ text: 'Note', timestamp: MOCK_TIMESTAMP }],
        meetings: [
          {
            id: 'meeting-1',
            timestamp: MOCK_TIMESTAMP,
            title: 'Meeting',
            attendees: 'John Doe',
            summary: 'Review roadmap',
          },
        ],
        assigned_to: 'user-002',
        assigned_to_name: 'Jane Smith',
      });
    });

    it('should convert empty string to null for optional fields', () => {
      const contact: Partial<Contact> = {
        name: 'John Doe',
        phone: '',
        title: '',
      };

      const result = contactToDb(contact);

      expect(result.phone).toBeNull();
      expect(result.title).toBeNull();
    });
  });
});

describe('Field Transformers - Batch Operations', () => {
  describe('dbToTasks', () => {
    it('should transform array of database tasks', () => {
      const dbTasks = [
        {
          id: 'task-1',
          text: 'Task 1',
          status: 'Todo',
          priority: 'High',
          created_at: '2024-01-15T10:00:00.000Z',
          notes: [],
        },
        {
          id: 'task-2',
          text: 'Task 2',
          status: 'Done',
          priority: 'Low',
          created_at: '2024-01-16T10:00:00.000Z',
          notes: [],
        },
      ];

      const result = dbToTasks(dbTasks);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
    });

    it('should handle empty array', () => {
      const result = dbToTasks([]);
      expect(result).toEqual([]);
    });
  });

  describe('dbToMarketingItems', () => {
    it('should transform array of database marketing items', () => {
      const dbItems = [
        {
          id: 'marketing-1',
          title: 'Item 1',
          type: 'Product Launch',
          status: 'In Progress',
          created_at: '2024-01-15T10:00:00.000Z',
          notes: [],
          workspace_id: 'workspace-001',
        },
        {
          id: 'marketing-2',
          title: 'Item 2',
          type: 'Blog Post',
          status: 'Planned',
          created_at: '2024-01-16T10:00:00.000Z',
          notes: [],
          workspace_id: 'workspace-002',
        },
      ];

      const result = dbToMarketingItems(dbItems);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('Product Launch');
      expect(result[1].type).toBe('Blog Post');
    });
  });

  describe('dbToCrmItems', () => {
    it('should transform array of database CRM items', () => {
      const dbItems = [
        {
          id: 'crm-1',
          company: 'Company 1',
          type: 'investor',
          priority: 'High',
          status: 'Active',
          created_at: '2024-01-15T10:00:00.000Z',
          notes: [],
        },
        {
          id: 'crm-2',
          company: 'Company 2',
          type: 'customer',
          priority: 'Medium',
          status: 'Active',
          created_at: '2024-01-16T10:00:00.000Z',
          notes: [],
        },
      ];

      const result = dbToCrmItems(dbItems as any);

      expect(result).toHaveLength(2);
      expect(result[0].company).toBe('Company 1');
      expect(result[1].company).toBe('Company 2');
    });
  });

  describe('dbToContacts', () => {
    it('should transform array of database contacts', () => {
      const dbContacts = [
        {
          id: 'contact-1',
          crm_item_id: 'crm-1',
          name: 'John Doe',
          email: 'john@example.com',
          linkedin: 'https://linkedin.com/in/johndoe',
          notes: [],
          meetings: [],
        },
        {
          id: 'contact-2',
          crm_item_id: 'crm-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          linkedin: 'https://linkedin.com/in/janesmith',
          notes: [],
          meetings: [],
        },
      ];

      const result = dbToContacts(dbContacts);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });
  });

  describe('dbToFinancialLogs', () => {
    it('should transform array of database financial logs', () => {
      const dbLogs = [
        { id: 'log-1', date: '2024-01-15', mrr: 50000, gmv: 150000, signups: 120 },
        { id: 'log-2', date: '2024-01-16', mrr: 51000, gmv: 155000, signups: 125 },
      ];

      const result = dbToFinancialLogs(dbLogs);

      expect(result).toHaveLength(2);
      expect(result[0].mrr).toBe(50000);
      expect(result[1].mrr).toBe(51000);
    });
  });
});
