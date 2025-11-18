import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataPersistenceAdapter } from '../../lib/services/dataPersistenceAdapter';
import * as DatabaseService from '../../lib/services/database';
import * as ActivityService from '../../lib/services/activityService';
import type { Task, AnyCrmItem, Contact, MarketingItem } from '../../types';

// Mock the database service
vi.mock('../../lib/services/database', () => ({
  DatabaseService: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getTaskById: vi.fn(),
    createCrmItem: vi.fn(),
    updateCrmItem: vi.fn(),
    deleteCrmItem: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    getContactById: vi.fn(),
    createMarketingItem: vi.fn(),
    updateMarketingItem: vi.fn(),
    deleteMarketingItem: vi.fn(),
    createFinancialLog: vi.fn(),
    updateFinancialLog: vi.fn(),
    deleteFinancialLog: vi.fn(),
  },
}));

// Mock the activity service
vi.mock('../../lib/services/activityService', () => ({
  logActivity: vi.fn(),
}));

describe('DataPersistenceAdapter - Task Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task with all fields', async () => {
      const mockTask = {
        id: 'task-123',
        text: 'Test task',
        status: 'Todo',
        priority: 'High',
        created_at: '2024-01-15T10:00:00.000Z',
        notes: [],
      };

      vi.mocked(DatabaseService.DatabaseService.createTask).mockResolvedValue({
        data: mockTask,
        error: null,
      });

      const result = await DataPersistenceAdapter.createTask(
        'user-123',
        'general',
        'Test task',
        'High',
        'crm-456',
        'contact-789',
        '2024-01-20',
        'workspace-001',
        'user-002',
        '14:00'
      );

      expect(result.data).toEqual(mockTask);
      expect(result.error).toBeNull();
      expect(DatabaseService.DatabaseService.createTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          text: 'Test task',
          status: 'Todo',
          priority: 'High',
          due_date: '2024-01-20',
          due_time: '14:00',
          crm_item_id: 'crm-456',
          contact_id: 'contact-789',
          assigned_to: 'user-002',
          category: 'general',
        }),
        'workspace-001'
      );
      expect(ActivityService.logActivity).toHaveBeenCalled();
    });

    it('should throw error when workspaceId is missing', async () => {
      await expect(
        DataPersistenceAdapter.createTask(
          'user-123',
          'general',
          'Test task',
          'Medium',
          undefined,
          undefined,
          undefined,
          '' // Empty workspaceId
        )
      ).rejects.toThrow('workspaceId is required to create a task');
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      
      vi.mocked(DatabaseService.DatabaseService.createTask).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        DataPersistenceAdapter.createTask(
          'user-123',
          'general',
          'Test task',
          'Medium',
          undefined,
          undefined,
          undefined,
          'workspace-001'
        )
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('updateTask', () => {
    it('should update a task with field transformations', async () => {
      const originalTask = {
        id: 'task-123',
        text: 'Original task',
        status: 'Todo',
      };

      const updatedTask = {
        id: 'task-123',
        text: 'Updated task',
        status: 'Done',
        completed_at: '2024-01-20T15:30:00.000Z',
      };

      vi.mocked(DatabaseService.DatabaseService.getTaskById).mockResolvedValue({
        data: originalTask,
        error: null,
      });

      vi.mocked(DatabaseService.DatabaseService.updateTask).mockResolvedValue({
        data: updatedTask,
        error: null,
      });

      const updates: Partial<Task> = {
        text: 'Updated task',
        status: 'Done',
        completedAt: new Date('2024-01-20T15:30:00.000Z').getTime(),
      };

      const result = await DataPersistenceAdapter.updateTask(
        'task-123',
        updates,
        'user-123',
        'workspace-001'
      );

      expect(result.data).toEqual(updatedTask);
      expect(DatabaseService.DatabaseService.updateTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({
          text: 'Updated task',
          status: 'Done',
          completed_at: expect.any(String),
        })
      );
      expect(ActivityService.logActivity).toHaveBeenCalled();
    });

    it('should convert empty strings to null for optional fields', async () => {
      vi.mocked(DatabaseService.DatabaseService.getTaskById).mockResolvedValue({
        data: { id: 'task-123', text: 'Task' },
        error: null,
      });

      vi.mocked(DatabaseService.DatabaseService.updateTask).mockResolvedValue({
        data: { id: 'task-123', text: 'Task', due_date: null },
        error: null,
      });

      const updates: Partial<Task> = {
        dueDate: '',
        dueTime: '',
      };

      await DataPersistenceAdapter.updateTask('task-123', updates);

      expect(DatabaseService.DatabaseService.updateTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({
          due_date: null,
          due_time: null,
        })
      );
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed');

      vi.mocked(DatabaseService.DatabaseService.getTaskById).mockResolvedValue({
        data: { id: 'task-123' },
        error: null,
      });

      vi.mocked(DatabaseService.DatabaseService.updateTask).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await DataPersistenceAdapter.updateTask('task-123', { text: 'Updated' });

      expect(result.error).toEqual(mockError);
      expect(result.data).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      vi.mocked(DatabaseService.DatabaseService.deleteTask).mockResolvedValue({
        error: null,
      });

      const result = await DataPersistenceAdapter.deleteTask('task-123');

      expect(result.error).toBeNull();
      expect(DatabaseService.DatabaseService.deleteTask).toHaveBeenCalledWith('task-123');
    });

    it('should handle delete errors', async () => {
      const mockError = new Error('Delete failed');

      vi.mocked(DatabaseService.DatabaseService.deleteTask).mockResolvedValue({
        error: mockError,
      });

      const result = await DataPersistenceAdapter.deleteTask('task-123');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('addTaskNote', () => {
    it('should add a note to a task', async () => {
      const existingTask = {
        id: 'task-123',
        text: 'Task',
        notes: [{ text: 'Existing note', timestamp: 1705320000000 }],
      };

      const updatedTask = {
        ...existingTask,
        notes: [
          ...existingTask.notes,
          { text: 'New note', timestamp: expect.any(Number), userId: 'user-123', userName: 'John' },
        ],
      };

      vi.mocked(DatabaseService.DatabaseService.getTaskById).mockResolvedValue({
        data: existingTask,
        error: null,
      });

      vi.mocked(DatabaseService.DatabaseService.updateTask).mockResolvedValue({
        data: updatedTask,
        error: null,
      });

      const result = await DataPersistenceAdapter.addTaskNote(
        'task-123',
        'New note',
        'user-123',
        'John'
      );

      expect(result.data).toBeTruthy();
      expect(DatabaseService.DatabaseService.updateTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({
          notes: expect.arrayContaining([
            { text: 'Existing note', timestamp: 1705320000000 },
            expect.objectContaining({
              text: 'New note',
              userId: 'user-123',
              userName: 'John',
            }),
          ]),
        })
      );
    });

    it('should handle task not found', async () => {
      vi.mocked(DatabaseService.DatabaseService.getTaskById).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await DataPersistenceAdapter.addTaskNote('task-123', 'Note');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Task not found');
    });
  });
});

describe('DataPersistenceAdapter - CRM Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCrmItem', () => {
    it('should create a CRM item with correct type mapping', async () => {
      const mockCrmItem = {
        id: 'crm-123',
        company: 'Acme Corp',
        type: 'investor',
        priority: 'High',
        status: 'Active',
      };

      vi.mocked(DatabaseService.DatabaseService.createCrmItem).mockResolvedValue({
        data: mockCrmItem,
        error: null,
      });

      const result = await DataPersistenceAdapter.createCrmItem(
        'user-123',
        'workspace-001',
        'investors',
        {
          company: 'Acme Corp',
          priority: 'High',
          status: 'Active',
          nextAction: 'Follow up',
          nextActionDate: '2024-02-01',
          checkSize: 500000,
        }
      );

      expect(result.data).toEqual(mockCrmItem);
      expect(DatabaseService.DatabaseService.createCrmItem).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        expect.objectContaining({
          company: 'Acme Corp',
          type: 'investor',
          priority: 'High',
          status: 'Active',
          next_action: 'Follow up',
          next_action_date: '2024-02-01',
          check_size: 500000,
        })
      );
    });

    it('should map collection names to types correctly', async () => {
      const mockResponse = { data: { id: 'crm-1', type: 'customer' }, error: null };
      vi.mocked(DatabaseService.DatabaseService.createCrmItem).mockResolvedValue(mockResponse);

      await DataPersistenceAdapter.createCrmItem('user-123', 'workspace-001', 'customers', {
        company: 'Customer Inc',
        priority: 'Medium',
        status: 'Active',
      });

      expect(DatabaseService.DatabaseService.createCrmItem).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        expect.objectContaining({ type: 'customer' })
      );
    });

    it('should handle null optional fields', async () => {
      vi.mocked(DatabaseService.DatabaseService.createCrmItem).mockResolvedValue({
        data: { id: 'crm-1' },
        error: null,
      });

      await DataPersistenceAdapter.createCrmItem('user-123', 'workspace-001', 'partners', {
        company: 'Partner LLC',
        priority: 'Low',
        status: 'Active',
      });

      expect(DatabaseService.DatabaseService.createCrmItem).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        expect.objectContaining({
          next_action: null,
          next_action_date: null,
          check_size: null,
          deal_value: null,
          opportunity: null,
        })
      );
    });
  });

  describe('updateCrmItem', () => {
    it('should update CRM item with field transformations', async () => {
      const updatedItem = {
        id: 'crm-123',
        company: 'Updated Corp',
        next_action: 'New action',
      };

      vi.mocked(DatabaseService.DatabaseService.updateCrmItem).mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const updates: Partial<AnyCrmItem> = {
        company: 'Updated Corp',
        nextAction: 'New action',
        nextActionDate: '2024-03-01',
      };

      const result = await DataPersistenceAdapter.updateCrmItem('crm-123', updates);

      expect(result.data).toEqual(updatedItem);
      expect(DatabaseService.DatabaseService.updateCrmItem).toHaveBeenCalledWith(
        'crm-123',
        expect.objectContaining({
          company: 'Updated Corp',
          next_action: 'New action',
          next_action_date: '2024-03-01',
        })
      );
    });

    it('should handle type-specific fields', async () => {
      vi.mocked(DatabaseService.DatabaseService.updateCrmItem).mockResolvedValue({
        data: { id: 'crm-1' },
        error: null,
      });

      const updates = {
        checkSize: 750000, // Investor-specific
        dealValue: 1000000, // Customer-specific
        opportunity: 'Partnership deal', // Partner-specific
      };

      await DataPersistenceAdapter.updateCrmItem('crm-123', updates);

      expect(DatabaseService.DatabaseService.updateCrmItem).toHaveBeenCalledWith(
        'crm-123',
        expect.objectContaining({
          check_size: 750000,
          deal_value: 1000000,
          opportunity: 'Partnership deal',
        })
      );
    });
  });

  describe('deleteCrmItem', () => {
    it('should delete a CRM item', async () => {
      vi.mocked(DatabaseService.DatabaseService.deleteCrmItem).mockResolvedValue({
        error: null,
      });

      const result = await DataPersistenceAdapter.deleteCrmItem('crm-123');

      expect(result.error).toBeNull();
      expect(DatabaseService.DatabaseService.deleteCrmItem).toHaveBeenCalledWith('crm-123');
    });
  });
});

