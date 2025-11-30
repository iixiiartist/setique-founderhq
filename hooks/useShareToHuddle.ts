// hooks/useShareToHuddle.ts
// Hook for sharing items to Huddle from any tab

import { useState, useCallback } from 'react';
import type { ShareToHuddlePayload } from '../types/huddle';
import type { Task, Contact, CalendarEvent } from '../types';

export interface UseShareToHuddleReturn {
  isOpen: boolean;
  payload: ShareToHuddlePayload | null;
  openShareModal: (payload: ShareToHuddlePayload) => void;
  closeShareModal: () => void;
  // Convenience methods for different types
  shareTask: (task: Task) => void;
  shareContact: (contact: Contact, companyName?: string) => void;
  shareDeal: (deal: any) => void;
  shareDocument: (doc: { id: string; title: string; description?: string }) => void;
  shareForm: (form: { id: string; title: string; description?: string }) => void;
  shareFile: (file: { id: string; name: string; url?: string; type?: string }) => void;
  shareCalendarEvent: (event: CalendarEvent) => void;
}

export function useShareToHuddle(): UseShareToHuddleReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<ShareToHuddlePayload | null>(null);

  const openShareModal = useCallback((p: ShareToHuddlePayload) => {
    setPayload(p);
    setIsOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsOpen(false);
    setPayload(null);
  }, []);

  // Share a task
  const shareTask = useCallback((task: Task) => {
    openShareModal({
      type: 'task',
      id: task.id,
      title: task.text, // Task uses 'text' not 'title'
      description: undefined,
      preview: {
        snippet: task.status ? `Status: ${task.status} | Priority: ${task.priority}` : undefined,
      },
    });
  }, [openShareModal]);

  // Share a contact
  const shareContact = useCallback((contact: Contact, companyName?: string) => {
    openShareModal({
      type: 'contact',
      id: contact.id,
      title: contact.name || 'Contact',
      description: contact.email || undefined,
      preview: {
        snippet: companyName ? `Company: ${companyName}` : (contact.title || undefined),
      },
    });
  }, [openShareModal]);

  // Share a deal
  const shareDeal = useCallback((deal: any) => {
    const valueStr = deal.value ? `$${deal.value.toLocaleString()}` : '';
    openShareModal({
      type: 'deal',
      id: deal.id,
      title: deal.title || deal.name || 'Deal',
      description: deal.description || undefined,
      preview: {
        snippet: [deal.stage, valueStr].filter(Boolean).join(' | ') || undefined,
      },
    });
  }, [openShareModal]);

  // Share a document
  const shareDocument = useCallback((doc: { id: string; title: string; description?: string }) => {
    openShareModal({
      type: 'document',
      id: doc.id,
      title: doc.title,
      description: doc.description,
    });
  }, [openShareModal]);

  // Share a form
  const shareForm = useCallback((form: { id: string; title: string; description?: string }) => {
    openShareModal({
      type: 'form',
      id: form.id,
      title: form.title,
      description: form.description,
    });
  }, [openShareModal]);

  // Share a file
  const shareFile = useCallback((file: { id: string; name: string; url?: string; type?: string }) => {
    openShareModal({
      type: 'file',
      id: file.id,
      title: file.name,
      url: file.url,
      preview: {
        snippet: file.type || undefined,
      },
    });
  }, [openShareModal]);

  // Share a calendar event
  // CalendarEvent is a union type with different properties per type
  const shareCalendarEvent = useCallback((event: CalendarEvent) => {
    // Get dueDate which all calendar event types have
    const dateStr = event.dueDate ? new Date(event.dueDate).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) : '';

    // Get title - different properties depending on event type
    const title = (event as any).title || (event as any).name || 'Calendar Event';

    openShareModal({
      type: 'calendar_event',
      id: event.id,
      title,
      description: event.description || undefined,
      preview: {
        snippet: [dateStr, event.location].filter(Boolean).join(' | '),
      },
      startTime: (event as any).start || undefined,
      endTime: (event as any).end || undefined,
      location: event.location || undefined,
      attendees: (event as any).attendees || undefined,
    });
  }, [openShareModal]);

  return {
    isOpen,
    payload,
    openShareModal,
    closeShareModal,
    shareTask,
    shareContact,
    shareDeal,
    shareDocument,
    shareForm,
    shareFile,
    shareCalendarEvent,
  };
}

export default useShareToHuddle;
