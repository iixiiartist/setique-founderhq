// lib/services/agentReportService.ts
// Service for saving and retrieving Research Agent reports

import { supabase } from '../supabase';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';
import type { AgentSource } from './youAgentClient';

export interface AgentReport {
  id: string;
  workspace_id: string;
  user_id: string;
  agent_slug: string;
  target: string;
  goal: string;
  notes: string | null;
  urls: string[] | null;
  output: string;
  sources: AgentSource[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateReportParams {
  workspaceId: string;
  userId: string;
  agentSlug: string;
  target: string;
  goal: string;
  notes?: string;
  urls?: string[];
  output: string;
  sources?: AgentSource[];
  metadata?: Record<string, unknown>;
}

export class AgentReportService {
  /**
   * Save a new agent report (with retry for transient failures)
   */
  static async saveReport(params: CreateReportParams): Promise<AgentReport | null> {
    try {
      return await withRetry(
        async () => {
          const { data, error } = await supabase
            .from('agent_reports')
            .insert({
              workspace_id: params.workspaceId,
              user_id: params.userId,
              agent_slug: params.agentSlug,
              target: params.target,
              goal: params.goal,
              notes: params.notes || null,
              urls: params.urls || null,
              output: params.output,
              sources: params.sources || [],
              metadata: params.metadata || {},
            })
            .select()
            .single();

          if (error) {
            logger.error('[AgentReportService] Error saving report:', error);
            throw error; // Throw to trigger retry
          }

          logger.info('[AgentReportService] Report saved:', data.id);
          return data as AgentReport;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 500,
          onRetry: (attempt, err) => {
            logger.warn(`[AgentReportService] Save retry attempt ${attempt}:`, err);
          },
        }
      );
    } catch (err) {
      logger.error('[AgentReportService] Failed to save report after retries:', err);
      return null;
    }
  }

  /**
   * Get all reports for a workspace
   */
  static async getReports(workspaceId: string, limit = 50): Promise<AgentReport[]> {
    try {
      const { data, error } = await supabase
        .from('agent_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[AgentReportService] Error fetching reports:', error);
        return [];
      }

      return (data || []) as AgentReport[];
    } catch (err) {
      logger.error('[AgentReportService] Unexpected error fetching reports:', err);
      return [];
    }
  }

  /**
   * Get a single report by ID
   */
  static async getReport(reportId: string): Promise<AgentReport | null> {
    try {
      const { data, error } = await supabase
        .from('agent_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        logger.error('[AgentReportService] Error fetching report:', error);
        return null;
      }

      return data as AgentReport;
    } catch (err) {
      logger.error('[AgentReportService] Unexpected error fetching report:', err);
      return null;
    }
  }

  /**
   * Delete a report (with retry for transient failures)
   */
  static async deleteReport(reportId: string): Promise<boolean> {
    try {
      await withRetry(
        async () => {
          const { error } = await supabase
            .from('agent_reports')
            .delete()
            .eq('id', reportId);

          if (error) {
            logger.error('[AgentReportService] Error deleting report:', error);
            throw error; // Throw to trigger retry
          }

          logger.info('[AgentReportService] Report deleted:', reportId);
        },
        {
          maxAttempts: 3,
          initialDelayMs: 500,
          onRetry: (attempt, err) => {
            logger.warn(`[AgentReportService] Delete retry attempt ${attempt}:`, err);
          },
        }
      );
      return true;
    } catch (err) {
      logger.error('[AgentReportService] Failed to delete report after retries:', err);
      return false;
    }
  }

  /**
   * Search reports by target name
   */
  static async searchReports(workspaceId: string, query: string): Promise<AgentReport[]> {
    try {
      const { data, error } = await supabase
        .from('agent_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('target', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('[AgentReportService] Error searching reports:', error);
        return [];
      }

      return (data || []) as AgentReport[];
    } catch (err) {
      logger.error('[AgentReportService] Unexpected error searching reports:', err);
      return [];
    }
  }
}
