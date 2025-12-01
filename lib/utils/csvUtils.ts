/**
 * Shared CSV parsing and export utilities.
 * Consolidates duplicate CSV logic from ContactManager and AccountManager.
 */

export interface CSVImportResult {
  success: number;
  failed: number;
  errors: CSVImportError[];
}

export interface CSVImportError {
  row: number;
  error: string;
  data: Record<string, any>;
}

export interface CSVParseOptions {
  /** Custom delimiter (default: ',') */
  delimiter?: string;
  /** Whether to trim whitespace from values */
  trim?: boolean;
  /** Skip empty rows */
  skipEmpty?: boolean;
  /** Transform header names (e.g., toLowerCase) */
  headerTransform?: (header: string) => string;
}

export interface CSVExportOptions {
  /** Fields to include in export (in order) */
  fields: string[];
  /** Custom header names (maps field name to display name) */
  headerNames?: Record<string, string>;
  /** Delimiter character */
  delimiter?: string;
  /** Include BOM for Excel compatibility */
  includeBOM?: boolean;
}

/**
 * Parse a CSV string into an array of objects.
 * Handles quoted values, escaped quotes, and multi-line values.
 */
export function parseCSV<T = Record<string, string>>(
  text: string,
  options: CSVParseOptions = {}
): T[] {
  const {
    delimiter = ',',
    trim = true,
    skipEmpty = true,
    headerTransform = (h) => h.toLowerCase().trim()
  } = options;

  const lines = text.split('\n');
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0], delimiter).map(h => 
    headerTransform ? headerTransform(h) : h
  );

  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (skipEmpty && !line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    
    // Create object from headers and values
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      if (trim) value = value.trim();
      row[header] = value;
    });

    rows.push(row as T);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted values correctly.
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // End of quoted value
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Push last value
  values.push(current);

  return values;
}

/**
 * Convert an array of objects to a CSV string.
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  options: CSVExportOptions
): string {
  const {
    fields,
    headerNames = {},
    delimiter = ',',
    includeBOM = true
  } = options;

  if (data.length === 0) return '';

  // Create header row
  const headerRow = fields
    .map(field => escapeCSVValue(headerNames[field] || field, delimiter))
    .join(delimiter);

  // Create data rows
  const dataRows = data.map(item => {
    return fields
      .map(field => {
        const value = item[field];
        return escapeCSVValue(formatCSVValue(value), delimiter);
      })
      .join(delimiter);
  });

  const csv = [headerRow, ...dataRows].join('\n');
  
  // Add BOM for Excel compatibility
  return includeBOM ? '\ufeff' + csv : csv;
}

/**
 * Escape a value for CSV output.
 */
function escapeCSVValue(value: string, delimiter: string): string {
  // Quote if contains delimiter, quotes, or newlines
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a value for CSV output.
 */
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Download a CSV string as a file.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Create a timestamped filename for CSV exports.
 */
export function createCSVFilename(baseName: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${baseName}_export_${today}.csv`;
}

/**
 * Validate required fields in a CSV row.
 */
export function validateCSVRow(
  row: Record<string, string>,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => !row[field] || !row[field].trim());
  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Generate a CSV template string for import.
 */
export function generateCSVTemplate(
  fields: string[],
  headerNames?: Record<string, string>,
  exampleRow?: Record<string, string>
): string {
  const headers = fields.map(f => headerNames?.[f] || f);
  const rows = [headers.join(',')];
  
  if (exampleRow) {
    rows.push(fields.map(f => exampleRow[f] || '').join(','));
  }
  
  return rows.join('\n');
}

/**
 * Process CSV import with progress tracking.
 */
export async function processCSVImport<T>(
  rows: Record<string, string>[],
  processor: (row: Record<string, string>, index: number) => Promise<{ success: boolean; error?: string }>,
  onProgress?: (progress: number) => void
): Promise<CSVImportResult> {
  const result: CSVImportResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Report progress
    if (onProgress) {
      onProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    try {
      const processResult = await processor(row, i);
      
      if (processResult.success) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 for header row and 0-index
          error: processResult.error || 'Unknown error',
          data: row
        });
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: i + 2,
        error: error instanceof Error ? error.message : 'Processing error',
        data: row
      });
    }
  }

  return result;
}

/**
 * Read a File object and parse as CSV.
 */
export async function readCSVFile<T = Record<string, string>>(
  file: File,
  options?: CSVParseOptions
): Promise<T[]> {
  const text = await file.text();
  return parseCSV<T>(text, options);
}

export default {
  parseCSV,
  toCSV,
  downloadCSV,
  createCSVFilename,
  validateCSVRow,
  generateCSVTemplate,
  processCSVImport,
  readCSVFile
};
