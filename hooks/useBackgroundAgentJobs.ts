// hooks/useBackgroundAgentJobs.ts
// React hook for managing AI agent background jobs with real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { showSuccess, showError } from '../lib/utils/toast';
import { 
  BackgroundAgentJobService, 
  type BackgroundAgentJob, 
  type CreateJobParams 
} from '../lib/services/backgroundAgentJobService';
import { runYouAgent, type StreamProgressEvent } from '../lib/services/youAgentClient';
import type { YouAgentSlug } from '../lib/config/youAgents';

// ============================================================================
// Types
// ============================================================================

export interface UseBackgroundAgentJobsOptions {
  userId: string | undefined;
  workspaceId: string | undefined;
  /** Enable real-time updates (default: true) */
  realtime?: boolean;
  /** Max jobs to fetch (default: 20) */
  limit?: number;
  /** Include completed jobs in list (default: true) */
  includeCompleted?: boolean;
}

export interface UseBackgroundAgentJobsReturn {
  // State
  jobs: BackgroundAgentJob[];
  activeJobs: BackgroundAgentJob[];
  isLoading: boolean;
  error: string | null;
  realtimeConnected: boolean;

  // Actions
  startBackgroundJob: (params: Omit<CreateJobParams, 'workspaceId' | 'userId'>) => Promise<BackgroundAgentJob | null>;
  cancelJob: (jobId: string) => Promise<boolean>;
  deleteJob: (jobId: string) => Promise<boolean>;
  refreshJobs: () => Promise<void>;
  
  // Running job state
  runningJobId: string | null;
  runningProgress: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useBackgroundAgentJobs(options: UseBackgroundAgentJobsOptions): UseBackgroundAgentJobsReturn {
  const { userId, workspaceId, realtime = true, limit = 20, includeCompleted = true } = options;

  // State
  const [jobs, setJobs] = useState<BackgroundAgentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runningProgress, setRunningProgress] = useState(0);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchJobs = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedJobs = await BackgroundAgentJobService.getUserJobs(userId, {
        limit,
        includeCompleted,
      });
      setJobs(fetchedJobs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(message);
      logger.error('[useBackgroundAgentJobs] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit, includeCompleted]);

  // ============================================================================
  // Real-time Subscription
  // ============================================================================

  useEffect(() => {
    if (!userId || !realtime) return;

    const channel = supabase
      .channel(`background_jobs:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_agent_jobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as BackgroundAgentJob;
            setJobs(prev => [newJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as BackgroundAgentJob;
            setJobs(prev => 
              prev.map(j => j.id === updatedJob.id ? updatedJob : j)
            );
            
            // Show toast when job completes
            if (updatedJob.status === 'completed' && runningJobId !== updatedJob.id) {
              showSuccess(`Research "${updatedJob.target}" is ready!`);
            } else if (updatedJob.status === 'failed' && runningJobId !== updatedJob.id) {
              showError(`Research "${updatedJob.target}" failed`);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setJobs(prev => prev.filter(j => j.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [userId, realtime, runningJobId]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ============================================================================
  // Actions
  // ============================================================================

  const startBackgroundJob = useCallback(async (
    params: Omit<CreateJobParams, 'workspaceId' | 'userId'>
  ): Promise<BackgroundAgentJob | null> => {
    if (!userId || !workspaceId) {
      showError('You must be logged in to start a job');
      return null;
    }

    try {
      // Create the job record
      const job = await BackgroundAgentJobService.createJob({
        ...params,
        workspaceId,
        userId,
      });

      if (!job) {
        showError('Failed to create background job');
        return null;
      }

      showSuccess(`Started "${params.target}" research in background`);
      setRunningJobId(job.id);
      setRunningProgress(0);

      // Start the actual agent run in the background
      executeAgentJob(job);

      return job;
    } catch (err) {
      logger.error('[useBackgroundAgentJobs] Error starting job:', err);
      showError('Failed to start background job');
      return null;
    }
  }, [userId, workspaceId]);

  const executeAgentJob = useCallback(async (job: BackgroundAgentJob) => {
    // Mark as running
    await BackgroundAgentJobService.markJobRunning(job.id);
    setRunningProgress(10);

    let accumulatedOutput = '';
    let sources: { url: string; title?: string; snippet?: string }[] = [];
    let metadata: Record<string, unknown> = {};

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const handleProgress = (event: StreamProgressEvent) => {
        switch (event.type) {
          case 'delta':
            if (event.delta) {
              accumulatedOutput += event.delta;
              // Update progress based on output length (rough estimate)
              const progress = Math.min(90, 10 + Math.floor(accumulatedOutput.length / 100));
              setRunningProgress(progress);
              // Update job progress in DB periodically (every ~500 chars)
              if (accumulatedOutput.length % 500 < 10) {
                BackgroundAgentJobService.updateJob(job.id, { progress });
              }
            }
            break;
          case 'sources':
            if (event.sources) {
              sources = event.sources;
            }
            break;
          case 'done':
            setRunningProgress(95);
            break;
        }
      };

      // Run the agent
      const response = await runYouAgent({
        agent: job.agent_slug as YouAgentSlug,
        input: job.input_prompt,
        context: job.context,
        stream: true,
        onProgress: handleProgress,
      });

      // Complete the job and save report
      const result = await BackgroundAgentJobService.completeJob(
        job.id,
        response.output || accumulatedOutput,
        response.sources || sources,
        response.metadata || metadata,
        job
      );

      setRunningProgress(100);
      setRunningJobId(null);
      
      if (result.success) {
        showSuccess(`"${job.target}" research completed and saved!`);
      }
    } catch (err) {
      logger.error('[useBackgroundAgentJobs] Job execution error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      await BackgroundAgentJobService.failJob(job.id, errorMessage, job);
      setRunningJobId(null);
      setRunningProgress(0);
      
      showError(`Research failed: ${errorMessage}`);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      // Cancel in-flight request if this is the running job
      if (runningJobId === jobId && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setRunningJobId(null);
        setRunningProgress(0);
      }

      const success = await BackgroundAgentJobService.cancelJob(jobId);
      if (success) {
        showSuccess('Job cancelled');
      }
      return success;
    } catch (err) {
      logger.error('[useBackgroundAgentJobs] Error cancelling job:', err);
      showError('Failed to cancel job');
      return false;
    }
  }, [runningJobId]);

  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const success = await BackgroundAgentJobService.deleteJob(jobId);
      if (success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        showSuccess('Job deleted');
      }
      return success;
    } catch (err) {
      logger.error('[useBackgroundAgentJobs] Error deleting job:', err);
      showError('Failed to delete job');
      return false;
    }
  }, []);

  const refreshJobs = useCallback(async () => {
    await fetchJobs();
  }, [fetchJobs]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'running');

  // ============================================================================
  // Return
  // ============================================================================

  return {
    jobs,
    activeJobs,
    isLoading,
    error,
    realtimeConnected,
    startBackgroundJob,
    cancelJob,
    deleteJob,
    refreshJobs,
    runningJobId,
    runningProgress,
  };
}

export default useBackgroundAgentJobs;
