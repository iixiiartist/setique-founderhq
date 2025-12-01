/**
 * Centralized CSV Schema Definitions
 * 
 * Single source of truth for CSV import/export schemas across all entity types.
 * This eliminates duplicate schema definitions in ContactManager, AccountManager, etc.
 * 
 * Each schema defines:
 * - fields: ordered list of fields for export
 * - headerNames: display names for CSV headers  
 * - requiredFields: fields required for import validation
 * - exampleRow: sample data for template generation
 * - fieldParsers: custom parsing functions for import
 * - fieldFormatters: custom formatting functions for export
 */

import { Contact, AnyCrmItem, Task, Deal, ProductService, MarketingItem } from '../../types';

export interface CSVFieldDefinition {
  /** Field name in the data object */
  field: string;
  /** Display name for CSV header */
  header: string;
  /** Whether field is required for import */
  required?: boolean;
  /** Example value for template */
  example?: string;
  /** Custom parser for import (string -> typed value) */
  parse?: (value: string) => any;
  /** Custom formatter for export (typed value -> string) */
  format?: (value: any, item: any) => string;
}

export interface CSVSchema {
  /** Entity type name */
  entityType: string;
  /** Ordered list of field definitions */
  fields: CSVFieldDefinition[];
  /** Validate a parsed row, return error message or null */
  validate?: (row: Record<string, any>) => string | null;
}

// ============================================================================
// Contact Schema
// ============================================================================

export const CONTACT_CSV_SCHEMA: CSVSchema = {
  entityType: 'contacts',
  fields: [
    {
      field: 'name',
      header: 'Name',
      required: true,
      example: 'John Doe',
    },
    {
      field: 'email',
      header: 'Email',
      required: true,
      example: 'john@example.com',
      parse: (v) => v.toLowerCase().trim(),
    },
    {
      field: 'phone',
      header: 'Phone',
      example: '555-1234',
      parse: (v) => v.replace(/[^\d+\-\s()]/g, '').trim(),
    },
    {
      field: 'title',
      header: 'Title',
      example: 'CEO',
    },
    {
      field: 'company',
      header: 'Company',
      example: 'Acme Corp',
    },
    {
      field: 'linkedin',
      header: 'LinkedIn',
      example: 'https://linkedin.com/in/johndoe',
    },
    {
      field: 'tags',
      header: 'Tags',
      example: 'vip; tech',
      parse: (v) => v ? v.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      format: (v) => Array.isArray(v) ? v.join('; ') : '',
    },
  ],
  validate: (row) => {
    if (!row.name?.trim()) return 'Name is required';
    if (!row.email?.trim()) return 'Email is required';
    if (row.email && !row.email.includes('@')) return 'Invalid email format';
    return null;
  },
};

// ============================================================================
// Account Schema
// ============================================================================

export const ACCOUNT_CSV_SCHEMA: CSVSchema = {
  entityType: 'accounts',
  fields: [
    {
      field: 'company',
      header: 'Company',
      required: true,
      example: 'Acme Corp',
    },
    {
      field: 'status',
      header: 'Status',
      example: 'Active',
    },
    {
      field: 'priority',
      header: 'Priority',
      example: 'High',
      parse: (v) => {
        const normalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
        return ['High', 'Medium', 'Low'].includes(normalized) ? normalized : 'Medium';
      },
    },
    {
      field: 'contacts',
      header: 'Contacts',
      format: (v, item) => (item.contacts || []).map((c: Contact) => c.name).join('; '),
    },
    {
      field: 'nextAction',
      header: 'Next Action',
      example: 'Schedule follow-up call',
    },
    {
      field: 'nextActionDate',
      header: 'Next Action Date',
      example: '2024-01-15',
      parse: (v) => {
        if (!v) return undefined;
        const date = new Date(v);
        return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
      },
    },
    {
      field: 'website',
      header: 'Website',
      example: 'https://example.com',
    },
    {
      field: 'industry',
      header: 'Industry',
      example: 'Technology',
    },
    {
      field: 'description',
      header: 'Description',
      example: 'Enterprise software company',
    },
    {
      field: 'tags',
      header: 'Tags',
      example: 'enterprise; tech',
      parse: (v) => v ? v.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      format: (v) => Array.isArray(v) ? v.join('; ') : '',
    },
  ],
  validate: (row) => {
    if (!row.company?.trim()) return 'Company name is required';
    return null;
  },
};

