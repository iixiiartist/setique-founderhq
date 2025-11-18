import React from 'react';
import { useForm, FormProvider, UseFormReturn, SubmitHandler, DefaultValues, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodTypeAny, TypeOf } from 'zod';

interface FormProps<TSchema extends ZodTypeAny, TValues extends FieldValues = TypeOf<TSchema>> {
  schema: TSchema;
  defaultValues: DefaultValues<TValues>;
  onSubmit: SubmitHandler<TValues>;
  children: React.ReactNode | ((methods: UseFormReturn<TValues>) => React.ReactNode);
  className?: string;
  id?: string;
}

export function Form<TSchema extends ZodTypeAny, TValues extends FieldValues = TypeOf<TSchema>>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className = '',
  id,
}: FormProps<TSchema, TValues>) {
  const methods = useForm<TValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    mode: 'onBlur', // Validate on blur for better UX
  });

  const { handleSubmit, formState } = methods;
  const { isSubmitting } = formState;

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={handleSubmit(onSubmit as any)}
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
