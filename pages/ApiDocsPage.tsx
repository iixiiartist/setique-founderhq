// pages/ApiDocsPage.tsx
// Comprehensive API Documentation page

import React, { useState } from 'react';

// ============================================
// CODE EXAMPLES
// ============================================

const codeExamples = {
  contacts: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/contacts?limit=20" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    get: `curl -X GET "https://founderhq.setique.com/api/v1/contacts/{id}" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/contacts" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "title": "CEO",
    "tags": ["investor", "priority"]
  }'`,
    update: `curl -X PATCH "https://founderhq.setique.com/api/v1/contacts/{id}" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "CTO",
    "tags": ["investor", "priority", "tech"]
  }'`,
    delete: `curl -X DELETE "https://founderhq.setique.com/api/v1/contacts/{id}" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
  },
  tasks: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/tasks?status=pending&limit=20" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/tasks" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Follow up with investor",
    "description": "Send pitch deck and schedule call",
    "priority": "high",
    "due_date": "2025-12-01",
    "tags": ["fundraising"]
  }'`,
  },
  deals: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/deals?stage=negotiation" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/deals" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Series A - Acme Ventures",
    "value": 2000000,
    "currency": "USD",
    "stage": "proposal",
    "probability": 40,
    "expected_close_date": "2025-03-15"
  }'`,
  },
  documents: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/documents?type=note&limit=20" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/documents" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Meeting Notes - Q4 Planning",
    "content": "# Attendees\\n- John\\n- Jane\\n\\n# Action Items\\n1. ...",
    "type": "note",
    "status": "published",
    "tags": ["meetings", "planning"]
  }'`,
  },
  crm: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/crm?type=lead&stage=qualified" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/crm" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Acme Corp",
    "type": "opportunity",
    "stage": "qualified",
    "value": 50000,
    "industry": "Technology",
    "source": "referral"
  }'`,
  },
  financials: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/financials?start_date=2025-01-01&end_date=2025-12-31" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/financials" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "2025-01-15",
    "mrr": 50000,
    "gmv": 120000,
    "new_signups": 45,
    "churned_users": 3,
    "notes": "Strong Q1 start"
  }'`,
  },
  marketing: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/marketing?type=campaign&status=active" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/marketing" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Product Launch Campaign",
    "type": "campaign",
    "status": "planned",
    "campaign_budget": 10000,
    "campaign_channel": "social",
    "start_date": "2025-02-01",
    "due_date": "2025-02-28"
  }'`,
  },
  products: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/products?category=subscription&status=active" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/products" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Enterprise Plan",
    "category": "subscription",
    "type": "product",
    "base_price": 299,
    "currency": "USD",
    "pricing_model": "monthly",
    "status": "active"
  }'`,
  },
  calendar: {
    list: `curl -X GET "https://founderhq.setique.com/api/v1/calendar?start_date=2025-01-01&end_date=2025-01-31" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
    create: `curl -X POST "https://founderhq.setique.com/api/v1/calendar" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Team Standup",
    "event_date": "2025-01-20",
    "event_time": "09:00",
    "end_time": "09:30",
    "recurrence": "weekly",
    "location": "Zoom",
    "attendees": ["john@example.com", "jane@example.com"]
  }'`,
  },
  agents: {
    run: `curl -X POST "https://founderhq.setique.com/api/v1/agents/run" \\
  -H "Authorization: Bearer fhq_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Research the latest trends in AI for startups",
    "context": "We are a B2B SaaS company in the productivity space",
    "include_sources": true
  }'`,
    history: `curl -X GET "https://founderhq.setique.com/api/v1/agents/history?limit=10" \\
  -H "Authorization: Bearer fhq_live_your_api_key"`,
  },
};

// ============================================
// TYPES
// ============================================

type EndpointCategory = 'contacts' | 'tasks' | 'deals' | 'documents' | 'crm' | 'financials' | 'marketing' | 'products' | 'calendar' | 'agents';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  scopes: string[];
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
}

// ============================================
// ENDPOINT DEFINITIONS
// ============================================

