import React from 'react';
import { useForm, FormProvider, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

interface FormProps<T extends FieldValues> {
  schema: ZodSchema<T>;
  defaultValues: T;
  onSubmit: SubmitHandler<T>;
  children: React.ReactNode | ((methods: UseFormReturn<T>) => React.ReactNode);
  className?: string;
  id?: string;
}

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className = '',
  id,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur', // Validate on blur for better UX
  });

  const { handleSubmit, formState } = methods;
  const { isSubmitting } = formState;

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={handleSubmit(onSubmit)}
        className={className}
        noValidate // We handle validation with Zod
      >
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  );
}

// Export hooks for use in child components
export { useFormContext, useWatch, useController } from 'react-hook-form';
