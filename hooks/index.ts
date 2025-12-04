/**
 * Shared hooks index
 * Convenient re-exports for commonly used hooks
 */

// Modal management
export { useModal, useMultiModal } from './useModal';
export type { UseModalReturn, UseMultiModalReturn } from './useModal';

// Bulk selection
export { useBulkSelection } from './useBulkSelection';
export type { UseBulkSelectionReturn, UseBulkSelectionOptions } from './useBulkSelection';

// Filtering and sorting
export { useFilteredList } from './useFilteredList';
export type { 
  UseFilteredListReturn, 
  FilterConfig, 
  FilterState, 
  SortOrder 
} from './useFilteredList';

// Confirmation dialogs
export { 
  useConfirmAction, 
  useDeleteConfirm, 
  useBulkDeleteConfirm, 
  useDiscardChangesConfirm 
} from './useConfirmAction';
export type { UseConfirmActionReturn, ConfirmActionConfig, ConfirmVariant } from './useConfirmAction';

// Debouncing and throttling (re-export from existing)
export { useDebounce, useDebouncedValue, useThrottle } from './useDebounce';

// Async state management
export { useAsync, useAsyncEffect } from './useAsync';
export type { 
  AsyncState, 
  UseAsyncOptions, 
  UseAsyncReturn 
} from './useAsync';

// Local/Session storage
export { useLocalStorage, useSessionStorage } from './useLocalStorage';
export type { UseLocalStorageOptions } from './useLocalStorage';

// Pagination
export { usePagination, useServerPagination } from './usePagination';
export type { 
  PaginationState, 
  UsePaginationReturn, 
  UsePaginationOptions,
  UseServerPaginationOptions 
} from './usePagination';

// Intersection observer (scroll animations, lazy loading)
export { useIntersectionObserver, useInViewAnimation } from './useIntersectionObserver';
export type { 
  UseIntersectionObserverOptions, 
  UseIntersectionObserverReturn,
  UseInViewAnimationOptions 
} from './useIntersectionObserver';

// Click outside detection
export { useClickOutside, useClickOutsideMultiple, useClickOutsideOrEscape } from './useClickOutside';

// Clipboard operations
export { useCopyToClipboard, useCopyWithId } from './useCopyToClipboard';
export type { UseCopyToClipboardReturn } from './useCopyToClipboard';

// Temporary state (auto-reset after timeout)
export { useTemporaryState, useTemporaryFlag, useTemporaryBoolean, useSuccessState } from './useTemporaryState';
export type { UseTemporaryStateReturn } from './useTemporaryState';

// Form state management
export { useForm } from './useForm';
export type { 
  UseFormReturn, 
  FormFieldConfig, 
  FormFieldState 
} from './useForm';

// Dashboard data management (extracted from DashboardApp)
export { useDashboardData } from './useDashboardData';
export type { UseDashboardDataOptions, UseDashboardDataReturn } from './useDashboardData';

// CRM-specific hooks
export { useCrmSelection } from './useCrmSelection';
export type { UseCrmSelectionOptions, UseCrmSelectionReturn } from './useCrmSelection';

export { useAccountFilters, useContactFilters } from './useCrmFilters';
export type { AccountFilterState, ContactFilterState, UseAccountFiltersOptions, UseContactFiltersOptions } from './useCrmFilters';

// CSV import/export
export { useCsvImportExport } from './useCsvImportExport';
export type { UseCsvImportExportOptions, UseCsvImportExportReturn } from './useCsvImportExport';

// Document editor (extracted from DocEditor)
export { useDocEditor, getDefaultExtensions } from './useDocEditor';
export type { UseDocEditorOptions, UseDocEditorReturn, EditorCommands } from './useDocEditor';

// Background agent jobs
export { useBackgroundAgentJobs } from './useBackgroundAgentJobs';
export type { UseBackgroundAgentJobsOptions, UseBackgroundAgentJobsReturn } from './useBackgroundAgentJobs';
