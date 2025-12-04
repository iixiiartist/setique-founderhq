// lib/services/backgroundAgentJobService.ts
// Service for managing AI agent background jobs
// Allows users to start agent jobs and continue working while they run in the background

import { supabase } from '../supabase';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';
import { AgentReportService, type CreateReportParams } from './agentReportService';
import { createNotification } from './notificationService';
import type { AgentSource } from './youAgentClient';

// ============================================================================
// Types
// ============================================================================

export type BackgroundJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundAgentJob {
  id: string;
  workspace_id: string;
  user_id: string;
  agent_slug: string;
  target: string;
  goal: string;
  notes: string | null;
  urls: string[] | null;
  input_prompt: string;
  context: Record<string, unknown>;
  status: BackgroundJobStatus;
  progress: number;
  error_message: string | null;
  output: string | null;
  sources: AgentSource[];
  metadata: Record<string, unknown>;
  report_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  notify_on_complete: boolean;
  notified_at: string | null;
}

export interface CreateJobParams {
  workspaceId: string;
  userId: string;
  agentSlug: string;
  target: string;
  goal: string;
  notes?: string;
  urls?: string[];
  inputPrompt: string;
  context?: Record<string, unknown>;
  notifyOnComplete?: boolean;
}

export interface UpdateJobParams {
  status?: BackgroundJobStatus;
  progress?: number;
  errorMessage?: string;
  output?: string;
  sources?: AgentSource[];
  metadata?: Record<string, unknown>;
  reportId?: string;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// Service
// ============================================================================

export class BackgroundAgentJobService {
  /**
   * Create a new background job
   */
  static async createJob(params: CreateJobParams): Promise<BackgroundAgentJob | null> {
    try {
      return await withRetry(
        async () => {
          const { data, error } = await supabase
            .from('background_agent_jobs')
            .insert({
              workspace_id: params.workspaceId,
              user_id: params.userId,
              agent_slug: params.agentSlug,
              target: params.target,
              goal: params.goal,
              notes: params.notes || null,
              urls: params.urls || null,
              input_prompt: params.inputPrompt,
              context: params.context || {},
              notify_on_complete: params.notifyOnComplete ?? true,
              status: 'pending',
              progress: 0,
            })
            .select()
            .single();

          if (error) {
            logger.error('[BackgroundAgentJobService] Error creating job:', error);
            throw error;
          }

          logger.info('[BackgroundAgentJobService] Job created:', data.id);
          return data as BackgroundAgentJob;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 500,
          onRetry: (attempt, err) => {
            logger.warn(`[BackgroundAgentJobService] Create retry attempt ${attempt}:`, err);
          },
        }
      );
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Failed to create job after retries:', err);
      return null;
    }
  }

  /**
   * Update a job's status and data
   */
  static async updateJob(jobId: string, updates: UpdateJobParams): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      if (updates.output !== undefined) updateData.output = updates.output;
      if (updates.sources !== undefined) updateData.sources = updates.sources;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.reportId !== undefined) updateData.report_id = updates.reportId;
      if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

