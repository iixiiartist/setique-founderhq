import { useState, useCallback, useMemo } from 'react';

/**
 * Form field configuration
 */
export interface FormFieldConfig<T> {
  /** Initial value */
  initialValue: T;
  /** Validation function - returns error message or undefined/null if valid */
  validate?: (value: T, allValues: Record<string, unknown>) => string | undefined | null;
  /** Whether field is required */
  required?: boolean;
  /** Custom required message */
  requiredMessage?: string;
}

/**
 * Form field state
 */
export interface FormFieldState<T> {
  /** Current value */
  value: T;
  /** Error message if invalid */
  error: string | null;
  /** Whether field has been touched (focused and blurred) */
  touched: boolean;
  /** Whether field is dirty (value changed from initial) */
  dirty: boolean;
}

/**
 * Return type for useForm hook
 */
export interface UseFormReturn<T extends Record<string, unknown>> {
  /** Current form values */
  values: T;
  /** Field errors */
  errors: Partial<Record<keyof T, string>>;
  /** Touched state for each field */
  touched: Partial<Record<keyof T, boolean>>;
  /** Whether the form is valid */
  isValid: boolean;
  /** Whether any field has been modified */
  isDirty: boolean;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Set a single field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set multiple values at once */
  setValues: (values: Partial<T>) => void;
  /** Mark a field as touched */
  setTouched: (field: keyof T) => void;
  /** Set a field error manually */
  setError: (field: keyof T, error: string | null) => void;
  /** Validate a single field */
  validateField: (field: keyof T) => boolean;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Reset form to initial values */
  reset: () => void;
  /** Reset a single field */
  resetField: (field: keyof T) => void;
  /** Handle input change event */
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Handle blur event (marks field as touched) */
  handleBlur: (field: keyof T) => () => void;
  /** Handle form submission */
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e?: React.FormEvent) => Promise<void>;
  /** Get props for an input field */
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
  };
  /** Get error message for a field (only if touched) */
  getFieldError: (field: keyof T) => string | null;
}

/**
 * Hook for managing form state with validation.
 * 
 * @param config - Field configurations with initial values and validators
 * @returns Form state and control functions
 * 
 * @example
 * // Basic usage
 * const form = useForm({
 *   name: { initialValue: '', required: true },
 *   email: { 
 *     initialValue: '',
 *     required: true,
 *     validate: (v) => !v.includes('@') ? 'Invalid email' : null
 *   },
 *   age: { initialValue: 0 }
 * });
 * 
 * <form onSubmit={form.handleSubmit(handleSave)}>
 *   <input {...form.getFieldProps('name')} />
 *   {form.getFieldError('name') && <span>{form.getFieldError('name')}</span>}
 *   
 *   <input {...form.getFieldProps('email')} />
 *   {form.getFieldError('email') && <span>{form.getFieldError('email')}</span>}
 *   
 *   <button type="submit" disabled={!form.isValid || form.isSubmitting}>
 *     Submit
 *   </button>
 * </form>
 */
export function useForm<T extends Record<string, unknown>>(
  config: { [K in keyof T]: FormFieldConfig<T[K]> }
): UseFormReturn<T> {
  // Extract initial values from config
  const initialValues = useMemo(() => {
    const values = {} as T;
    for (const key in config) {
      values[key] = config[key].initialValue;
    }
    return values;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    for (const key in values) {
      if (values[key] !== initialValues[key]) {
        return true;
      }
    }
    return false;
  }, [values, initialValues]);

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    const fieldConfig = config[field];
    const value = values[field];
    let error: string | null = null;

    // Check required
    if (fieldConfig.required) {
      const isEmpty = value === '' || value === null || value === undefined ||
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        error = fieldConfig.requiredMessage || `${String(field)} is required`;
      }
    }

    // Run custom validation if no required error
    if (!error && fieldConfig.validate) {
      const validationResult = fieldConfig.validate(value, values as Record<string, unknown>);
      if (validationResult) {
        error = validationResult;
      }
    }

    setErrors(prev => ({ ...prev, [field]: error || undefined }));
    return !error;
  }, [config, values]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Partial<Record<keyof T, string>> = {};

    for (const field in config) {
      const fieldConfig = config[field];
      const value = values[field];
      let error: string | null = null;

      // Check required
      if (fieldConfig.required) {
        const isEmpty = value === '' || value === null || value === undefined ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          error = fieldConfig.requiredMessage || `${field} is required`;
        }
      }

      // Run custom validation
      if (!error && fieldConfig.validate) {
        const validationResult = fieldConfig.validate(value, values as Record<string, unknown>);
        if (validationResult) {
          error = validationResult;
        }
      }

      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [config, values]);

  // Check if form is valid (no errors for touched fields)
  const isValid = useMemo(() => {
    for (const key in errors) {
      if (errors[key]) {
        return false;
      }
    }
    return true;
  }, [errors]);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    // Clear error when value changes
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setTouched = useCallback((field: keyof T) => {
    setTouchedState(prev => ({ ...prev, [field]: true }));
  }, []);

  const setError = useCallback((field: keyof T, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error || undefined }));
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState({});
  }, [initialValues]);

  const resetField = useCallback((field: keyof T) => {
    setValuesState(prev => ({ ...prev, [field]: initialValues[field] }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setTouchedState(prev => ({ ...prev, [field]: false }));
  }, [initialValues]);

  const handleChange = useCallback((field: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    let value: unknown;

    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else if (target.type === 'number') {
      value = target.value === '' ? '' : Number(target.value);
    } else {
      value = target.value;
    }

    setValue(field, value as T[keyof T]);
  }, [setValue]);

  const handleBlur = useCallback((field: keyof T) => () => {
    setTouched(field);
    validateField(field);
  }, [setTouched, validateField]);

  const handleSubmit = useCallback((onSubmit: (values: T) => void | Promise<void>) => async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    for (const key in config) {
      allTouched[key] = true;
    }
    setTouchedState(allTouched);

    // Validate all fields
    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [config, validateAll, values]);

  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChange: handleChange(field),
    onBlur: handleBlur(field)
  }), [values, handleChange, handleBlur]);

  const getFieldError = useCallback((field: keyof T): string | null => {
    if (touched[field] && errors[field]) {
      return errors[field] || null;
    }
    return null;
  }, [touched, errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    setValue,
    setValues,
    setTouched,
    setError,
    validateField,
    validateAll,
    reset,
    resetField,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldProps,
    getFieldError
  };
}

export default useForm;