// ============================================================================
// Investor-specific fields (extends Account)
// ============================================================================

export const INVESTOR_CSV_SCHEMA: CSVSchema = {
  entityType: 'investors',
  fields: [
    ...ACCOUNT_CSV_SCHEMA.fields,
    {
      field: 'checkSize',
      header: 'Check Size',
      example: '500000',
      parse: (v) => v ? parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 : undefined,
      format: (v) => v ? `$${v.toLocaleString()}` : '',
    },
    {
      field: 'stage',
      header: 'Stage',
      example: 'Series A',
    },
  ],
  validate: ACCOUNT_CSV_SCHEMA.validate,
};

// ============================================================================
// Customer-specific fields (extends Account)
// ============================================================================

export const CUSTOMER_CSV_SCHEMA: CSVSchema = {
  entityType: 'customers',
  fields: [
    ...ACCOUNT_CSV_SCHEMA.fields,
    {
      field: 'dealValue',
      header: 'Deal Value',
      example: '100000',
      parse: (v) => v ? parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 : undefined,
      format: (v) => v ? `$${v.toLocaleString()}` : '',
    },
    {
      field: 'dealStage',
      header: 'Deal Stage',
      example: 'Proposal',
    },
  ],
  validate: ACCOUNT_CSV_SCHEMA.validate,
};

// ============================================================================
// Partner-specific fields (extends Account)
// ============================================================================

export const PARTNER_CSV_SCHEMA: CSVSchema = {
  entityType: 'partners',
  fields: [
    ...ACCOUNT_CSV_SCHEMA.fields,
    {
      field: 'opportunity',
      header: 'Opportunity',
      example: 'Joint marketing campaign',
    },
    {
      field: 'partnerType',
      header: 'Partner Type',
      example: 'Technology',
    },
  ],
  validate: ACCOUNT_CSV_SCHEMA.validate,
};

// ============================================================================
// Task Schema
// ============================================================================

export const TASK_CSV_SCHEMA: CSVSchema = {
  entityType: 'tasks',
  fields: [
    {
      field: 'text',
      header: 'Task',
      required: true,
      example: 'Follow up with client',
    },
    {
      field: 'status',
      header: 'Status',
      example: 'Todo',
      parse: (v) => {
        const normalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
        return ['Todo', 'InProgress', 'Done'].includes(normalized) ? normalized : 'Todo';
      },
    },
    {
      field: 'priority',
      header: 'Priority',
      example: 'High',
      parse: (v) => {
        const normalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
        return ['High', 'Medium', 'Low'].includes(normalized) ? normalized : 'Medium';
      },
    },
    {
      field: 'dueDate',
      header: 'Due Date',
      example: '2024-01-15',
      parse: (v) => {
        if (!v) return undefined;
        const date = new Date(v);
        return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
      },
    },
    {
      field: 'dueTime',
      header: 'Due Time',
      example: '14:00',
    },
    {
      field: 'category',
      header: 'Category',
      example: 'customerTasks',
    },
    {
      field: 'assignedToName',
      header: 'Assigned To',
      format: (v, item) => item.assignedToName || '',
    },
  ],
  validate: (row) => {
    if (!row.text?.trim()) return 'Task description is required';
    return null;
  },
};

// ============================================================================
// Deal Schema
// ============================================================================

export const DEAL_CSV_SCHEMA: CSVSchema = {
  entityType: 'deals',
  fields: [
    {
      field: 'name',
      header: 'Deal Name',
      required: true,
      example: 'Enterprise License Deal',
    },
    {
      field: 'value',
      header: 'Value',
      example: '50000',
      parse: (v) => v ? parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 : 0,
      format: (v) => v ? `$${v.toLocaleString()}` : '$0',
    },
    {
      field: 'stage',
      header: 'Stage',
      example: 'Negotiation',
    },
    {
      field: 'probability',
      header: 'Probability',
      example: '75',
      parse: (v) => v ? Math.min(100, Math.max(0, parseInt(v, 10) || 0)) : 0,
      format: (v) => `${v || 0}%`,
    },
    {
      field: 'expectedCloseDate',
      header: 'Expected Close',
      example: '2024-03-15',
      parse: (v) => {
        if (!v) return undefined;
        const date = new Date(v);
        return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
      },
    },
    {
      field: 'accountName',
      header: 'Account',
      example: 'Acme Corp',
    },
    {
      field: 'contactName',
      header: 'Contact',
      example: 'John Doe',
    },
  ],
  validate: (row) => {
    if (!row.name?.trim()) return 'Deal name is required';
    return null;
  },
};

