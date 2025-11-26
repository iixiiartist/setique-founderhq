# Embedded AI Writer Implementation Plan

## Overview
Replace the separate AI chat panel with a fully embedded AI writer that can directly insert and edit content in the Tiptap editor with real-time access to workspace data.

**Goal:** AI should feel like a writing partner that understands your GTM strategy, can pull in data from tasks/CRM/calendar, and apply formatting automatically.

---

## Current State vs. Target State

### Current (Separate AI Panel) ❌
- AI chat in separate side panel
- User must copy/paste AI suggestions
- No direct content insertion
- No formatting control
- Limited workspace data access
- Requires manual integration of suggestions

### Target (Embedded AI Writer) ✅
- AI integrated directly in editor
- Can insert content at cursor position
- Can replace selected text
- Applies formatting automatically (headings, lists, bold, etc.)
- Real-time access to workspace data:
  - Current document content
  - Linked tasks with status/dates
  - Linked CRM items with deal status
  - Linked calendar events
  - Other GTM docs in workspace
- Command palette trigger (`/ai` or `Cmd+K`)
- Inline toolbar button
- Smart suggestions based on document type

---

## Architecture

### Components

```
DocEditor.tsx
├── TiptapEditor (existing)
│   ├── Toolbar (add AI button)
│   ├── EditorContent
│   └── BubbleMenu (add AI quick actions)
├── EmbeddedAIWriter (NEW)
│   ├── AICommandPalette (triggered by /ai or Cmd+K)
│   ├── AIToolbarButton (always visible)
│   └── AIContextProvider (fetches workspace data)
└── Metadata Panel (existing)
```

### Data Flow

```
User Action → AI Prompt Builder → Groq API → Content Generator → Tiptap Editor
                    ↓
              Workspace Context:
              - Current doc content
              - Document type
              - Linked entities
              - Other workspace docs
              - User preferences
```

---

## Implementation Steps

### Phase 1: Tiptap Extensions & Commands (1-2 hours)

**1.1: Create AI Command Extension**
```typescript
// extensions/AICommand.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const AICommand = Extension.create({
  name: 'aiCommand',
  
  addCommands() {
    return {
      triggerAI: () => ({ commands }) => {
        // Open AI command palette at cursor
        return true
      },
      insertAIContent: (content: string) => ({ commands }) => {
        // Insert formatted content at cursor
        return commands.insertContent(content)
      },
      replaceSelection: (content: string) => ({ commands }) => {
        // Replace selected text with AI-generated content
        return commands.deleteSelection() && commands.insertContent(content)
      }
    }
  },
  
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        this.editor.commands.triggerAI()
        return true
      }
    }
  },
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('aiCommand'),
        props: {
          handleTextInput(view, from, to, text) {
            // Detect /ai trigger
            if (text === '/') {
              const { state } = view
              const textBefore = state.doc.textBetween(Math.max(0, from - 10), from, '\n')
              if (textBefore.trim() === '' || textBefore.endsWith('\n')) {
                // Show AI command palette
                return true
              }
            }
            return false
          }
        }
      })
    ]
  }
})
```

**1.2: Add Tiptap Bubble Menu for AI Quick Actions**
```typescript
import { BubbleMenu } from '@tiptap/react'

// In DocEditor component
<BubbleMenu editor={editor}>
  <div className="flex gap-1 bg-white border-2 border-black p-1 shadow-neo">
    <button onClick={() => handleAIAction('improve')}>✨ Improve</button>
    <button onClick={() => handleAIAction('expand')}>📝 Expand</button>
    <button onClick={() => handleAIAction('summarize')}>📋 Summarize</button>
    <button onClick={() => handleAIAction('rewrite')}>🔄 Rewrite</button>
  </div>
</BubbleMenu>
```

---

### Phase 2: AI Context Provider (2-3 hours)

