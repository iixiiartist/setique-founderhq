import { supabase } from '../supabase';

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    content: string;
    title: string;
    created_by: string;
    created_by_name: string;
    created_at: string;
    change_summary?: string;
}

export interface VersionDiff {
    additions: number;
    deletions: number;
    changes: Array<{
        type: 'add' | 'remove' | 'modify';
        line: number;
        content: string;
    }>;
}

/**
 * Save a new version of a document
 */
export async function saveDocumentVersion(
    documentId: string,
    workspaceId: string,
    content: string,
    title: string,
    userId: string,
    userName: string,
    changeSummary?: string
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
    try {
        // Get the latest version number
        const { data: versions, error: versionError } = await supabase
            .from('document_versions')
            .select('version_number')
            .eq('document_id', documentId)
            .order('version_number', { ascending: false })
            .limit(1);

        if (versionError) throw versionError;

        const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

        // Insert new version
        const { data, error } = await supabase
            .from('document_versions')
            .insert({
                document_id: documentId,
                workspace_id: workspaceId,
                version_number: nextVersion,
                content,
                title,
                created_by: userId,
                created_by_name: userName,
                change_summary: changeSummary,
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, version: data };
    } catch (error) {
        console.error('Error saving document version:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Get all versions for a document
 */
export async function getDocumentVersions(
    documentId: string
): Promise<{ success: boolean; versions?: DocumentVersion[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('document_versions')
            .select('*')
            .eq('document_id', documentId)
            .order('version_number', { ascending: false });

        if (error) throw error;

        return { success: true, versions: data || [] };
    } catch (error) {
        console.error('Error fetching document versions:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Get a specific version
 */
export async function getDocumentVersion(
    versionId: string
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('document_versions')
            .select('*')
            .eq('id', versionId)
            .single();

        if (error) throw error;

        return { success: true, version: data };
    } catch (error) {
        console.error('Error fetching document version:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Restore a document to a previous version
 */
export async function restoreDocumentVersion(
    documentId: string,
    versionId: string,
    currentUserId: string,
    currentUserName: string
): Promise<{ success: boolean; restoredVersion?: DocumentVersion; error?: string }> {
    try {
        // Get the version to restore
        const { version, error: fetchError } = await getDocumentVersion(versionId);
        if (fetchError || !version) {
            return { success: false, error: fetchError || 'Version not found' };
        }

        // Update the document with the restored content
        const { error: updateError } = await supabase
            .from('documents')
            .update({
                content: version.content,
                title: version.title,
                updated_at: new Date().toISOString(),
            })
            .eq('id', documentId);

        if (updateError) throw updateError;

        // Save a new version marking the restoration
        const { data: workspace } = await supabase
            .from('documents')
            .select('workspace_id')
            .eq('id', documentId)
            .single();

        if (workspace) {
            await saveDocumentVersion(
                documentId,
                workspace.workspace_id,
                version.content,
                version.title,
                currentUserId,
                currentUserName,
                `Restored to version ${version.version_number}`
            );
        }

        return { success: true, restoredVersion: version };
    } catch (error) {
        console.error('Error restoring document version:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Compare two versions and calculate diff
 */
export function compareVersions(oldContent: string, newContent: string): VersionDiff {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const changes: VersionDiff['changes'] = [];
    let additions = 0;
    let deletions = 0;

    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';

        if (oldLine !== newLine) {
            if (!oldLine) {
                // Line was added
                changes.push({
                    type: 'add',
                    line: i + 1,
                    content: newLine,
                });
                additions++;
            } else if (!newLine) {
                // Line was removed
                changes.push({
                    type: 'remove',
                    line: i + 1,
                    content: oldLine,
                });
                deletions++;
            } else {
                // Line was modified
                changes.push({
                    type: 'modify',
                    line: i + 1,
                    content: newLine,
                });
                additions++;
                deletions++;
            }
        }
    }

    return { additions, deletions, changes };
}

/**
 * Auto-save document version (debounced)
 */
let autoSaveTimeout: NodeJS.Timeout | null = null;

export function scheduleAutoSave(
    documentId: string,
    workspaceId: string,
    content: string,
    title: string,
    userId: string,
    userName: string,
    delayMs: number = 10000 // 10 seconds default
): void {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
        saveDocumentVersion(
            documentId,
            workspaceId,
            content,
            title,
            userId,
            userName,
            'Auto-saved'
        );
    }, delayMs);
}

export function cancelAutoSave(): void {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
    }
}