describe('DataPersistenceAdapter - Contact Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a contact with all fields', async () => {
      const mockContact = {
        id: 'contact-123',
        crm_item_id: 'crm-456',
        name: 'John Doe',
        email: 'john@example.com',
      };

      vi.mocked(DatabaseService.DatabaseService.createContact).mockResolvedValue({
        data: mockContact,
        error: null,
      });

      const result = await DataPersistenceAdapter.createContact(
        'user-123',
        'workspace-001',
        'crm-456',
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          title: 'CEO',
          linkedin: 'https://linkedin.com/in/johndoe',
        }
      );

      expect(result.data).toEqual(mockContact);
      expect(DatabaseService.DatabaseService.createContact).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        expect.objectContaining({
          crm_item_id: 'crm-456',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          title: 'CEO',
          linkedin: 'https://linkedin.com/in/johndoe',
        })
      );
    });
  });

  describe('updateContact', () => {
    it('should update contact with field transformations', async () => {
      vi.mocked(DatabaseService.DatabaseService.updateContact).mockResolvedValue({
        data: { id: 'contact-123', name: 'Updated Name' },
        error: null,
      });

      const updates: Partial<Contact> = {
        name: 'Updated Name',
        email: 'newemail@example.com',
        phone: '+9876543210',
      };

      const result = await DataPersistenceAdapter.updateContact('contact-123', updates);

      expect(result.data).toBeTruthy();
      expect(DatabaseService.DatabaseService.updateContact).toHaveBeenCalledWith(
        'contact-123',
        expect.objectContaining({
          name: 'Updated Name',
          email: 'newemail@example.com',
          phone: '+9876543210',
        })
      );
    });
  });

  describe('addContactNote', () => {
    it('should add a note to a contact', async () => {
      const existingContact = {
        id: 'contact-123',
        name: 'John Doe',
        notes: [],
      };

      vi.mocked(DatabaseService.DatabaseService.getContactById).mockResolvedValue({
        data: existingContact,
        error: null,
      });

      vi.mocked(DatabaseService.DatabaseService.updateContact).mockResolvedValue({
        data: {
          ...existingContact,
          notes: [{ text: 'Contact note', timestamp: expect.any(Number) }],
        },
        error: null,
      });

      const result = await DataPersistenceAdapter.addContactNote(
        'contact-123',
        'Contact note',
        'user-123',
        'John'
      );

      expect(result.data).toBeTruthy();
      expect(DatabaseService.DatabaseService.updateContact).toHaveBeenCalled();
    });

    it('should handle contact not found', async () => {
      vi.mocked(DatabaseService.DatabaseService.getContactById).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await DataPersistenceAdapter.addContactNote('contact-123', 'Note');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Contact not found');
    });
  });
});