const endpoints: Record<EndpointCategory, { title: string; description: string; endpoints: Endpoint[] }> = {
  contacts: {
    title: 'Contacts',
    description: 'Manage your contacts and relationships',
    endpoints: [
      {
        method: 'GET',
        path: '/contacts',
        description: 'List all contacts with pagination and filtering',
        scopes: ['contacts:read'],
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Max results (default: 50, max: 100)' },
          { name: 'offset', type: 'number', required: false, description: 'Skip results for pagination' },
          { name: 'search', type: 'string', required: false, description: 'Search by name or email' },
          { name: 'tags', type: 'string', required: false, description: 'Filter by tags (comma-separated)' },
          { name: 'crm_item_id', type: 'uuid', required: false, description: 'Filter by CRM item' },
        ],
      },
      {
        method: 'GET',
        path: '/contacts/:id',
        description: 'Get a single contact by ID',
        scopes: ['contacts:read'],
      },
      {
        method: 'POST',
        path: '/contacts',
        description: 'Create a new contact',
        scopes: ['contacts:write'],
        body: [
          { name: 'name', type: 'string', required: true, description: 'Contact name' },
          { name: 'email', type: 'string', required: false, description: 'Email address' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number' },
          { name: 'title', type: 'string', required: false, description: 'Job title' },
          { name: 'linkedin', type: 'string', required: false, description: 'LinkedIn URL' },
          { name: 'tags', type: 'string[]', required: false, description: 'Array of tags' },
        ],
      },
      {
        method: 'PATCH',
        path: '/contacts/:id',
        description: 'Update an existing contact',
        scopes: ['contacts:write'],
      },
      {
        method: 'DELETE',
        path: '/contacts/:id',
        description: 'Delete a contact',
        scopes: ['contacts:write'],
      },
    ],
  },
  tasks: {
    title: 'Tasks',
    description: 'Manage tasks and to-dos',
    endpoints: [
      {
        method: 'GET',
        path: '/tasks',
        description: 'List all tasks with filtering options',
        scopes: ['tasks:read'],
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Max results (default: 50)' },
          { name: 'offset', type: 'number', required: false, description: 'Skip results for pagination' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, completed, cancelled)' },
          { name: 'priority', type: 'string', required: false, description: 'Filter by priority (low, medium, high, urgent)' },
          { name: 'due_before', type: 'date', required: false, description: 'Tasks due before this date' },
          { name: 'due_after', type: 'date', required: false, description: 'Tasks due after this date' },
        ],
      },
      {
        method: 'GET',
        path: '/tasks/:id',
        description: 'Get a single task by ID',
        scopes: ['tasks:read'],
      },
      {
        method: 'POST',
        path: '/tasks',
        description: 'Create a new task',
        scopes: ['tasks:write'],
        body: [
          { name: 'title', type: 'string', required: true, description: 'Task title' },
          { name: 'description', type: 'string', required: false, description: 'Task description' },
          { name: 'priority', type: 'string', required: false, description: 'Priority level' },
          { name: 'due_date', type: 'date', required: false, description: 'Due date (ISO 8601)' },
          { name: 'tags', type: 'string[]', required: false, description: 'Array of tags' },
        ],
      },
      {
        method: 'PATCH',
        path: '/tasks/:id',
        description: 'Update an existing task',
        scopes: ['tasks:write'],
      },
      {
        method: 'DELETE',
        path: '/tasks/:id',
        description: 'Delete a task',
        scopes: ['tasks:write'],
      },
    ],
  },
  deals: {
    title: 'Deals',
    description: 'Track deals and fundraising opportunities',
    endpoints: [
      {
        method: 'GET',
        path: '/deals',
        description: 'List all deals with filtering',
        scopes: ['deals:read'],
        params: [
          { name: 'stage', type: 'string', required: false, description: 'Filter by stage' },
          { name: 'min_value', type: 'number', required: false, description: 'Minimum deal value' },
          { name: 'max_value', type: 'number', required: false, description: 'Maximum deal value' },
        ],
      },
      {
        method: 'POST',
        path: '/deals',
        description: 'Create a new deal',
        scopes: ['deals:write'],
        body: [
          { name: 'title', type: 'string', required: true, description: 'Deal title' },
          { name: 'value', type: 'number', required: false, description: 'Deal value' },
          { name: 'currency', type: 'string', required: false, description: 'Currency code (default: USD)' },
          { name: 'stage', type: 'string', required: false, description: 'Deal stage' },
          { name: 'probability', type: 'number', required: false, description: 'Win probability (0-100)' },
        ],
      },
    ],
  },
  documents: {
    title: 'Documents',
    description: 'Manage notes, memos, and documents',
    endpoints: [
      {
        method: 'GET',
        path: '/documents',
        description: 'List documents (excludes content for performance)',
        scopes: ['documents:read'],
        params: [
          { name: 'type', type: 'string', required: false, description: 'Filter by type (note, memo, report, template)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (draft, published, archived)' },
          { name: 'folder', type: 'string', required: false, description: 'Filter by folder' },
          { name: 'search', type: 'string', required: false, description: 'Search by title' },
        ],
      },
      {
        method: 'GET',
        path: '/documents/:id',
        description: 'Get a single document with full content',
        scopes: ['documents:read'],
      },
      {
        method: 'POST',
        path: '/documents',
        description: 'Create a new document',
        scopes: ['documents:write'],
        body: [
          { name: 'title', type: 'string', required: true, description: 'Document title' },
          { name: 'content', type: 'string', required: false, description: 'Document content (Markdown supported)' },
          { name: 'type', type: 'string', required: false, description: 'Document type' },
          { name: 'status', type: 'string', required: false, description: 'Publication status' },
          { name: 'tags', type: 'string[]', required: false, description: 'Array of tags' },
        ],
      },
      {
        method: 'PATCH',
        path: '/documents/:id',
        description: 'Update a document',
        scopes: ['documents:write'],
      },
      {
        method: 'DELETE',
        path: '/documents/:id',
        description: 'Delete a document',
        scopes: ['documents:write'],
      },
    ],
  },
  crm: {
    title: 'CRM / Pipeline',
    description: 'Manage CRM items (leads, opportunities, customers)',
    endpoints: [
      {
        method: 'GET',
        path: '/crm',
        description: 'List CRM items with filtering',
        scopes: ['crm:read'],
        params: [
          { name: 'type', type: 'string', required: false, description: 'Filter by type (lead, opportunity, customer, partner, investor)' },
          { name: 'stage', type: 'string', required: false, description: 'Filter by stage (new, contacted, qualified, proposal, negotiation, won, lost)' },
          { name: 'min_value', type: 'number', required: false, description: 'Minimum value' },
          { name: 'max_value', type: 'number', required: false, description: 'Maximum value' },
        ],
      },
      {
        method: 'GET',
        path: '/crm/:id',
        description: 'Get CRM item with associated contacts and task count',
        scopes: ['crm:read'],
      },
      {
        method: 'POST',
        path: '/crm',
        description: 'Create a new CRM item',
        scopes: ['crm:write'],
        body: [
          { name: 'name', type: 'string', required: true, description: 'Item name' },
          { name: 'type', type: 'string', required: false, description: 'Item type' },
          { name: 'stage', type: 'string', required: false, description: 'Pipeline stage' },
          { name: 'value', type: 'number', required: false, description: 'Estimated value' },
          { name: 'industry', type: 'string', required: false, description: 'Industry' },
          { name: 'source', type: 'string', required: false, description: 'Lead source' },
        ],
      },
      {
        method: 'PATCH',
        path: '/crm/:id',
        description: 'Update a CRM item (triggers webhook on stage change)',
        scopes: ['crm:write'],
      },
      {
        method: 'DELETE',
        path: '/crm/:id',
        description: 'Delete a CRM item (cascades to contacts)',
        scopes: ['crm:write'],
      },
    ],
  },
  financials: {
    title: 'Financials',
    description: 'Track financial metrics and logs',
    endpoints: [
      {
        method: 'GET',
        path: '/financials',
        description: 'List financial logs with date filtering',
        scopes: ['financials:read'],
        params: [
          { name: 'start_date', type: 'date', required: true, description: 'Start date (ISO 8601)' },
          { name: 'end_date', type: 'date', required: true, description: 'End date (ISO 8601)' },
          { name: 'limit', type: 'number', required: false, description: 'Max results (default: 50)' },
          { name: 'offset', type: 'number', required: false, description: 'Skip results for pagination' },
        ],
      },
      {
        method: 'GET',
        path: '/financials/summary',
        description: 'Get aggregated financial summary for a date range',
        scopes: ['financials:read'],
        params: [
          { name: 'start_date', type: 'date', required: true, description: 'Start date (ISO 8601)' },
          { name: 'end_date', type: 'date', required: true, description: 'End date (ISO 8601)' },
        ],
      },
      {
        method: 'POST',
        path: '/financials',
        description: 'Create a new financial log entry',
        scopes: ['financials:write'],
        body: [
          { name: 'date', type: 'date', required: true, description: 'Log date (ISO 8601)' },
          { name: 'mrr', type: 'number', required: false, description: 'Monthly recurring revenue' },
          { name: 'gmv', type: 'number', required: false, description: 'Gross merchandise value' },
          { name: 'new_signups', type: 'number', required: false, description: 'New user signups' },
          { name: 'churned_users', type: 'number', required: false, description: 'Churned users count' },
          { name: 'notes', type: 'string', required: false, description: 'Notes or comments' },
        ],
      },
      {
        method: 'PATCH',
        path: '/financials/:id',
        description: 'Update a financial log entry',
        scopes: ['financials:write'],
      },
      {
        method: 'DELETE',
        path: '/financials/:id',
        description: 'Delete a financial log entry',
        scopes: ['financials:write'],
      },
    ],
  },
  marketing: {
    title: 'Marketing',
    description: 'Manage marketing items and campaigns',
    endpoints: [
      {
        method: 'GET',
        path: '/marketing',
        description: 'List marketing items with filtering',
        scopes: ['marketing:read'],
        params: [
          { name: 'type', type: 'string', required: false, description: 'Filter by type (task, campaign, content, event)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (planned, active, completed, cancelled)' },
          { name: 'channel', type: 'string', required: false, description: 'Filter by campaign channel' },
          { name: 'limit', type: 'number', required: false, description: 'Max results (default: 50)' },
        ],
      },
      {
        method: 'POST',
        path: '/marketing',
        description: 'Create a new marketing item',
        scopes: ['marketing:write'],
        body: [
          { name: 'title', type: 'string', required: true, description: 'Item title' },
          { name: 'type', type: 'string', required: false, description: 'Item type' },
          { name: 'status', type: 'string', required: false, description: 'Status' },
          { name: 'campaign_budget', type: 'number', required: false, description: 'Campaign budget' },
          { name: 'campaign_channel', type: 'string', required: false, description: 'Campaign channel (email, social, paid, etc.)' },
          { name: 'due_date', type: 'date', required: false, description: 'Due date' },
        ],
      },
      {
        method: 'PATCH',
        path: '/marketing/:id',
        description: 'Update a marketing item',
        scopes: ['marketing:write'],
      },
      {
        method: 'DELETE',
        path: '/marketing/:id',
        description: 'Delete a marketing item',
        scopes: ['marketing:write'],
      },
    ],
  },
  products: {
    title: 'Products & Services',
    description: 'Manage products, services, and inventory',
    endpoints: [
      {
        method: 'GET',
        path: '/products',
        description: 'List products and services with filtering',
        scopes: ['products:read'],
        params: [
          { name: 'category', type: 'string', required: false, description: 'Filter by category (physical, digital, subscription, service)' },
          { name: 'type', type: 'string', required: false, description: 'Filter by type (product, service)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (active, inactive, discontinued)' },
          { name: 'search', type: 'string', required: false, description: 'Search by name or SKU' },
        ],
      },
      {
        method: 'POST',
        path: '/products',
        description: 'Create a new product or service',
        scopes: ['products:write'],
        body: [
          { name: 'name', type: 'string', required: true, description: 'Product name' },
          { name: 'category', type: 'string', required: false, description: 'Product category' },
          { name: 'type', type: 'string', required: false, description: 'Product or service' },
          { name: 'base_price', type: 'number', required: false, description: 'Base price' },
          { name: 'currency', type: 'string', required: false, description: 'Currency code (default: USD)' },
          { name: 'pricing_model', type: 'string', required: false, description: 'Pricing model (one-time, monthly, yearly, hourly)' },
          { name: 'inventory_quantity', type: 'number', required: false, description: 'Current inventory quantity' },
        ],
      },
      {
        method: 'PATCH',
        path: '/products/:id',
        description: 'Update a product or service',
        scopes: ['products:write'],
      },
      {
        method: 'DELETE',
        path: '/products/:id',
        description: 'Delete a product or service',
        scopes: ['products:write'],
      },
    ],
  },
  calendar: {
    title: 'Calendar',
    description: 'Manage calendar events and view aggregated schedule',
    endpoints: [
      {
        method: 'GET',
        path: '/calendar',
        description: 'List calendar events (aggregates tasks, marketing, CRM, and custom events)',
        scopes: ['calendar:read'],
        params: [
          { name: 'start_date', type: 'date', required: true, description: 'Start date (ISO 8601)' },
          { name: 'end_date', type: 'date', required: true, description: 'End date (ISO 8601)' },
          { name: 'types', type: 'string', required: false, description: 'Filter by types (comma-separated: task,marketing,meeting,crm-action,custom)' },
          { name: 'limit', type: 'number', required: false, description: 'Max results (default: 100)' },
        ],
      },
      {
        method: 'GET',
        path: '/calendar/:id',
        description: 'Get a single calendar event with source data',
        scopes: ['calendar:read'],
      },
      {
        method: 'POST',
        path: '/calendar',
        description: 'Create a custom calendar event',
        scopes: ['calendar:write'],
        body: [
          { name: 'title', type: 'string', required: true, description: 'Event title' },
          { name: 'event_date', type: 'date', required: true, description: 'Event date (ISO 8601)' },
          { name: 'event_time', type: 'time', required: false, description: 'Event start time' },
          { name: 'end_time', type: 'time', required: false, description: 'Event end time' },
          { name: 'all_day', type: 'boolean', required: false, description: 'All-day event flag' },
          { name: 'location', type: 'string', required: false, description: 'Event location' },
          { name: 'recurrence', type: 'string', required: false, description: 'Recurrence pattern (daily, weekly, monthly)' },
          { name: 'attendees', type: 'string[]', required: false, description: 'List of attendee emails' },
        ],
      },
      {
        method: 'PATCH',
        path: '/calendar/:id',
        description: 'Update a calendar event',
        scopes: ['calendar:write'],
      },
      {
        method: 'DELETE',
        path: '/calendar/:id',
        description: 'Delete a custom calendar event (cannot delete virtual events)',
        scopes: ['calendar:write'],
      },
    ],
  },
  agents: {
    title: 'AI Agents',
    description: 'Run AI-powered research and analysis',
    endpoints: [
      {
        method: 'POST',
        path: '/agents/run',
        description: 'Run an AI agent query',
        scopes: ['agents:run'],
        body: [
          { name: 'query', type: 'string', required: true, description: 'The question or task for the agent' },
          { name: 'context', type: 'string', required: false, description: 'Additional context for the query' },
          { name: 'agent_id', type: 'string', required: false, description: 'Specific agent to use (optional)' },
          { name: 'include_sources', type: 'boolean', required: false, description: 'Include source URLs (default: true)' },
        ],
      },
      {
        method: 'GET',
        path: '/agents/history',
        description: 'Get history of agent runs',
        scopes: ['agents:run'],
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Max results (default: 20)' },
          { name: 'offset', type: 'number', required: false, description: 'Skip results for pagination' },
        ],
      },
    ],
  },
};

