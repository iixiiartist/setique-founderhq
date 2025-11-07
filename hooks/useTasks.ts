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
    onSuccess: (data, variables) => {
      // Invalidate workspace data to trigger refetch
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
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
    onSuccess: (taskId, variables) => {
      // Invalidate workspace data to trigger refetch
      if (variables.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      }
    },
  });
}