describe('DataPersistenceAdapter - Marketing Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMarketingItem', () => {
    it('should create a marketing item with field transformations', async () => {
      const mockItem = {
        id: 'marketing-123',
        title: 'Launch Campaign',
        item_type: 'Product Launch',
        status: 'Planned',
      };

      vi.mocked(DatabaseService.DatabaseService.createMarketingItem).mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const result = await DataPersistenceAdapter.createMarketingItem(
        'user-123',
        'workspace-001',
        {
          title: 'Launch Campaign',
          type: 'Product Launch',
          status: 'Planned',
          dueDate: '2024-02-15',
          assignedTo: 'user-002',
          assignedToName: 'Jane',
        }
      );

      expect(result.data).toEqual(mockItem);
      expect(DatabaseService.DatabaseService.createMarketingItem).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        expect.objectContaining({
          title: 'Launch Campaign',
          type: 'Product Launch',
          status: 'Planned',
          due_date: '2024-02-15',
          assigned_to: 'user-002',
          assigned_to_name: 'Jane',
        })
      );
    });

    it('should use default status when not provided', async () => {
      vi.mocked(DatabaseService.DatabaseService.createMarketingItem).mockResolvedValue({
        data: { id: 'marketing-1' },
        error: null,
      });

      await DataPersistenceAdapter.createMarketingItem('user-123', 'workspace-001', {
        title: 'Item',
        type: 'Blog Post',
      });

      expect(DatabaseService.DatabaseService.createMarketingItem).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        expect.objectContaining({
          status: 'Planned',
        })
      );
    });
  });

  describe('updateMarketingItem', () => {
    it('should update marketing item with field transformations', async () => {
      vi.mocked(DatabaseService.DatabaseService.updateMarketingItem).mockResolvedValue({
        data: { id: 'marketing-123', status: 'In Progress' },
        error: null,
      });

      const updates: Partial<MarketingItem> = {
        status: 'In Progress',
        dueDate: '2024-03-01',
        dueTime: '10:00',
      };

      const result = await DataPersistenceAdapter.updateMarketingItem('marketing-123', updates);

      expect(result.data).toBeTruthy();
      expect(DatabaseService.DatabaseService.updateMarketingItem).toHaveBeenCalledWith(
        'marketing-123',
        expect.objectContaining({
          status: 'In Progress',
          due_date: '2024-03-01',
          due_time: '10:00',
        })
      );
    });
  });

  describe('deleteMarketingItem', () => {
    it('should delete a marketing item', async () => {
      vi.mocked(DatabaseService.DatabaseService.deleteMarketingItem).mockResolvedValue({
        error: null,
      });

      const result = await DataPersistenceAdapter.deleteMarketingItem('marketing-123');

      expect(result.error).toBeNull();
      expect(DatabaseService.DatabaseService.deleteMarketingItem).toHaveBeenCalledWith(
        'marketing-123'
      );
    });
  });
});