// ============================================
// COMPONENTS
// ============================================

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800 border-green-300',
    POST: 'bg-blue-100 text-blue-800 border-blue-300',
    PATCH: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    DELETE: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-bold border ${colors[method] || 'bg-gray-100'}`}>
      {method}
    </span>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto font-mono border-2 border-gray-700">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
};

const EndpointCard: React.FC<{ endpoint: Endpoint; category: EndpointCategory }> = ({ endpoint, category }) => {
  const [expanded, setExpanded] = useState(false);
  const exampleKey = endpoint.method === 'GET' && !endpoint.path.includes(':id') 
    ? 'list' 
    : endpoint.method === 'GET' 
    ? 'get' 
    : endpoint.method.toLowerCase();
  
  const example = (codeExamples[category] as Record<string, string>)?.[exampleKey];

  return (
    <div className="border-2 border-gray-200 hover:border-gray-400 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <MethodBadge method={endpoint.method} />
          <span className="font-mono text-sm">{endpoint.path}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{endpoint.scopes.join(', ')}</span>
          <span className="text-gray-400">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mt-3 mb-4">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Query Parameters</h5>
              <div className="space-y-1">
                {endpoint.params.map(param => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="bg-gray-100 px-1 text-gray-800">{param.name}</code>
                    <span className="text-gray-400">({param.type})</span>
                    {param.required && <span className="text-red-500 text-xs">required</span>}
                    <span className="text-gray-600">— {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.body && endpoint.body.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Request Body</h5>
              <div className="space-y-1">
                {endpoint.body.map(field => (
                  <div key={field.name} className="flex items-start gap-2 text-sm">
                    <code className="bg-gray-100 px-1 text-gray-800">{field.name}</code>
                    <span className="text-gray-400">({field.type})</span>
                    {field.required && <span className="text-red-500 text-xs">required</span>}
                    <span className="text-gray-600">— {field.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {example && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Example</h5>
              <CodeBlock code={example} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN PAGE
// ============================================

export const ApiDocsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<EndpointCategory>('contacts');
  const baseUrl = 'https://founderhq.setique.com/api/v1';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold font-mono">API Documentation</h1>
          <p className="text-gray-600 mt-2">
            Build powerful integrations with the FounderHQ API
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Quick Start */}
              <div className="p-4 bg-blue-50 border-2 border-blue-300">
                <h3 className="font-bold text-blue-800 mb-2">🚀 Quick Start</h3>
                <ol className="text-sm text-blue-700 space-y-2">
                  <li>1. <a href="/settings?tab=api" className="underline">Create an API key</a></li>
                  <li>2. Add balance to your account</li>
                  <li>3. Start making API calls</li>
                </ol>
              </div>

              {/* Navigation */}
              <div>
                <h3 className="font-bold mb-3">Endpoints</h3>
                <nav className="space-y-1">
                  {(Object.keys(endpoints) as EndpointCategory[]).map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        activeCategory === category
                          ? 'bg-black text-white font-bold'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {endpoints[category].title}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Pricing */}
              <div className="p-4 bg-green-50 border-2 border-green-300">
                <h3 className="font-bold text-green-800 mb-2">💰 Pricing</h3>
                <p className="text-sm text-green-700">
                  <strong>$0.001</strong> per API call
                </p>
                <p className="text-xs text-green-600 mt-1">
                  1,000 calls = $1
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Authentication */}
            <section>
              <h2 className="text-2xl font-bold font-mono mb-4">Authentication</h2>
              <p className="text-gray-600 mb-4">
                All API requests require authentication using a Bearer token. Include your API key in the Authorization header:
              </p>
              <CodeBlock code={`Authorization: Bearer fhq_live_your_api_key_here`} />
              <p className="text-sm text-gray-500 mt-2">
                Generate API keys in <a href="/settings?tab=api" className="underline">Settings → Developer API</a>
              </p>
            </section>

            {/* Base URL */}
            <section>
              <h2 className="text-2xl font-bold font-mono mb-4">Base URL</h2>
              <CodeBlock code={baseUrl} />
            </section>

            {/* Rate Limits */}
            <section>
              <h2 className="text-2xl font-bold font-mono mb-4">Rate Limits</h2>
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2">Tier</th>
                      <th className="pb-2">Requests/Minute</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Standard</td>
                      <td>100</td>
                    </tr>
                    <tr>
                      <td>Elevated</td>
                      <td>500</td>
                    </tr>
                    <tr>
                      <td>Unlimited</td>
                      <td>10,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Errors */}
            <section>
              <h2 className="text-2xl font-bold font-mono mb-4">Error Responses</h2>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4 p-2 bg-gray-50">
                  <code className="text-red-600">400</code>
                  <span>Bad Request - Invalid parameters</span>
                </div>
                <div className="flex gap-4 p-2 bg-gray-50">
                  <code className="text-red-600">401</code>
                  <span>Unauthorized - Missing or invalid API key</span>
                </div>
                <div className="flex gap-4 p-2 bg-gray-50">
                  <code className="text-red-600">402</code>
                  <span>Payment Required - Insufficient balance</span>
                </div>
                <div className="flex gap-4 p-2 bg-gray-50">
                  <code className="text-red-600">403</code>
                  <span>Forbidden - Missing required scope</span>
                </div>
                <div className="flex gap-4 p-2 bg-gray-50">
                  <code className="text-red-600">404</code>
                  <span>Not Found - Resource doesn't exist</span>
                </div>
                <div className="flex gap-4 p-2 bg-gray-50">
                  <code className="text-red-600">429</code>
                  <span>Too Many Requests - Rate limit exceeded</span>
                </div>
              </div>
            </section>

            {/* Active Category Endpoints */}
            <section>
              <h2 className="text-2xl font-bold font-mono mb-2">
                {endpoints[activeCategory].title}
              </h2>
              <p className="text-gray-600 mb-4">
                {endpoints[activeCategory].description}
              </p>
              <div className="space-y-3">
                {endpoints[activeCategory].endpoints.map((endpoint, idx) => (
                  <EndpointCard key={idx} endpoint={endpoint} category={activeCategory} />
                ))}
              </div>
            </section>

            {/* Webhooks Section */}
            <section>
              <h2 className="text-2xl font-bold font-mono mb-4">Webhooks</h2>
              <p className="text-gray-600 mb-4">
                Receive real-time notifications when data changes. Configure webhooks in{' '}
                <a href="/settings?tab=webhooks" className="underline">Settings → Webhooks</a>.
              </p>
              <div className="p-4 bg-gray-50 border-2 border-gray-300">
                <h4 className="font-bold mb-3">Available Events</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Contacts</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>contact.created</div>
                      <div>contact.updated</div>
                      <div>contact.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Tasks</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>task.created</div>
                      <div>task.updated</div>
                      <div>task.completed</div>
                      <div>task.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Deals</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>deal.created</div>
                      <div>deal.updated</div>
                      <div>deal.stage_changed</div>
                      <div>deal.won</div>
                      <div>deal.lost</div>
                      <div>deal.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Documents</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>document.created</div>
                      <div>document.updated</div>
                      <div>document.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">CRM Items</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>crm.created</div>
                      <div>crm.updated</div>
                      <div>crm.stage_changed</div>
                      <div>crm.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Financials</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>financial.created</div>
                      <div>financial.updated</div>
                      <div>financial.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Marketing</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>marketing.created</div>
                      <div>marketing.updated</div>
                      <div>marketing.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Products</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>product.created</div>
                      <div>product.updated</div>
                      <div>product.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">Calendar</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>calendar.created</div>
                      <div>calendar.updated</div>
                      <div>calendar.deleted</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 mb-1">AI Agents</div>
                    <div className="font-mono text-gray-600 space-y-0.5">
                      <div>agent.run_completed</div>
                      <div>agent.run_failed</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocsPage;