**2.1: Create Workspace Context Hook**
```typescript
// hooks/useAIWorkspaceContext.ts
export function useAIWorkspaceContext(docId: string, workspaceId: string) {
  const [context, setContext] = useState<AIWorkspaceContext | null>(null)
  
  useEffect(() => {
    async function fetchContext() {
      // Fetch linked entities
      const linkedDocs = await DatabaseService.getLinkedDocs('gtm_doc', docId)
      
      // Extract task IDs and fetch task data
      const taskIds = linkedDocs
        .filter(l => l.linkedEntityType === 'task')
        .map(l => l.linkedEntityId)
      const tasks = await DatabaseService.loadTasks(workspaceId)
      const linkedTasks = tasks.filter(t => taskIds.includes(t.id))
      
      // Extract CRM IDs and fetch CRM data
      const crmIds = linkedDocs
        .filter(l => l.linkedEntityType === 'crm_item')
        .map(l => l.linkedEntityId)
      const crmItems = await DatabaseService.loadCrmItems(workspaceId)
      const linkedCrmItems = crmItems.filter(c => crmIds.includes(c.id))
      
      // Extract event IDs and fetch calendar data
      const eventIds = linkedDocs
        .filter(l => l.linkedEntityType === 'event')
        .map(l => l.linkedEntityId)
      const events = await DatabaseService.loadCalendarEvents(workspaceId)
      const linkedEvents = events.filter(e => eventIds.includes(e.id))
      
      // Fetch other related docs in workspace
      const allDocs = await DatabaseService.loadGTMDocs(workspaceId)
      const relatedDocs = allDocs.filter(d => 
        d.id !== docId && 
        d.visibility === 'team' && 
        d.tags.some(tag => currentDoc.tags.includes(tag))
      )
      
      setContext({
        linkedTasks,
        linkedCrmItems,
        linkedEvents,
        relatedDocs,
        workspaceId
      })
    }
    
    fetchContext()
  }, [docId, workspaceId])
  
  return context
}
```

**2.2: Create AI Prompt Builder**
```typescript
// utils/aiPromptBuilder.ts
export function buildEmbeddedAIPrompt(
  action: AIAction,
  docType: DocType,
  currentContent: string,
  selection: string | null,
  context: AIWorkspaceContext
): string {
  let prompt = `You are an embedded AI writing assistant in a GTM document editor.

Document Type: ${DOC_TYPE_LABELS[docType]}
Current Document Length: ${currentContent.length} characters

`

  // Add action-specific instructions
  switch (action) {
    case 'improve':
      prompt += `The user has selected text and wants you to improve it. Make it more professional, clear, and compelling while preserving the core message.

Selected Text:
${selection}

Improved Version (return ONLY the improved text, no explanations):`
      break
      
    case 'expand':
      prompt += `The user wants to expand on this section. Add relevant details, examples, and insights based on the document type.

Selected Text:
${selection}

