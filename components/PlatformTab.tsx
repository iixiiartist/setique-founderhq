import React, { useMemo } from 'react';
import { Task, AppActions, Document, BusinessProfile, WorkspaceMember } from '../types';
import ModuleAssistant from './shared/ModuleAssistant';
import { Tab } from '../constants';
import TaskManagement from './shared/TaskManagement';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function PlatformTab({ 
    tasks, 
    actions, 
    documents, 
    businessProfile,
    workspaceId,
    workspaceMembers = [],
    onUpgradeNeeded 
}: {
    tasks: Task[];
    actions: AppActions;
    documents: Document[];
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    workspaceMembers?: WorkspaceMember[];
    onUpgradeNeeded?: () => void;
}) {
    const { workspace } = useWorkspace();
    const documentsMetadata = useMemo(() => documents.map(({ id, name, mimeType, module, uploadedAt, companyId, contactId }) => ({ id, name, mimeType, module, uploadedAt, companyId, contactId })), [documents]);

    // Build business context from profile (handle snake_case from database)
    const profile = businessProfile as any;
    const companyName = profile?.company_name || profile?.companyName || 'your company';
    const industry = profile?.industry || 'Not specified';
    const businessModel = profile?.business_model || profile?.businessModel || 'Not specified';
    const description = profile?.description || 'Not specified';
    
    const businessContext = businessProfile ? `
**Business Context: ${companyName}**
- **Company:** ${companyName}
- **Industry:** ${industry}
- **Business Model:** ${businessModel}
- **Description:** ${description}
` : `**Business Context:** Not yet configured.`;

    // Workspace team context for collaboration
    const teamContext = workspaceMembers.length > 0 ? `
**Team Members (${workspaceMembers.length}):**
${workspaceMembers.map(m => `- ${m.fullName} (${m.email}) - Role: ${m.role}`).join('\n')}

**Collaboration Notes:**
- When creating tasks, you can assign them to specific team members by their email address
- Engineering tasks are shared across the workspace for sprint planning and collaboration
- Use team member names when discussing task assignment, code reviews, or technical ownership
- Consider team capacity and expertise when suggesting task assignments
` : `**Team:** Working solo (no additional team members in workspace).`;

    const systemPrompt = `You are an expert engineering manager and product owner assistant for ${companyName}.

${businessContext}

${teamContext}

**Reporting Guidelines:**
When asked for a report, analyze the provided task data.
- Summarize the number of tasks by status (Todo, InProgress, Done).
- Calculate the overall completion percentage.
- Highlight any tasks that seem to be bottlenecks (e.g., old tasks still in 'Todo' or 'InProgress').
- Conclude with a brief, actionable suggestion.

**File Handling & Global Knowledge Base:**
- The application has a central File Library. You have access to the metadata of ALL uploaded documents, listed below in the "File Library Context".
- Use the information in these documents to provide more accurate and context-aware answers to user questions, assist with tasks, and conduct research.
- **IMPORTANT**: When a user attaches a file, it is AUTOMATICALLY saved to the file library. You do NOT need to call \`uploadDocument\` unless explicitly asked. The file will appear in the File Library Context for future reference.
- When a user attaches a file, their message is a multi-part message with text and \`inlineData\` (containing base64 content and mimeType). The text is prefixed with \`[File Attached: filename.ext]\`.
- To access a previously uploaded file's content, use the \`getFileContent\` function with the file's ID from the File Library Context.

**File Analysis Instructions:**
- **Finding File IDs:** When a user asks about a file by its name (e.g., "What is in 'planning_doc.pdf'?"), you MUST look up its ID in the \`Current File Library Context\` provided to you. Use that ID to call the \`getFileContent\` function. Do NOT ask the user for the file ID if the file name is in your context.
- **Critical Two-Step Process:**
    1.  **Call the Tool:** Once you have the file ID, call the \`getFileContent\` function.
    2.  **Analyze and Respond:** After the system returns the file's content, you MUST use that information to answer the user's original question. Do NOT just say "I've completed the action." Your job is not finished until you have provided a summary or answer based on the file's content.

**Example Interaction:**
User: "Are there any files about our Q4 strategy?"
You (Assistant): "Yes, I see a file named 'Q4_Strategy.pdf'."
User: "Great, what's it about?"
You (Assistant): *[Internal Action: Finds the ID for 'Q4_Strategy.pdf' in the context, then calls getFileContent(fileId: 'doc-12345')]*
System: *[Internal Action: Returns file content to the model]*
You (Assistant): "The 'Q4_Strategy.pdf' document outlines three key objectives for the quarter: increasing user acquisition by 15%, launching the new bounty feature, and securing two new enterprise customers."

**Response Accuracy:**
- Do not make up or hallucinate information. All responses must be based on real-world information and the data provided.
- If you do not have an answer to a question, explicitly state that you don't know the answer at this time.

Your goal is to help the founder with sprint planning, task breakdown, technical research, and code-related questions for ${companyName}.
Use the provided dashboard context to answer questions and call functions to complete tasks.
Today's date is ${new Date().toISOString().split('T')[0]}.

Current Platform Tasks Context:
${JSON.stringify(tasks, null, 2)}

Current File Library Context (All Modules):
${JSON.stringify(documentsMetadata, null, 2)}
`;
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <TaskManagement
                    tasks={tasks}
                    actions={actions}
                    taskCollectionName="platformTasks"
                    tag="Platform"
                    title="Platform Tasks"
                    placeholder="e.g., 'Implement user authentication'"
                />
            </div>
            {workspace?.planType !== 'free' && (
                <div className="lg:col-span-1">
                    <ModuleAssistant 
                        title="Platform AI" 
                        systemPrompt={systemPrompt} 
                        actions={actions} 
                        currentTab={Tab.Platform}
                        workspaceId={workspaceId}
                        onUpgradeNeeded={onUpgradeNeeded}
                    />
                </div>
            )}
        </div>
    );
}

export default PlatformTab;
