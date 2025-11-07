/**
 * React Query hooks for task operations
 * 
 * Provides query and mutation hooks for:
 * - Fetching tasks
 * - Creating tasks
 * - Updating tasks
 * - Deleting tasks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataPersistenceAdapter } from '../lib/services/dataPersistenceAdapter';
import type { Task, Priority, TaskCollectionName } from '../types';
import { showSuccess, showError } from '../lib/utils/toast';

// Query key factory for tasks
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...taskKeys.lists(), workspaceId] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

interface UseTasksOptions {
  workspaceId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch all tasks for a workspace
 */
export function useTasks({ workspaceId, enabled = true }: UseTasksOptions) {
  return useQuery<Task[], Error>({
    queryKey: taskKeys.list(workspaceId),
    queryFn: async () => {
      // Tasks are fetched as part of workspace data
      // This is a placeholder - in practice, tasks come from useWorkspaceData
      return [];
    },
    enabled: enabled && !!workspaceId,
  });
}

interface CreateTaskParams {
  userId: string;
  workspaceId: string;
  category: TaskCollectionName;
  text: string;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  crmItemId?: string;
  contactId?: string;
  assignedTo?: string;
}

/**
 * Hook to create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      const result = await DataPersistenceAdapter.createTask(
        params.userId,
        params.category,
        params.text,
        params.priority,
        params.dueDate,
        params.dueTime,
        params.crmItemId,
        params.contactId,
        params.assignedTo,
        params.workspaceId
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create task');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace data to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      showSuccess('Task created successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to create task');
    },
  });
}

interface UpdateTaskParams {
  taskId: string;
  updates: Partial<Task>;
  userId?: string;
  workspaceId?: string;
}

/**
 * Hook to update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateTaskParams) => {
      const result = await DataPersistenceAdapter.updateTask(
        params.taskId,
        params.updates,
        params.userId,
        params.workspaceId
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to update task');
      }

      return result.data;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      if (params.workspaceId) {
        await queryClient.cancelQueries({ queryKey: ['workspace', params.workspaceId] });
      }

      // Snapshot previous value for rollback
      const previousData = params.workspaceId 
        ? queryClient.getQueryData(['workspace', params.workspaceId, 'data'])
        : null;

      // Optimistically update the cache
      if (params.workspaceId && previousData) {
        queryClient.setQueryData(['workspace', params.workspaceId, 'data'], (old: any) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.map((task: Task) =>
              task.id === params.taskId ? { ...task, ...params.updates } : task
            ),
          };
        });
      }

      return { previousData };
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure fresh data
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
      showSuccess('Task updated successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (variables.workspaceId && context?.previousData) {
        queryClient.setQueryData(['workspace', variables.workspaceId, 'data'], context.previousData);
      }
      showError(error.message || 'Failed to update task');
    },
  });
}

interface DeleteTaskParams {
  taskId: string;
  workspaceId?: string;
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteTaskParams) => {
      const result = await DataPersistenceAdapter.deleteTask(params.taskId);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete task');
      }

      return params.taskId;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      if (params.workspaceId) {
        await queryClient.cancelQueries({ queryKey: ['workspace', params.workspaceId] });
      }

      // Snapshot previous value for rollback
      const previousData = params.workspaceId 
        ? queryClient.getQueryData(['workspace', params.workspaceId, 'data'])
        : null;

      // Optimistically remove from cache
      if (params.workspaceId && previousData) {
        queryClient.setQueryData(['workspace', params.workspaceId, 'data'], (old: any) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.filter((task: Task) => task.id !== params.taskId),
          };
        });
      }

      return { previousData };
    },
    onSuccess: (taskId, variables) => {
      // Invalidate to ensure consistency
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
      showSuccess('Task deleted successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (variables.workspaceId && context?.previousData) {
        queryClient.setQueryData(['workspace', variables.workspaceId, 'data'], context.previousData);
      }
      showError(error.message || 'Failed to delete task');
    },
  });
}
