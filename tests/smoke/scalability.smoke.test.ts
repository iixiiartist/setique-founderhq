/**
 * Scalability Smoke Tests
 * 
 * Tests to ensure pagination and query limits work correctly
 * to prevent performance regressions with large workspaces.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../lib/services/database';
import * as huddleService from '../../services/huddleService';

// Mock Supabase client
const mockSupabaseQuery = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSupabaseQuery,
    }),
    rpc: mockSupabaseRpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
  },
}));

describe('Database Scalability - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContacts', () => {
    it('should apply default pagination limit of 100', async () => {
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      await DatabaseService.getContacts('workspace-1');

      expect(mockSupabaseQuery).toHaveBeenCalledWith(
        expect.stringContaining('id'),
        expect.objectContaining({ count: 'exact' })
      );
    });

    it('should respect custom pagination options', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 500 });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      const result = await DatabaseService.getContacts('workspace-1', { limit: 25, offset: 50 });

      expect(rangeMock).toHaveBeenCalledWith(50, 74); // offset to offset + limit - 1
      expect(result.hasMore).toBe(true);
    });

    it('should filter by crmItemId when provided', async () => {
      const eqMock = vi.fn().mockReturnThis();
      mockSupabaseQuery.mockReturnValue({
        eq: eqMock,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      await DatabaseService.getContacts('workspace-1', { crmItemId: 'crm-123' });

      expect(eqMock).toHaveBeenCalledWith('crm_item_id', 'crm-123');
    });
  });

  describe('getMarketingItems', () => {
    it('should apply default pagination limit of 100', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      await DatabaseService.getMarketingItems('workspace-1');

      expect(rangeMock).toHaveBeenCalledWith(0, 99);
    });

    it('should filter by status and type', async () => {
      const eqMock = vi.fn().mockReturnThis();
      mockSupabaseQuery.mockReturnValue({
        eq: eqMock,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      await DatabaseService.getMarketingItems('workspace-1', { 
        status: 'In Progress',
        type: 'Campaign'
      });

      expect(eqMock).toHaveBeenCalledWith('status', 'In Progress');
      expect(eqMock).toHaveBeenCalledWith('type', 'Campaign');
    });
  });

  describe('getDocuments', () => {
    it('should apply default pagination limit of 50', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      await DatabaseService.getDocuments('workspace-1');

      expect(rangeMock).toHaveBeenCalledWith(0, 49);
    });

    it('should support module filtering', async () => {
      const eqMock = vi.fn().mockReturnThis();
      mockSupabaseQuery.mockReturnValue({
        eq: eqMock,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      await DatabaseService.getDocuments('workspace-1', { module: 'crm' });

      expect(eqMock).toHaveBeenCalledWith('module', 'crm');
    });
  });

  describe('getExpenses', () => {
    it('should support date range filtering', async () => {
      const gteMock = vi.fn().mockReturnThis();
      const lteMock = vi.fn().mockReturnThis();
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: gteMock,
        lte: lteMock,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      await DatabaseService.getExpenses('workspace-1', {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      expect(gteMock).toHaveBeenCalledWith('date', '2024-01-01');
      expect(lteMock).toHaveBeenCalledWith('date', '2024-12-31');
    });
  });

  describe('getMeetings', () => {
    it('should support upcoming meetings filter', async () => {
      const gteMock = vi.fn().mockReturnThis();
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: gteMock,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      });

      await DatabaseService.getMeetings('workspace-1', { upcoming: true });

      expect(gteMock).toHaveBeenCalledWith('timestamp', expect.any(String));
    });
  });
});

describe('Huddle Service Scalability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspaceRooms', () => {
    it('should apply default pagination limit of 30', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      const isMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      
      mockSupabaseQuery.mockReturnValue({
        eq: eqMock,
        is: isMock,
        order: orderMock,
        range: rangeMock,
      });

      const result = await huddleService.getWorkspaceRooms('workspace-1');

      // Default limit is 30, so range should be (0, 29)
      expect(rangeMock).toHaveBeenCalledWith(0, 29);
      expect(result.data).toEqual([]);
    });

    it('should not include members by default for list view optimization', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      await huddleService.getWorkspaceRooms('workspace-1', { includeMembers: false });

      // Check that select was called without members relation
      // Members should be lazy-loaded when a room is opened
      expect(mockSupabaseQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('profiles'),
        expect.any(Object)
      );
    });

    it('should include members when includeMembers is true', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      await huddleService.getWorkspaceRooms('workspace-1', { includeMembers: true });

      // Check that select includes the members relation with profiles
      expect(mockSupabaseQuery).toHaveBeenCalledWith(
        expect.stringContaining('members:huddle_members'),
        expect.any(Object)
      );
    });

    it('should include members when filtering by currentUserId AND includeMembers is true', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      await huddleService.getWorkspaceRooms('workspace-1', { 
        currentUserId: 'user-123',
        includeMembers: true 
      });

      // BUGFIX TEST: Previously this branch ignored includeMembers
      // Now it should include member profiles in the select clause
      expect(mockSupabaseQuery).toHaveBeenCalledWith(
        expect.stringContaining('profiles'),
        expect.any(Object)
      );
    });

    it('should correctly report hasMore when more rooms exist', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ 
        data: Array(30).fill({ id: 'room-1' }), 
        error: null, 
        count: 100 // 100 total rooms
      });
      mockSupabaseQuery.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: rangeMock,
      });

      const result = await huddleService.getWorkspaceRooms('workspace-1');

      expect(result.hasMore).toBe(true);
    });
  });

  describe('User Cache', () => {
    it('should export cache management functions', () => {
      expect(typeof huddleService.preloadRoomUsers).toBe('function');
      expect(typeof huddleService.clearUserCache).toBe('function');
    });
  });
});

describe('Settings Query Optimization', () => {
  it('should have a dedicated getUserSettings method', async () => {
    mockSupabaseQuery.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
    });

    const result = await DatabaseService.getUserSettings('user-1');

    // Should only fetch settings column, not full profile
    expect(mockSupabaseQuery).toHaveBeenCalledWith('settings');
    expect(result.data).toBeDefined();
  });
});

describe('Large Workspace Simulation', () => {
  it('should correctly report hasMore when more results exist', async () => {
    mockSupabaseQuery.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ 
        data: Array(100).fill({ id: 'test' }), 
        error: null, 
        count: 5000 // Simulating 5000 total contacts
      }),
    });

    const result = await DatabaseService.getContacts('workspace-1');

    expect(result.hasMore).toBe(true);
    expect(result.count).toBe(5000);
  });

  it('should correctly report hasMore as false when all results returned', async () => {
    mockSupabaseQuery.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ 
        data: Array(50).fill({ id: 'test' }), 
        error: null, 
        count: 50 // All 50 contacts fit in one page
      }),
    });

    const result = await DatabaseService.getContacts('workspace-1');

    expect(result.hasMore).toBe(false);
    expect(result.count).toBe(50);
  });
});