      const { error } = await supabase
        .from('background_agent_jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        logger.error('[BackgroundAgentJobService] Error updating job:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Unexpected error updating job:', err);
      return false;
    }
  }

  /**
   * Mark job as running
   */
  static async markJobRunning(jobId: string): Promise<boolean> {
    return this.updateJob(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: 10,
    });
  }

  /**
   * Mark job as completed and save report
   */
  static async completeJob(
    jobId: string,
    output: string,
    sources: AgentSource[],
    metadata: Record<string, unknown>,
    job: BackgroundAgentJob
  ): Promise<{ success: boolean; reportId?: string }> {
    try {
      // Save the report automatically
      const report = await AgentReportService.saveReport({
        workspaceId: job.workspace_id,
        userId: job.user_id,
        agentSlug: job.agent_slug,
        target: job.target,
        goal: job.goal,
        notes: job.notes || undefined,
        urls: job.urls || undefined,
        output,
        sources,
        metadata: {
          ...metadata,
          background_job_id: jobId,
        },
      });

      // Update job as completed
      await this.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        output,
        sources,
        metadata,
        reportId: report?.id,
        completedAt: new Date().toISOString(),
      });

      // Send notification if enabled
      if (job.notify_on_complete) {
        await this.notifyJobComplete(job, report?.id);
      }

      logger.info('[BackgroundAgentJobService] Job completed:', jobId, 'Report:', report?.id);
      return { success: true, reportId: report?.id };
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Error completing job:', err);
      return { success: false };
    }
  }

  /**
   * Mark job as failed
   */
  static async failJob(jobId: string, errorMessage: string, job: BackgroundAgentJob): Promise<boolean> {
    try {
      await this.updateJob(jobId, {
        status: 'failed',
        errorMessage,
        completedAt: new Date().toISOString(),
      });

      // Send failure notification if enabled
      if (job.notify_on_complete) {
        await this.notifyJobFailed(job, errorMessage);
      }

      return true;
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Error failing job:', err);
      return false;
    }
  }

  /**
   * Cancel a pending or running job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    return this.updateJob(jobId, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Get a job by ID
   */
  static async getJob(jobId: string): Promise<BackgroundAgentJob | null> {
    try {
      const { data, error } = await supabase
        .from('background_agent_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        logger.error('[BackgroundAgentJobService] Error fetching job:', error);
        return null;
      }

      return data as BackgroundAgentJob;
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Unexpected error fetching job:', err);
      return null;
    }
  }

  /**
   * Get all jobs for a user
   */
  static async getUserJobs(
    userId: string,
    options: { limit?: number; includeCompleted?: boolean } = {}
  ): Promise<BackgroundAgentJob[]> {
    try {
      const { limit = 20, includeCompleted = true } = options;

      let query = supabase
        .from('background_agent_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeCompleted) {
        query = query.in('status', ['pending', 'running']);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[BackgroundAgentJobService] Error fetching user jobs:', error);
        return [];
      }

      return (data || []) as BackgroundAgentJob[];
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Unexpected error fetching user jobs:', err);
      return [];
    }
  }

  /**
   * Get pending/running jobs for a user
   */
  static async getActiveJobs(userId: string): Promise<BackgroundAgentJob[]> {
    return this.getUserJobs(userId, { includeCompleted: false });
  }

  /**
   * Delete a job
   */
  static async deleteJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('background_agent_jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        logger.error('[BackgroundAgentJobService] Error deleting job:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Unexpected error deleting job:', err);
      return false;
    }
  }

  /**
   * Send notification when job completes successfully
   */
  private static async notifyJobComplete(job: BackgroundAgentJob, reportId?: string): Promise<void> {
    try {
      await createNotification({
        userId: job.user_id,
        workspaceId: job.workspace_id,
        type: 'agent_job_completed',
        title: '✅ Research Report Ready',
        message: `Your "${job.target}" research is complete. Click to view the report.`,
        entityType: 'document',
        entityId: reportId || job.id,
        priority: 'normal',
        actionUrl: `/agents?report=${reportId || job.id}`,
        metadata: {
          jobId: job.id,
          reportId,
          agentSlug: job.agent_slug,
          target: job.target,
          goal: job.goal,
        },
      });

      // Mark as notified
      await supabase
        .from('background_agent_jobs')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', job.id);

      logger.info('[BackgroundAgentJobService] Sent completion notification for job:', job.id);
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Error sending completion notification:', err);
    }
  }

  /**
   * Send notification when job fails
   */
  private static async notifyJobFailed(job: BackgroundAgentJob, errorMessage: string): Promise<void> {
    try {
      await createNotification({
        userId: job.user_id,
        workspaceId: job.workspace_id,
        type: 'agent_job_failed',
        title: '❌ Research Failed',
        message: `The "${job.target}" research encountered an error. You can try again.`,
        entityType: 'document',
        entityId: job.id,
        priority: 'normal',
        actionUrl: `/agents`,
        metadata: {
          jobId: job.id,
          agentSlug: job.agent_slug,
          target: job.target,
          goal: job.goal,
          error: errorMessage,
        },
      });

      // Mark as notified
      await supabase
        .from('background_agent_jobs')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', job.id);

      logger.info('[BackgroundAgentJobService] Sent failure notification for job:', job.id);
    } catch (err) {
      logger.error('[BackgroundAgentJobService] Error sending failure notification:', err);
    }
  }
}

export default BackgroundAgentJobService;
