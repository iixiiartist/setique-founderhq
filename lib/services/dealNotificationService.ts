/**
 * Deal Notification Service
 * 
 * Sends notifications for important deal events:
 * - Deal won
 * - Deal lost
 * - Deal stage changes
 * - New contacts added
 */

import { createNotification, createNotificationsBatch } from './notificationService';
import { logger } from '../logger';

export interface Deal {
  id: string;
  name: string;
  stage: string;
  value?: number;
  assignedTo?: string;
  workspaceId?: string;
}

/**
 * Notify team when a deal is won
 */
export async function notifyDealWon(params: {
  dealId: string;
  dealName: string;
  dealValue?: number;
  userId: string;
  workspaceId: string;
  teamMembers?: string[]; // Notify entire team
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const valueStr = params.dealValue 
      ? ` worth $${params.dealValue.toLocaleString()}` 
      : '';
    
    // If team members provided, notify everyone
    if (params.teamMembers && params.teamMembers.length > 0) {
      const notifications = params.teamMembers.map(memberId => ({
        userId: memberId,
        workspaceId: params.workspaceId,
        type: 'deal_won' as const,
        title: '🎉 Deal Won!',
        message: `"${params.dealName}"${valueStr} has been won!`,
        entityType: 'deal' as const,
        entityId: params.dealId,
      }));

      const { created, error } = await createNotificationsBatch(notifications);
      
      if (error) {
        logger.error('[DealNotificationService] Failed to send deal won notifications:', error);
        return { success: false, error };
      }

      logger.info('[DealNotificationService] Sent deal won notifications:', {
        dealId: params.dealId,
        recipients: created,
      });

      return { success: true, error: null };
    }

    // Otherwise, just notify the assigned user
    const { notification, error } = await createNotification({
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: 'deal_won',
      title: '🎉 Deal Won!',
      message: `Congratulations! You won "${params.dealName}"${valueStr}`,
      entityType: 'deal',
      entityId: params.dealId,
    });

    if (error) {
      logger.error('[DealNotificationService] Failed to send deal won notification:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    logger.error('[DealNotificationService] Error sending deal won notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Notify when a deal is lost
 */
export async function notifyDealLost(params: {
  dealId: string;
  dealName: string;
  userId: string;
  workspaceId: string;
  reason?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const message = params.reason
      ? `"${params.dealName}" was marked as lost. Reason: ${params.reason}`
      : `"${params.dealName}" was marked as lost`;

    const { notification, error } = await createNotification({
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: 'deal_lost',
      title: '😢 Deal Lost',
      message,
      entityType: 'deal',
      entityId: params.dealId,
    });

    if (error) {
      logger.error('[DealNotificationService] Failed to send deal lost notification:', error);
      return { success: false, error };
    }

    logger.info('[DealNotificationService] Sent deal lost notification:', {
      dealId: params.dealId,
      to: params.userId,
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('[DealNotificationService] Error sending deal lost notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Notify when deal stage changes
 */
export async function notifyDealStageChanged(params: {
  dealId: string;
  dealName: string;
  oldStage: string;
  newStage: string;
  userId: string;
  workspaceId: string;
  changedByName?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const byWhom = params.changedByName ? ` by ${params.changedByName}` : '';
    
    const { notification, error } = await createNotification({
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: 'deal_stage_changed',
      title: '📊 Deal Stage Updated',
      message: `"${params.dealName}" moved from ${params.oldStage} to ${params.newStage}${byWhom}`,
      entityType: 'deal',
      entityId: params.dealId,
    });

    if (error) {
      logger.error('[DealNotificationService] Failed to send stage change notification:', error);
      return { success: false, error };
    }

    logger.info('[DealNotificationService] Sent deal stage change notification:', {
      dealId: params.dealId,
      to: params.userId,
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('[DealNotificationService] Error sending stage change notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Notify when a new CRM contact is added
 */
export async function notifyContactAdded(params: {
  contactId: string;
  contactName: string;
  contactType: 'customer' | 'investor' | 'partner';
  userId: string;
  workspaceId: string;
  addedByName: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const typeEmoji = {
      customer: '💼',
      investor: '💰',
      partner: '🤝'
    }[params.contactType];

    const { notification, error } = await createNotification({
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: 'crm_contact_added',
      title: `${typeEmoji} New ${params.contactType.charAt(0).toUpperCase() + params.contactType.slice(1)} Added`,
      message: `${params.addedByName} added ${params.contactName} to your CRM`,
      entityType: 'contact',
      entityId: params.contactId,
    });

    if (error) {
      logger.error('[DealNotificationService] Failed to send contact added notification:', error);
      return { success: false, error };
    }

    logger.info('[DealNotificationService] Sent contact added notification:', {
      contactId: params.contactId,
      to: params.userId,
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('[DealNotificationService] Error sending contact added notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Notify when deal is reassigned to another team member
 */
export async function notifyDealReassigned(params: {
  dealId: string;
  dealName: string;
  fromUserId: string;
  toUserId: string;
  reassignedByName: string;
  workspaceId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { notification, error } = await createNotification({
      userId: params.toUserId,
      workspaceId: params.workspaceId,
      type: 'assignment',
      title: '📋 Deal Assigned to You',
      message: `${params.reassignedByName} assigned you the deal: "${params.dealName}"`,
      entityType: 'deal',
      entityId: params.dealId,
    });

    if (error) {
      logger.error('[DealNotificationService] Failed to send deal reassignment notification:', error);
      return { success: false, error };
    }

    logger.info('[DealNotificationService] Sent deal reassignment notification:', {
      dealId: params.dealId,
      to: params.toUserId,
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error('[DealNotificationService] Error sending deal reassignment notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
