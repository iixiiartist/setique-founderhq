/**
 * EmailComposerWrapper
 * 
 * Provides backward-compatible API (isOpen, isInline) while using the refactored
 * EmailComposer internally. This wrapper handles:
 * - Conditional rendering based on isOpen prop
 * - Modal vs inline display modes
 * - Portal rendering for modal mode
 * 
 * Migration path:
 * 1. Replace EmailComposer imports with EmailComposerWrapper
 * 2. After all consumers migrated, remove legacy EmailComposer.tsx
 * 3. Eventually refactor consumers to use EmailComposerRefactored directly
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { EmailComposerRefactored, EmailComposerProps as RefactoredProps } from './composer';
import { EmailAttachment } from './composer/hooks/useEmailComposer';

// Re-export EmailAttachment for consumers
export type { EmailAttachment };

// Legacy props interface matching the old EmailComposer
export interface EmailComposerWrapperProps {
    /** Controls visibility - when false, component returns null */
    isOpen: boolean;
    /** Called when composer should close */
    onClose: () => void;
    /** Reply to an existing email */
    replyTo?: {
        id?: string;
        from_address?: string;
        to_addresses?: string[];
        subject?: string;
        body?: { text?: string; html?: string };
        snippet?: string;
        thread_id?: string;
        account_id?: string;
    };
    /** Default Gmail account ID to use */
    defaultAccountId?: string;
    /** If true, renders inline instead of as a modal */
    isInline?: boolean;
    /** Pre-fill subject line */
    initialSubject?: string;
    /** Pre-fill body content (HTML) */
    initialBody?: string;
    /** Edit an existing draft */
    editDraft?: {
        id: string;
        provider_message_id?: string;
        subject?: string;
        to_addresses?: string[];
        cc_addresses?: string[];
        body?: {
            html?: string;
            text?: string;
            attachments?: EmailAttachment[];
        };
    } | null;
    /** Called after a draft is deleted */
    onDraftDeleted?: () => void;
    /** Pre-attach files */
    initialAttachments?: EmailAttachment[];
    /** Workspace ID */
    workspaceId?: string;
}

/**
 * Wrapper component providing legacy API compatibility.
 * 
 * Usage:
 * ```tsx
 * <EmailComposerWrapper
 *   isOpen={showComposer}
 *   onClose={() => setShowComposer(false)}
 *   replyTo={selectedEmail}
 * />
 * ```
 */
export function EmailComposerWrapper({
    isOpen,
    onClose,
    replyTo,
    defaultAccountId,
    isInline = false,
    initialSubject,
    initialBody,
    editDraft,
    onDraftDeleted,
    initialAttachments,
    workspaceId,
}: EmailComposerWrapperProps) {
    // Don't render if not open
    if (!isOpen) return null;

    // Map legacy props to refactored props
    const refactoredProps: RefactoredProps = {
        onClose,
        replyTo,
        gmailAccountId: defaultAccountId,
        workspaceId,
        onDraftDeleted,
        className: isInline ? 'w-full' : '',
    };

    // Handle draft data mapping
    if (editDraft) {
        refactoredProps.draftData = {
            id: editDraft.id,
            to_addresses: editDraft.to_addresses,
            cc_addresses: editDraft.cc_addresses,
            subject: editDraft.subject,
            body: editDraft.body,
        };
    }

    // Handle initial content (not a draft)
    // Note: The refactored component handles initialSubject/initialBody differently
    // For now, we'll use replyTo pattern for initial content
    if (initialSubject || initialBody) {
        if (!refactoredProps.replyTo) {
            // Create a pseudo replyTo to set initial values
            refactoredProps.replyTo = {
                subject: initialSubject,
                body: initialBody ? { html: initialBody } : undefined,
            };
        }
    }

    // Handle initial attachments via draftData
    if (initialAttachments?.length && !refactoredProps.draftData) {
        refactoredProps.draftData = {
            body: { attachments: initialAttachments },
        };
    } else if (initialAttachments?.length && refactoredProps.draftData) {
        refactoredProps.draftData.body = {
            ...refactoredProps.draftData.body,
            attachments: initialAttachments,
        };
    }

    const composerElement = <EmailComposerRefactored {...refactoredProps} />;

    // Inline mode - render directly
    if (isInline) {
        return composerElement;
    }

    // Modal mode - render in portal with backdrop
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Modal container */}
            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] m-4 overflow-hidden rounded-xl shadow-2xl">
                {composerElement}
            </div>
        </div>,
        document.body
    );
}

// Default export for easier migration
export default EmailComposerWrapper;

// Named export matching legacy pattern
export { EmailComposerWrapper as EmailComposer };