Expanded Version (return formatted markdown with headings/lists as needed):`
      break
      
    case 'generate':
      prompt += `Generate content for this ${docType} based on the user's prompt.`
      break
      
    case 'insert_task_data':
      prompt += `The user wants to include task information in the document.

Linked Tasks:
${context.linkedTasks.map(t => `- ${t.title} (${t.status}, due: ${t.dueDate || 'No date'})`).join('\n')}

Generate a natural paragraph or bullet list that incorporates this task data into the document context.`
      break
      
    case 'insert_crm_data':
      prompt += `Include CRM data in a natural, professional way.

Linked CRM Items:
${context.linkedCrmItems.map(c => `- ${c.company} (${c.status}, next action: ${c.nextAction})`).join('\n')}

Generate formatted content:`
      break
  }
  
  // Add workspace context
  if (context.relatedDocs.length > 0) {
    prompt += `\n\nRelated Documents in Workspace:
${context.relatedDocs.slice(0, 3).map(d => `- ${d.title} (${d.docType})`).join('\n')}

Use these for context if relevant.`
  }
  
  return prompt
}
```

---

### Phase 3: AI Command Palette UI (2-3 hours)

**3.1: Create AICommandPalette Component**
```typescript
// components/workspace/AICommandPalette.tsx
interface AICommandPaletteProps {
  editor: Editor
  position: { top: number; left: number }
  onClose: () => void
  workspaceContext: AIWorkspaceContext
  docType: DocType
}

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  editor,
  position,
  onClose,
  workspaceContext,
  docType
}) => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AICommand[]>([
    { id: 'generate', label: 'Generate content...', icon: '✨' },
    { id: 'improve', label: 'Improve selection', icon: '🎯' },
    { id: 'expand', label: 'Expand on this', icon: '📝' },
    { id: 'summarize', label: 'Summarize', icon: '📋' },
    { id: 'insert_tasks', label: 'Insert linked tasks', icon: '✅' },
    { id: 'insert_crm', label: 'Insert CRM data', icon: '💼' },
    { id: 'insert_events', label: 'Insert calendar events', icon: '📅' },
    { id: 'create_outline', label: `Create ${docType} outline`, icon: '📑' },
  ])
  
  const handleCommand = async (command: AICommand) => {
    setLoading(true)
    try {
      const selection = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      )
      
      const prompt = buildEmbeddedAIPrompt(
        command.id,
        docType,
        editor.getText(),
        selection,
        workspaceContext
      )
      
      const response = await getAiResponse([
        { role: 'user', parts: [{ text: prompt }] }
      ])
      
      // Parse response and insert formatted content
      const formattedContent = parseAIResponse(response, command.id)
      
      if (selection) {
        editor.commands.replaceSelection(formattedContent)
      } else {
        editor.commands.insertAIContent(formattedContent)
      }
      
      onClose()
    } catch (error) {
      console.error('AI command failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div
      className="fixed bg-white border-2 border-black shadow-neo p-2 z-50 w-80"
      style={{ top: position.top, left: position.left }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What do you want to do?"
        className="w-full px-3 py-2 border-2 border-black mb-2"
        autoFocus
      />
      
      {loading ? (
        <div className="p-4 text-center">Generating...</div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {suggestions
            .filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
            .map(command => (
              <button
                key={command.id}
                onClick={() => handleCommand(command)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>{command.icon}</span>
                <span>{command.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
```

**3.2: Integrate into DocEditor**
```typescript
// In DocEditor.tsx
const [showAICommandPalette, setShowAICommandPalette] = useState(false)
const [aiPalettePosition, setAIPalettePosition] = useState({ top: 0, left: 0 })
const workspaceContext = useAIWorkspaceContext(docId, workspaceId)

// Add AI button to toolbar
<button
  onClick={() => {
    const { view } = editor
    const coords = view.coordsAtPos(view.state.selection.from)
    setAIPalettePosition({ top: coords.top + 30, left: coords.left })
    setShowAICommandPalette(true)
  }}
  className="px-3 py-2 bg-purple-500 text-white border-2 border-black hover:bg-purple-600"
>
  🤖 AI
</button>

{showAICommandPalette && (
  <AICommandPalette
    editor={editor}
    position={aiPalettePosition}
    onClose={() => setShowAICommandPalette(false)}
    workspaceContext={workspaceContext}
    docType={docType}
  />
)}
```

---

### Phase 4: Smart Content Insertion (2 hours)

**4.1: Create Content Parser**
```typescript
// utils/aiContentParser.ts
export function parseAIResponse(response: string, commandType: AIAction): string {
  // Parse markdown-style AI response and convert to Tiptap HTML/JSON
  
  // Handle code blocks
  response = response.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`
  })
  
  // Handle headings
  response = response.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  response = response.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  response = response.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  
  // Handle lists
  response = response.replace(/^\* (.*$)/gim, '<li>$1</li>')
  response = response.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  // Handle bold/italic
  response = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  response = response.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Wrap paragraphs
  const lines = response.split('\n').filter(l => l.trim())
  response = lines.map(line => {
    if (!line.startsWith('<')) {
      return `<p>${line}</p>`
    }
    return line
  }).join('\n')
  
  return response
}
```

**4.2: Add Format Preservation**
```typescript
// When replacing selection, preserve surrounding formatting
export function replaceWithFormatPreservation(
  editor: Editor,
  newContent: string
) {
  const { from, to } = editor.state.selection
  const marks = editor.state.doc.resolve(from).marks()
  
  editor.commands.deleteSelection()
  editor.commands.insertContent(newContent)
  
  // Re-apply original marks if they existed
  if (marks.length > 0) {
    marks.forEach(mark => {
      editor.commands.setMark(mark.type, mark.attrs)
    })
  }
}
```

---

### Phase 5: Document-Type-Specific AI Actions (1-2 hours)

**5.1: Create Action Templates per Doc Type**
```typescript
// constants/aiActionsByDocType.ts
export const AI_ACTIONS_BY_DOC_TYPE: Record<DocType, AICommand[]> = {
  brief: [
    { id: 'generate_positioning', label: 'Generate positioning statement', icon: '🎯' },
    { id: 'suggest_messaging', label: 'Suggest key messages', icon: '💬' },
    { id: 'expand_audience', label: 'Expand target audience section', icon: '👥' },
  ],
  campaign: [
    { id: 'generate_timeline', label: 'Generate campaign timeline', icon: '📅' },
    { id: 'suggest_tactics', label: 'Suggest tactics', icon: '🎪' },
    { id: 'calculate_budget', label: 'Budget breakdown', icon: '💰' },
  ],
  battlecard: [
    { id: 'competitive_analysis', label: 'Analyze competitor', icon: '⚔️' },
    { id: 'objection_handling', label: 'Generate objection responses', icon: '🛡️' },
    { id: 'win_stories', label: 'Structure win story', icon: '🏆' },
  ],
  icp_sheet: [
    { id: 'pain_points', label: 'Suggest pain points', icon: '🎯' },
    { id: 'decision_makers', label: 'Identify decision makers', icon: '👔' },
    { id: 'buying_process', label: 'Map buying process', icon: '🗺️' },
  ],
  // ... other doc types
}
```

**5.2: Dynamic Command Palette**
```typescript
// In AICommandPalette, merge generic + doc-type-specific commands
const allCommands = [
  ...GENERIC_AI_COMMANDS,
  ...(AI_ACTIONS_BY_DOC_TYPE[docType] || [])
]
```

---

### Phase 6: Real-time Data Integration (2 hours)

**6.1: Create Data Insertion Templates**
```typescript
// templates/dataInsertion.ts
export function formatTasksForInsertion(tasks: Task[]): string {
  return `
<h3>Action Items</h3>
<ul>
  ${tasks.map(t => `
    <li>
      <strong>${t.title}</strong> - ${t.status}
      ${t.dueDate ? `<br><em>Due: ${formatDate(t.dueDate)}</em>` : ''}
    </li>
  `).join('')}
</ul>
`
}

export function formatCRMForInsertion(crmItems: CrmItem[]): string {
  return `
<h3>Account Status</h3>
${crmItems.map(c => `
<p>
  <strong>${c.company}</strong><br>
  Status: ${c.status}<br>
  Next Action: ${c.nextAction} (${c.nextActionDate})
</p>
`).join('')}
`
}
```

**6.2: Add Real-time Updates**
```typescript
// Subscribe to changes in linked entities
useEffect(() => {
  if (!docId) return
  
  const subscription = supabase
    .channel(`doc-${docId}-updates`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'gtm_doc_links',
      filter: `doc_id=eq.${docId}`
    }, () => {
      // Refresh workspace context when links change
      refetchWorkspaceContext()
    })
    .subscribe()
  
  return () => {
    subscription.unsubscribe()
  }
}, [docId])
```

---

## UI/UX Design

### Trigger Methods
1. **Keyboard Shortcut:** `Cmd+K` or `Ctrl+K` opens AI command palette
2. **Slash Command:** Type `/ai` or just `/` on empty line
3. **Toolbar Button:** Purple "🤖 AI" button always visible
4. **Bubble Menu:** Appears when text is selected with quick actions
5. **Right-click Context Menu:** "Ask AI" option

### Visual States
- **Generating:** Pulsing purple highlight on target area
- **Inserting:** Smooth fade-in animation
- **Success:** Brief green checkmark overlay
- **Error:** Red border flash with error message

### Formatting
- AI-generated content automatically gets proper formatting
- Headings, lists, bold, italic applied based on doc type conventions
- Preserves existing formatting when replacing text

---

## Testing Strategy

### Unit Tests
- `AICommand` extension registers shortcuts correctly
- `parseAIResponse()` converts markdown to Tiptap HTML
- `buildEmbeddedAIPrompt()` includes all context

### Integration Tests
1. Generate content → verify inserted at cursor
2. Improve selected text → verify replacement
3. Insert task data → verify formatting matches doc type
4. Keyboard shortcut → verify palette opens
5. Real-time updates → verify context refreshes

### E2E Tests
1. Create campaign doc → link task → use AI to insert task timeline → save
2. Create ICP sheet → link CRM → use AI to generate pain points from deal data
3. Create brief → select text → improve with AI → verify formatting preserved
4. Mobile: Trigger AI command palette → verify touch-friendly

---

## Performance Considerations

### Optimization Strategies
1. **Debounce Context Fetching:** Only fetch workspace context when palette opens
2. **Cache AI Responses:** Store recent generations for undo/redo
3. **Lazy Load Commands:** Load doc-type-specific commands on demand
4. **Stream AI Responses:** Show partial content as it generates (future)

### Resource Limits
- Max context size: 10k characters of related docs
- Max linked entities: 50 tasks, 50 CRM items, 20 events
- Rate limiting: 10 AI commands per minute per user

---

## Migration Path

### Phase 1: MVP (Week 1)
- ✅ AI command palette with basic actions (generate, improve, expand)
- ✅ Keyboard shortcut (Cmd+K)
- ✅ Toolbar button
- ✅ Basic workspace context (current doc only)

### Phase 2: Data Integration (Week 2)
- ✅ Fetch linked tasks/CRM/events
- ✅ Insert data commands
- ✅ Real-time context updates

### Phase 3: Polish (Week 3)
- ✅ Bubble menu for selections
- ✅ Doc-type-specific actions
- ✅ Streaming responses
- ✅ Mobile optimization

---

## Success Metrics

### User Engagement
- % of doc editing sessions using AI
- Average AI commands per document
- % of AI-generated content retained

### Quality
- User satisfaction (thumbs up/down on AI suggestions)
- Time saved vs. manual writing
- Format accuracy (% of suggestions requiring manual fixes)

### Technical
- AI response latency < 2s for 95th percentile
- Context fetch time < 500ms
- Zero layout shift during content insertion

---

## Dependencies

### Required
- `@tiptap/extension-bubble-menu` (for quick actions)
- Existing: `@tiptap/react`, `@tiptap/starter-kit`

### Optional
- `@tiptap/extension-collaboration` (future: multi-user AI suggestions)
- `@tiptap/extension-mention` (future: @mention AI for inline help)

---

## Next Actions

1. Remove current separate AI panel from `DocEditor.tsx` ✅
2. Install `@tiptap/extension-bubble-menu`
3. Create `extensions/AICommand.ts`
4. Create `hooks/useAIWorkspaceContext.ts`
5. Create `components/workspace/AICommandPalette.tsx`
6. Create `utils/aiPromptBuilder.ts` and `utils/aiContentParser.ts`
7. Update `DocEditor.tsx` to integrate all pieces
8. Add keyboard shortcut handler
9. Test with real documents
10. Deploy to staging for user testing

---

**Estimated Total Time:** 12-15 hours  
**Priority:** High (core differentiator for GTM Docs)  
**Status:** Ready to implement

**Last Updated:** 2025-11-11
