/**
 * useCsvImportExport Hook
 * 
 * Shared hook for CSV import/export operations across all entity types.
 * Consolidates duplicate import/export logic from ContactManager, AccountManager, etc.
 * Uses centralized CSV schemas from csvSchemas.ts.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  parseCSV,
  toCSV,
  downloadCSV,
  createCSVFilename,
  readCSVFile,
  CSVImportResult,
} from '../lib/utils/csvUtils';
import {
  CSVSchema,
  getCSVSchema,
  generateTemplateFromSchema,
  parseRowWithSchema,
  formatItemForExport,
} from '../lib/utils/csvSchemas';

export interface UseCsvImportExportOptions<T> {
  /** Entity type name (contacts, accounts, investors, etc.) */
  entityType: string;
  /** Custom schema override */
  schema?: CSVSchema;
  /** Process a single imported row */
  processImportRow?: (row: Record<string, any>, index: number) => Promise<{ success: boolean; error?: string }>;
  /** Transform item before export */
  transformForExport?: (item: T) => Record<string, any>;
}

export interface UseCsvImportExportReturn<T> {
  // Import state
  isImporting: boolean;
  importProgress: number;
  importResult: CSVImportResult | null;
  
  // Import actions
  startImport: (file: File) => Promise<CSVImportResult>;
  clearImportResult: () => void;
  downloadTemplate: () => void;
  
  // Export actions
  exportItems: (items: T[], filename?: string) => void;
  exportSelected: (items: T[], selectedIds: Set<string>, filename?: string) => void;
  
  // Schema info
  schema: CSVSchema | undefined;
  requiredFields: string[];
}

export function useCsvImportExport<T extends { id: string }>(
  options: UseCsvImportExportOptions<T>
): UseCsvImportExportReturn<T> {
  const {
    entityType,
    schema: customSchema,
    processImportRow,
    transformForExport,
  } = options;

  // Get schema
  const schema = customSchema || getCSVSchema(entityType);
  const requiredFields = schema?.fields.filter(f => f.required).map(f => f.field) || [];

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  // Clear import result
  const clearImportResult = useCallback(() => {
    setImportResult(null);
    setImportProgress(0);
  }, []);

  // Download template
  const downloadTemplate = useCallback(() => {
    if (!schema) {
      console.error('No schema found for entity type:', entityType);
      return;
    }

    const template = generateTemplateFromSchema(schema);
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}_import_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [schema, entityType]);

  // Start import
  const startImport = useCallback(async (file: File): Promise<CSVImportResult> => {
    if (!schema) {
      throw new Error(`No schema found for entity type: ${entityType}`);
    }

    if (!processImportRow) {
      throw new Error('processImportRow callback is required for import');
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const result: CSVImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Read and parse CSV
      const rows = await readCSVFile(file, {
        headerTransform: (h) => h.toLowerCase().trim(),
      });

      if (rows.length === 0) {
        result.errors.push({
          row: 0,
          error: 'No valid data found in CSV file',
          data: {},
        });
        setImportResult(result);
        return result;
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        
        // Parse row using schema
        const parsedRow = parseRowWithSchema(rawRow, schema);
        
        // Validate using schema validator
        if (schema.validate) {
          const validationError = schema.validate(parsedRow);
          if (validationError) {
            result.failed++;
            result.errors.push({
              row: i + 2, // +2 for header row and 0-index
              error: validationError,
              data: rawRow,
            });
            setImportProgress(Math.round(((i + 1) / rows.length) * 100));
            continue;
          }
        }

        // Process the row
        try {
          const processResult = await processImportRow(parsedRow, i);
          
          if (processResult.success) {
            result.success++;
          } else {
            result.failed++;
            result.errors.push({
              row: i + 2,
              error: processResult.error || 'Unknown error',
              data: rawRow,
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            error: error instanceof Error ? error.message : 'Processing error',
            data: rawRow,
          });
        }

        // Update progress
        setImportProgress(Math.round(((i + 1) / rows.length) * 100));
        
        // Small delay to prevent UI blocking
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Failed to read CSV file',
        data: {},
      });
    } finally {
      setIsImporting(false);
      setImportResult(result);
    }

    return result;
  }, [schema, entityType, processImportRow]);

  // Export items
  const exportItems = useCallback((items: T[], filename?: string) => {
    if (!schema) {
      console.error('No schema found for entity type:', entityType);
      return;
    }

    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }

    // Transform items for export
    const exportData = items.map(item => {
      if (transformForExport) {
        return transformForExport(item);
      }
      return formatItemForExport(item as any, schema);
    });

    // Get fields and header names from schema
    const fields = schema.fields.map(f => f.field);
    const headerNames: Record<string, string> = {};
    schema.fields.forEach(f => {
      headerNames[f.field] = f.header;
    });

    // Generate CSV
    const csv = toCSV(exportData, {
      fields,
      headerNames,
      includeBOM: true,
    });

    // Download
    const exportFilename = filename || createCSVFilename(entityType);
    downloadCSV(csv, exportFilename);
  }, [schema, entityType, transformForExport]);

  // Export selected items
  const exportSelected = useCallback((
    items: T[],
    selectedIds: Set<string>,
    filename?: string
  ) => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    
    if (selectedItems.length === 0) {
      toast.error('No items selected for export');
      return;
    }

    exportItems(selectedItems, filename || createCSVFilename(`${entityType}_selected`));
  }, [entityType, exportItems]);

  return {
    // Import state
    isImporting,
    importProgress,
    importResult,
    
    // Import actions
    startImport,
    clearImportResult,
    downloadTemplate,
    
    // Export actions
    exportItems,
    exportSelected,
    
    // Schema info
    schema,
    requiredFields,
  };
}

export default useCsvImportExport;