describe('DataPersistenceAdapter - Financial Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logFinancials', () => {
    it('should create a financial log', async () => {
      const mockLog = {
        id: 'log-123',
        date: '2024-01-15',
        mrr: 50000,
        gmv: 150000,
        signups: 120,
      };

      vi.mocked(DatabaseService.DatabaseService.createFinancialLog).mockResolvedValue({
        data: mockLog,
        error: null,
      });

      const result = await DataPersistenceAdapter.logFinancials('user-123', 'workspace-001', {
        date: '2024-01-15',
        mrr: 50000,
        gmv: 150000,
        signups: 120,
      });

      expect(result.data).toEqual(mockLog);
      expect(DatabaseService.DatabaseService.createFinancialLog).toHaveBeenCalledWith(
        'user-123',
        'workspace-001',
        {
          date: '2024-01-15',
          mrr: 50000,
          gmv: 150000,
          signups: 120,
        }
      );
    });
  });

  describe('updateFinancialLog', () => {
    it('should update financial log with partial updates', async () => {
      vi.mocked(DatabaseService.DatabaseService.updateFinancialLog).mockResolvedValue({
        data: { id: 'log-123', mrr: 55000 },
        error: null,
      });

      const result = await DataPersistenceAdapter.updateFinancialLog('log-123', {
        mrr: 55000,
        signups: 130,
      });

      expect(result.data).toBeTruthy();
      expect(DatabaseService.DatabaseService.updateFinancialLog).toHaveBeenCalledWith(
        'log-123',
        expect.objectContaining({
          mrr: 55000,
          signups: 130,
        })
      );
    });

    it('should handle zero values correctly', async () => {
      vi.mocked(DatabaseService.DatabaseService.updateFinancialLog).mockResolvedValue({
        data: { id: 'log-123' },
        error: null,
      });

      await DataPersistenceAdapter.updateFinancialLog('log-123', {
        mrr: 0,
        gmv: 0,
        signups: 0,
      });

      expect(DatabaseService.DatabaseService.updateFinancialLog).toHaveBeenCalledWith(
        'log-123',
        expect.objectContaining({
          mrr: 0,
          gmv: 0,
          signups: 0,
        })
      );
    });
  });

  describe('deleteFinancialLog', () => {
    it('should delete a financial log', async () => {
      vi.mocked(DatabaseService.DatabaseService.deleteFinancialLog).mockResolvedValue({
        error: null,
      });

      const result = await DataPersistenceAdapter.deleteFinancialLog('log-123');

      expect(result.error).toBeNull();
      expect(DatabaseService.DatabaseService.deleteFinancialLog).toHaveBeenCalledWith('log-123');
    });
  });
});

