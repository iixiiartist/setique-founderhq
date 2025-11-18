/**
 * React Query hooks for task data fetching
 * Replaces manual caching in useLazyDataPersistence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseService } from '../lib/services/database';
import { Task } from '../types';

// Query keys for React Query cache management
export const taskKeys = {
  all: ['tasks'] as const,
  workspace: (workspaceId: string) => [...taskKeys.all, workspaceId] as const,
  category: (workspaceId: string, category: string) => [...taskKeys.workspace(workspaceId), category] as const,
  byId: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
};

/**
 * Fetch all tasks for a workspace, grouped by category
 */
export function useWorkspaceTasks(userId: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.workspace(workspaceId || ''),
    queryFn: async () => {
      if (!userId || !workspaceId) {
        throw new Error('User ID and Workspace ID required');
      }

      console.log('[useWorkspaceTasks] Fetching tasks', { userId, workspaceId });

      // Fetch each category separately with database-level filtering
      const categories = [
        'productsServicesTasks',
        'investorTasks', 
        'customerTasks',
        'partnerTasks',
        'marketingTasks',
        'financialTasks'
      ] as const;

      const categoryResults = await Promise.all(
        categories.map(async (category) => {
          const { data } = await DatabaseService.getTasks(userId, workspaceId, { 
            category,
            limit: 1000
          });
          console.log(`[useWorkspaceTasks] ${category}:`, data?.length || 0, 'tasks');
          return { category, data };
        })
      );

      // Transform parallel results into categorized object
      const result = categoryResults.reduce((acc, { category, data }) => ({
        ...acc,
        [category]: data || []
      }), {} as Record<string, Task[]>);
      
      console.log('[useWorkspaceTasks] Final result:', result);

      return result as {
        productsServicesTasks: Task[]
        investorTasks: Task[]
        customerTasks: Task[]
        partnerTasks: Task[]
        marketingTasks: Task[]
        financialTasks: Task[]
      };
    },
    enabled: !!userId && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch tasks for a specific category
 */
export function useCategoryTasks(
  userId: string | undefined,
  workspaceId: string | undefined,
  category: string
) {
  return useQuery({
    queryKey: taskKeys.category(workspaceId || '', category),
    queryFn: async () => {
      if (!userId || !workspaceId) {
        throw new Error('User ID and Workspace ID required');
      }

      const { data } = await DatabaseService.getTasks(userId, workspaceId, { 
        category,
        limit: 1000
      });

      return data || [];
    },
    enabled: !!userId && !!workspaceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.byId(taskId || ''),
    queryFn: async () => {
      if (!taskId) {
        throw new Error('Task ID required');
      }

      const { data, error } = await DatabaseService.getTaskById(taskId);
      
      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: {
      userId: string;
      workspaceId: string;
      text: string;
      category: string;
      priority?: string;
      dueDate?: string;
      assignedTo?: string;
    }) => {
      const { data, error } = await DatabaseService.createTask(
        taskData.userId,
        {
          text: taskData.text,
          category: taskData.category,
          priority: taskData.priority as any,
          due_date: taskData.dueDate,
        } as any,
        taskData.workspaceId
      );

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace tasks to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: taskKeys.workspace(variables.workspaceId) 
      });
      // Invalidate specific category
      queryClient.invalidateQueries({ 
        queryKey: taskKeys.category(variables.workspaceId, variables.category) 
      });
    },
  });
}

/**
 * Update an existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const { data, error } = await DatabaseService.updateTask(taskId, updates as any);

      if (error) {
        throw error;
      }

      return data;
    },
    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.byId(taskId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData(taskKeys.byId(taskId));

      // Optimistically update task
      queryClient.setQueryData(taskKeys.byId(taskId), (old: any) => ({
        ...old,
        ...updates,
      }));

      return { previousTask };
    },
    onError: (err, { taskId }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.byId(taskId), context.previousTask);
      }
    },
    onSettled: (data, error, { taskId }) => {
      // Refetch task and related queries
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await DatabaseService.deleteTask(taskId);

      if (error) {
        throw error;
      }

      return taskId;
    },
    onSuccess: () => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Prefetch tasks for a specific category
 */
export function usePrefetchCategoryTasks() {
  const queryClient = useQueryClient();

  return async (userId: string, workspaceId: string, category: string) => {
    await queryClient.prefetchQuery({
      queryKey: taskKeys.category(workspaceId, category),
      queryFn: async () => {
        const { data } = await DatabaseService.getTasks(userId, workspaceId, { 
          category,
          limit: 1000
        });
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}