// ============================================================================
// Marketing Item Schema
// ============================================================================

export const MARKETING_CSV_SCHEMA: CSVSchema = {
  entityType: 'marketing',
  fields: [
    {
      field: 'title',
      header: 'Title',
      required: true,
      example: 'Q1 Campaign',
    },
    {
      field: 'type',
      header: 'Type',
      example: 'campaign',
    },
    {
      field: 'status',
      header: 'Status',
      example: 'Active',
    },
    {
      field: 'channel',
      header: 'Channel',
      example: 'Social Media',
    },
    {
      field: 'budget',
      header: 'Budget',
      example: '5000',
      parse: (v) => v ? parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 : 0,
      format: (v) => v ? `$${v.toLocaleString()}` : '',
    },
    {
      field: 'startDate',
      header: 'Start Date',
      example: '2024-01-01',
    },
    {
      field: 'endDate',
      header: 'End Date',
      example: '2024-03-31',
    },
  ],
  validate: (row) => {
    if (!row.title?.trim()) return 'Title is required';
    return null;
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get schema by entity type
 */
export function getCSVSchema(entityType: string): CSVSchema | undefined {
  const schemas: Record<string, CSVSchema> = {
    contacts: CONTACT_CSV_SCHEMA,
    accounts: ACCOUNT_CSV_SCHEMA,
    investors: INVESTOR_CSV_SCHEMA,
    customers: CUSTOMER_CSV_SCHEMA,
    partners: PARTNER_CSV_SCHEMA,
    tasks: TASK_CSV_SCHEMA,
    deals: DEAL_CSV_SCHEMA,
    marketing: MARKETING_CSV_SCHEMA,
  };
  return schemas[entityType.toLowerCase()];
}

/**
 * Get required fields from a schema
 */
export function getRequiredFields(schema: CSVSchema): string[] {
  return schema.fields
    .filter(f => f.required)
    .map(f => f.field);
}

/**
 * Get field headers for export
 */
export function getExportHeaders(schema: CSVSchema): string[] {
  return schema.fields.map(f => f.header);
}

/**
 * Get field names for export
 */
export function getExportFields(schema: CSVSchema): string[] {
  return schema.fields.map(f => f.field);
}

/**
 * Generate a CSV template string from schema
 */
export function generateTemplateFromSchema(schema: CSVSchema): string {
  const headers = schema.fields.map(f => f.header);
  const example = schema.fields.map(f => f.example || '');
  return [headers.join(','), example.join(',')].join('\n');
}

/**
 * Parse a row using schema field parsers
 */
export function parseRowWithSchema(
  row: Record<string, string>,
  schema: CSVSchema
): Record<string, any> {
  const parsed: Record<string, any> = {};
  
  for (const field of schema.fields) {
    const headerLower = field.header.toLowerCase();
    const fieldLower = field.field.toLowerCase();
    
    // Try to find value by header name or field name
    let value = row[headerLower] ?? row[fieldLower] ?? row[field.header] ?? row[field.field];
    
    if (value !== undefined && value !== '') {
      parsed[field.field] = field.parse ? field.parse(value) : value.trim();
    }
  }
  
  return parsed;
}

/**
 * Format an item for CSV export using schema formatters
 */
export function formatItemForExport<T extends Record<string, any>>(
  item: T,
  schema: CSVSchema
): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const field of schema.fields) {
    const value = item[field.field];
    formatted[field.field] = field.format 
      ? field.format(value, item)
      : formatValue(value);
  }
  
  return formatted;
}

/**
 * Default value formatter
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default {
  CONTACT_CSV_SCHEMA,
  ACCOUNT_CSV_SCHEMA,
  INVESTOR_CSV_SCHEMA,
  CUSTOMER_CSV_SCHEMA,
  PARTNER_CSV_SCHEMA,
  TASK_CSV_SCHEMA,
  DEAL_CSV_SCHEMA,
  MARKETING_CSV_SCHEMA,
  getCSVSchema,
  getRequiredFields,
  getExportHeaders,
  getExportFields,
  generateTemplateFromSchema,
  parseRowWithSchema,
  formatItemForExport,
};
