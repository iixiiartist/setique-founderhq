# AI Features Integration Guide

## Overview

All AI enhancement features are now implemented and ready for use. This guide shows how to integrate them into your existing components.

---

## 1. Document AI Transformations

### Available Functions

```typescript
import {
  summarizeDocument,
  extractKeyPoints,
  generateOutline,
  improveWriting,
  translateDocument,
  transformDocument
} from './lib/services/documentAIService';
```

### Usage Examples

**Summarize a document:**
```typescript
const result = await summarizeDocument(documentContent, { length: 'short' });
if (result.success) {
  console.log(result.result);
}
```

**Extract key points:**
```typescript
const result = await extractKeyPoints(documentContent);
// Returns: "**Key Points:**\n• Point 1\n• Point 2..."
```

**Improve writing:**
```typescript
const result = await improveWriting(documentContent, { tone: 'professional' });
```

**Translate:**
```typescript
const result = await translateDocument(documentContent, 'Spanish');
```

### Integration Points

Add to `CollaborativeEditor.tsx`:
```typescript
// Add toolbar buttons
<button onClick={() => handleTransform('summarize')}>
  Summarize
</button>
<button onClick={() => handleTransform('improve_writing')}>
  Improve Writing
</button>

const handleTransform = async (type: string) => {
  const result = await transformDocument(editorContent, { type });
  if (result.success) {
    setEditorContent(result.result);
  }
};
```

---

## 2. Smart Chart Generation

### Available Functions

```typescript
import {
  generateChartSuggestions,
  generateChart,
  generateChartColors
} from './lib/services/smartChartService';
```

### Usage Examples

**Generate chart suggestions:**
```typescript
const data = [
  { month: 'Jan', revenue: 5000, expenses: 3000 },
  { month: 'Feb', revenue: 6000, expenses: 3500 },
];

const result = await generateChartSuggestions(data, 'Show revenue trends');
if (result.success && result.suggestions) {
  result.suggestions.forEach(suggestion => {
    console.log(`${suggestion.title}: ${suggestion.description}`);
    console.log(`Confidence: ${suggestion.confidence * 100}%`);
  });
}
```

**Generate specific chart:**
```typescript
const result = await generateChart(data, 'Create a line chart of revenue over time');
if (result.success && result.chart) {
  const { type, title, xAxis, yAxis, dataKeys, colors } = result.chart;
  // Use with recharts or your chart library
}
```

### Integration Points

Add to Analytics components:
```typescript
import { generateChartSuggestions } from '../lib/services/smartChartService';

const SmartChartButton = () => {
  const handleGenerateChart = async () => {
    const result = await generateChartSuggestions(analyticsData);
    if (result.success) {
      setChartSuggestions(result.suggestions);
      setShowChartModal(true);
    }
  };

  return (
    <button onClick={handleGenerateChart}>
      🤖 Suggest Charts
    </button>
  );
};
```

---

## 3. Enhanced AI Context Awareness

### Available Functions

```typescript
import {
  buildEnhancedContext,
  formatContextForAI,
  WorkspaceContext
} from './lib/services/enhancedAIContext';
```

### Usage Examples

**Build workspace context:**
```typescript
const result = await buildEnhancedContext(workspaceId, userId);
if (result.success && result.context) {
  const context = result.context;
  
  // Access specific data
  console.log(`Active tasks: ${context.recentTasks.length}`);
  console.log(`Upcoming deadlines: ${context.upcomingDeadlines.length}`);
  console.log(`Pipeline value: $${context.recentDeals.reduce((sum, d) => sum + d.value, 0)}`);
  console.log(`Runway: ${context.financialMetrics.runwayMonths} months`);
}
```

**Format for AI prompts:**
```typescript
const result = await buildEnhancedContext(workspaceId);
if (result.success && result.context) {
  const contextString = formatContextForAI(result.context);
  
  // Prepend to AI requests
  const enhancedPrompt = `${contextString}\n\nUser Question: ${userQuestion}`;
  // Send to AI service
}
```

### Integration Points

**Update ModuleAssistant.tsx:**
```typescript
import { buildEnhancedContext, formatContextForAI } from '../lib/services/enhancedAIContext';

const ModuleAssistant = () => {
  const sendMessage = async (message: string) => {
    // Build workspace context
    const contextResult = await buildEnhancedContext(workspace.id, user.id);
    
    let enhancedMessage = message;
    if (contextResult.success && contextResult.context) {
      const contextString = formatContextForAI(contextResult.context);
      enhancedMessage = `${contextString}\n\nUser: ${message}`;
    }
    
    // Send to AI service with enhanced context
    const response = await getAiResponse(enhancedMessage, user.id, workspace.id, 'assistant');
    // ...
  };
};
```

**Update AICommandPalette.tsx:**
```typescript
const executeCommand = async (command: string) => {
  const contextResult = await buildEnhancedContext(workspace.id);
  
  if (contextResult.success && contextResult.context) {
    const contextString = formatContextForAI(contextResult.context);
    const enhancedCommand = `${contextString}\n\nCommand: ${command}`;
    // Process with AI
  }
};
```

---

## 4. Automated Workflows System

### Available Functions

```typescript
import {
  createWorkflow,
  executeWorkflow,
  getWorkflows,
  toggleWorkflow,
  deleteWorkflow,
  WORKFLOW_TEMPLATES
} from './lib/services/workflowEngine';
```