describe('DataPersistenceAdapter - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network request failed');
    
    vi.mocked(DatabaseService.DatabaseService.createTask).mockResolvedValue({
      data: null,
      error: networkError,
    });

    await expect(
      DataPersistenceAdapter.createTask(
        'user-123',
        'general',
        'Task',
        'Medium',
        undefined,
        undefined,
        undefined,
        'workspace-001'
      )
    ).rejects.toThrow('Network request failed');
  });

  it('should handle validation errors', async () => {
    const validationError = new Error('Invalid input data');
    
    vi.mocked(DatabaseService.DatabaseService.createCrmItem).mockResolvedValue({
      data: null,
      error: validationError,
    });

    const result = await DataPersistenceAdapter.createCrmItem(
      'user-123',
      'workspace-001',
      'investors',
      {
        company: '',
        priority: 'High',
        status: 'Active',
      }
    );

    expect(result.error).toEqual(validationError);
    expect(result.data).toBeNull();
  });

  it('should handle permission errors', async () => {
    const permissionError = new Error('Access denied');
    
    vi.mocked(DatabaseService.DatabaseService.updateTask).mockResolvedValue({
      data: null,
      error: permissionError,
    });

    vi.mocked(DatabaseService.DatabaseService.getTaskById).mockResolvedValue({
      data: { id: 'task-123' },
      error: null,
    });

    const result = await DataPersistenceAdapter.updateTask('task-123', { text: 'Updated' });

    expect(result.error).toEqual(permissionError);
    expect(result.data).toBeNull();
  });
});