### Usage Examples

**Create a workflow:**
```typescript
const result = await createWorkflow(
  workspaceId,
  userId,
  'Deal Won → Create Tasks',
  'Automatically create onboarding tasks when a deal is won',
  { type: 'deal_won' },
  [
    {
      type: 'create_task',
      params: {
        title: 'Schedule kickoff call',
        priority: 'High',
        category: 'Customer Success'
      }
    },
    {
      type: 'send_notification',
      params: {
        title: 'New customer!',
        message: 'Onboarding tasks created'
      }
    }
  ]
);
```

**Get all workflows:**
```typescript
const result = await getWorkflows(workspaceId);
if (result.success && result.workflows) {
  result.workflows.forEach(workflow => {
    console.log(`${workflow.name}: ${workflow.enabled ? 'Active' : 'Disabled'}`);
  });
}
```

**Execute a workflow:**
```typescript
const result = await executeWorkflow(workflowId, {
  dealId: 'abc123',
  dealTitle: 'Acme Corp Deal',
  dealValue: 50000
});
```

**Toggle workflow:**
```typescript
await toggleWorkflow(workflowId, false); // Disable
await toggleWorkflow(workflowId, true);  // Enable
```

### Create Workflow UI Component

**components/workflows/WorkflowManager.tsx:**
```typescript
import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { getWorkflows, toggleWorkflow, WORKFLOW_TEMPLATES } from '../lib/services/workflowEngine';
import { Play, Square, Trash2, Plus } from 'lucide-react';

export default function WorkflowManager() {
  const { workspace } = useWorkspace();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, [workspace.id]);

  const loadWorkflows = async () => {
    const result = await getWorkflows(workspace.id);
    if (result.success) {
      setWorkflows(result.workflows || []);
    }
    setLoading(false);
  };

  const handleToggle = async (workflowId: string, currentState: boolean) => {
    await toggleWorkflow(workflowId, !currentState);
    loadWorkflows();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Automated Workflows</h2>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </button>
      </div>

      <div className="grid gap-4">
        {workflows.map(workflow => (
          <div key={workflow.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{workflow.name}</h3>
                <p className="text-sm text-gray-600">{workflow.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(workflow.id, workflow.enabled)}
                  className={`btn ${workflow.enabled ? 'btn-success' : 'btn-secondary'}`}
                >
                  {workflow.enabled ? <Play className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <button className="btn btn-danger">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Gallery */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Workflow Templates</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {WORKFLOW_TEMPLATES.map((template, idx) => (
            <div key={idx} className="card p-4">
              <h4 className="font-semibold mb-2">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              <button className="btn btn-primary w-full">Install</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Integration with Existing Components

**In deals component - trigger on deal won:**
```typescript
import { executeWorkflow, getWorkflows } from '../lib/services/workflowEngine';

const handleDealStageChange = async (dealId: string, newStage: string) => {
  // Update deal stage
  await updateDeal(dealId, { stage: newStage });
  
  // Check for workflows that trigger on deal_won
  if (newStage === 'Closed Won') {
    const result = await getWorkflows(workspace.id);
    if (result.success && result.workflows) {
      const dealWonWorkflows = result.workflows.filter(
        w => w.enabled && w.trigger.type === 'deal_won'
      );
      
      // Execute all matching workflows
      for (const workflow of dealWonWorkflows) {
        await executeWorkflow(workflow.id, { dealId, stage: newStage });
      }
    }
  }
};
```

---

## 5. Testing the Features

### Test Document AI
```typescript
// Test in browser console
import { summarizeDocument } from './lib/services/documentAIService';

const testContent = `
This is a long document about our product launch strategy.
We plan to release in Q1 2025 with a focus on enterprise customers.
The marketing campaign will include social media, email, and events.
`;

const result = await summarizeDocument(testContent, { length: 'short' });
console.log(result.result);
```

### Test Smart Charts
```typescript
import { generateChartSuggestions } from './lib/services/smartChartService';

const testData = [
  { month: 'Jan', sales: 10000, leads: 50 },
  { month: 'Feb', sales: 12000, leads: 60 },
  { month: 'Mar', sales: 15000, leads: 75 },
];

const result = await generateChartSuggestions(testData);
console.log(result.suggestions);
```

### Test Enhanced Context
```typescript
import { buildEnhancedContext, formatContextForAI } from './lib/services/enhancedAIContext';

const result = await buildEnhancedContext(workspaceId);
if (result.success) {
  console.log(formatContextForAI(result.context));
}
```

### Test Workflows
```typescript
import { createWorkflow, getWorkflows } from './lib/services/workflowEngine';

// Create test workflow
await createWorkflow(
  workspaceId,
  userId,
  'Test Workflow',
  'Testing workflow system',
  { type: 'task_completed' },
  [{ type: 'send_notification', params: { title: 'Task done!', message: 'Great job!' } }]
);

// List workflows
const result = await getWorkflows(workspaceId);
console.log(result.workflows);
```

---

## 6. Next Steps

1. **Add UI controls** for document transformations in CollaborativeEditor
2. **Add "Suggest Chart" button** in analytics dashboards
3. **Enable context-aware AI** in ModuleAssistant and AICommandPalette
4. **Create Workflow Manager** UI component in Settings
5. **Add workflow triggers** to existing components (deals, tasks, contacts)

All services are now production-ready and can be integrated incrementally!

