# Form System Documentation

## Overview

The form system provides a consistent, type-safe way to build forms across the application using **react-hook-form** and **Zod** validation. This eliminates manual state management, provides centralized validation, and ensures consistent error handling.

## Benefits

- ✅ **Type Safety**: Schema-driven validation with automatic TypeScript inference
- ✅ **Centralized Validation**: Single source of truth for validation rules
- ✅ **Reduced Boilerplate**: No manual `useState`, `onChange`, or validation logic
- ✅ **Better UX**: Field-level errors, validation on blur, automatic accessibility
- ✅ **Consistent Styling**: All fields use the same neo-brutal design language
- ✅ **Easy Testing**: Schema validation can be tested independently

## Core Components

### 1. Form (Wrapper)

The `Form` component wraps `react-hook-form`'s `FormProvider` and integrates Zod validation.

```typescript
import { Form } from '../components/forms/Form';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function MyForm() {
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    // data is fully typed!
    console.log(data.email, data.password);
  };

  return (
    <Form
      schema={schema}
      defaultValues={{ email: '', password: '' }}
      onSubmit={handleSubmit}
    >
      {/* Fields go here */}
    </Form>
  );
}
```

**Props:**
- `schema`: Zod schema for validation
- `defaultValues`: Initial form values
- `onSubmit`: Handler receiving validated data
- `children`: Form fields (can be function to access form methods)
- `className`: Optional CSS classes
- `id`: Optional form ID

**Access Form State:**
```typescript
<Form schema={schema} defaultValues={...} onSubmit={...}>
  {({ formState, watch, getValues }) => (
    <div>
      <FormField name="email" label="Email" />
      {formState.isSubmitting && <p>Saving...</p>}
      {watch('email').includes('@') && <p>Valid domain</p>}
    </div>
  )}
</Form>
```

### 2. FormField (Input)

Controlled input field with integrated validation, errors, and accessibility.

```typescript
<FormField
  name="title"
  label="Campaign Title"
  placeholder="e.g., Q1 Product Launch"
  required
  helpText="Choose a descriptive name"
/>
```

**Props:**
- `name`: Field name (must match schema key)
- `label`: Display label
- `type`: Input type (text, email, password, number, tel, url, date, time, datetime-local)
- `placeholder`: Placeholder text
- `helpText`: Helper text below input
- `required`: Shows asterisk, adds aria-required
- `disabled`: Disables input
- `min`, `max`, `step`: For number inputs
- `autoComplete`: Browser autocomplete hint

**Supported Types:**
- `text` (default)
- `email` - Email validation
- `password` - Masked input
- `number` - Numeric input with step controls
- `tel` - Phone number
- `url` - URL validation
- `date` - Date picker
- `time` - Time picker
- `datetime-local` - Date + time picker

### 3. SelectField (Dropdown)

Controlled select dropdown with validation.

```typescript
<SelectField
  name="status"
  label="Status"
  required
  options={[
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ]}
/>
```

**Props:**
- `name`: Field name
- `label`: Display label
- `options`: Array of `{ value, label }` objects
- `placeholder`: Default option text
- `required`: Validation + visual indicator
- `disabled`: Disables dropdown

### 4. FormSection (Grouping)

Groups related fields with optional title and description.

```typescript
<FormSection
  title="Basic Information"
  description="Core details about this campaign"
>
  <FormField name="title" label="Title" required />
  <SelectField name="type" label="Type" options={...} />
</FormSection>
```

**Props:**
- `title`: Section heading (optional)
- `description`: Section description (optional)
- `children`: Form fields to group

## Validation Patterns

### Basic Validation

```typescript
const schema = z.object({
  // Required string
  title: z.string().min(1, 'Title is required'),
  
  // Email
  email: z.string().email('Invalid email address'),
  
  // Number with range
  age: z.number().min(18, 'Must be 18+').max(120),
  
  // Optional field
  notes: z.string().optional(),
  
  // URL
  website: z.string().url('Invalid URL').optional(),
});
```

### Advanced Validation

```typescript
const schema = z.object({
  // Password with requirements
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  
  // Conditional validation
  hasDiscount: z.boolean(),
  discountPercent: z.number().min(0).max(100).optional(),
}).refine(
  data => !data.hasDiscount || data.discountPercent !== undefined,
  { message: 'Discount is required when enabled', path: ['discountPercent'] }
);

// Dependent fields
const schema = z.object({
  startDate: z.string(),
  endDate: z.string(),
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

// Custom validation
const schema = z.object({
  sku: z.string().refine(
    async (sku) => {
      const exists = await checkSKUAvailability(sku);
      return !exists;
    },
    { message: 'SKU already in use' }
  ),
});
```

### Transforms and Preprocessing

```typescript
const schema = z.object({
  // Trim whitespace
  title: z.string().trim().min(1),
  
  // Parse numbers from strings
  price: z.string().transform(val => parseFloat(val)),
  
  // Normalize email
  email: z.string().email().transform(val => val.toLowerCase()),
  
  // Date strings
  dueDate: z.string().transform(val => new Date(val)),
});
```

## Common Patterns

### Multi-Step Forms

```typescript
const step1Schema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
});

const step2Schema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
});

const fullSchema = step1Schema.merge(step2Schema);

function MultiStepForm() {
  const [step, setStep] = useState(1);
  
  return (
    <Form
      schema={step === 1 ? step1Schema : fullSchema}
      defaultValues={{...}}
      onSubmit={data => {
        if (step === 1) {
          setStep(2);
        } else {
          // Final submission
          saveData(data);
        }
      }}
    >
      {step === 1 ? <Step1Fields /> : <Step2Fields />}
    </Form>
  );
}
```

### Computed Values

```typescript
<Form schema={schema} defaultValues={...} onSubmit={...}>
  {({ watch }) => {
    const quantity = watch('quantity') || 0;
    const unitPrice = watch('unitPrice') || 0;
    const total = quantity * unitPrice;
    
    return (
      <>
        <FormField name="quantity" type="number" label="Quantity" />
        <FormField name="unitPrice" type="number" label="Unit Price" />
        <div className="font-bold">Total: ${total.toFixed(2)}</div>
      </>
    );
  }}
</Form>
```

### Array Fields

```typescript
import { useFieldArray } from 'react-hook-form';

const schema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().min(1),
  })),
});

function FormWithArray() {
  return (
    <Form schema={schema} defaultValues={{ items: [] }} onSubmit={...}>
      {({ control }) => {
        const { fields, append, remove } = useFieldArray({
          control,
          name: 'items',
        });
        
        return (
          <>
            {fields.map((field, index) => (
              <div key={field.id}>
                <FormField name={`items.${index}.name`} label="Name" />
                <FormField name={`items.${index}.quantity`} label="Qty" type="number" />
                <button onClick={() => remove(index)}>Remove</button>
              </div>
            ))}
            <button onClick={() => append({ name: '', quantity: 1 })}>
              Add Item
            </button>
          </>
        );
      }}
    </Form>
  );
}
```

### File Uploads

```typescript
const schema = z.object({
  title: z.string().min(1),
  file: z.instanceof(File).optional(),
});

function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  
  return (
    <Form schema={schema.omit({ file: true })} defaultValues={{...}} onSubmit={...}>
      <FormField name="title" label="Title" required />
      <div>
        <label>Upload File</label>
        <input
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
      </div>
    </Form>
  );
}
```

## Migration Checklist

When migrating an existing form to the new system:

- [ ] **1. Create Zod Schema**
  - Define validation rules for all fields
  - Use appropriate types (string, number, boolean, etc.)
  - Add error messages
  - Test schema independently

- [ ] **2. Identify Form State**
  - List all `useState` for form fields
  - List all `useState` for UI state (modals, tabs, etc.)
  - Only form field state goes in schema
  - UI state stays as local useState

- [ ] **3. Replace Form Wrapper**
  - Wrap form in `<Form>` component
  - Remove manual `onSubmit` handler logic
  - Remove manual validation checks
  - Pass schema and defaultValues

- [ ] **4. Replace Input Fields**
  - `<input type="text">` → `<FormField>`
  - `<input type="number">` → `<FormField type="number">`
  - `<select>` → `<SelectField>`
  - Remove individual `onChange` handlers
  - Keep specialized inputs (CurrencyInput, EntityLinkField, etc.)

- [ ] **5. Replace Buttons**
  - Use `<Button>` component with variants
  - Submit button gets `type="submit"`
  - Use `loading={formState.isSubmitting}` prop
  - Cancel button gets `type="button"`

- [ ] **6. Handle Errors**
  - Remove manual error state
  - FormField shows errors automatically
  - Add global error state for submission errors
  - Use `try/catch` in onSubmit

- [ ] **7. Test Thoroughly**
  - Test all validation rules
  - Test form submission
  - Test error messages
  - Test loading states
  - Test keyboard navigation
  - Test screen reader compatibility

## Examples

### Simple Contact Form

```typescript
import { Form, FormField } from '../components/forms';
import { Button } from '../components/ui/Button';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export function ContactForm() {
  const handleSubmit = async (data: z.infer<typeof contactSchema>) => {
    await sendMessage(data);
  };

  return (
    <Form
      schema={contactSchema}
      defaultValues={{ name: '', email: '', message: '' }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {({ formState }) => (
        <>
          <FormField name="name" label="Name" required />
          <FormField name="email" label="Email" type="email" required />
          <FormField name="message" label="Message" required />
          
          <Button
            type="submit"
            variant="primary"
            loading={formState.isSubmitting}
          >
            Send Message
          </Button>
        </>
      )}
    </Form>
  );
}
```

### Product Form with Pricing

```typescript
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  basePrice: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0).optional(),
  category: z.enum(['electronics', 'clothing', 'food', 'other']),
  inStock: z.boolean(),
});

export function ProductForm({ product, onSave }: ProductFormProps) {
  return (
    <Form
      schema={productSchema}
      defaultValues={product || {
        name: '',
        sku: '',
        basePrice: 0,
        cost: 0,
        category: 'other',
        inStock: true,
      }}
      onSubmit={onSave}
    >
      {({ watch, formState }) => {
        const basePrice = watch('basePrice') || 0;
        const cost = watch('cost') || 0;
        const margin = cost > 0 ? ((basePrice - cost) / basePrice * 100) : 0;

        return (
          <>
            <FormSection title="Basic Information">
              <FormField name="name" label="Product Name" required />
              <FormField name="sku" label="SKU" required />
              <SelectField
                name="category"
                label="Category"
                required
                options={[
                  { value: 'electronics', label: 'Electronics' },
                  { value: 'clothing', label: 'Clothing' },
                  { value: 'food', label: 'Food' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </FormSection>

            <FormSection title="Pricing">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="basePrice"
                  label="Base Price"
                  type="number"
                  min={0}
                  step={0.01}
                  required
                />
                <FormField
                  name="cost"
                  label="Cost"
                  type="number"
                  min={0}
                  step={0.01}
                />
              </div>
              {margin > 0 && (
                <div className="p-2 bg-gray-100 border-2 border-black">
                  <p className="text-sm font-semibold">
                    Profit Margin: {margin.toFixed(1)}%
                  </p>
                </div>
              )}
            </FormSection>

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                loading={formState.isSubmitting}
              >
                {product ? 'Update' : 'Create'} Product
              </Button>
            </div>
          </>
        );
      }}
    </Form>
  );
}
```

## Best Practices

### Do's ✅

- **Use Zod for all validation** - Don't mix Zod with manual validation
- **Keep schemas near components** - Define schema in same file as form
- **Use TypeScript inference** - `z.infer<typeof schema>` for types
- **Validate on blur** - Default behavior, better UX than onChange
- **Group related fields** - Use FormSection for organization
- **Provide helpful error messages** - User-friendly, actionable messages
- **Test schemas independently** - `schema.safeParse(data)` in tests

### Don'ts ❌

- **Don't mutate form data in render** - Use transforms in schema instead
- **Don't validate in onChange** - Triggers too often, use onBlur
- **Don't forget required fields** - Use `required` prop for visual indicator
- **Don't mix controlled/uncontrolled** - Form system is controlled
- **Don't put UI state in schema** - Only form data in schema
- **Don't skip error handling** - Always handle submission errors
- **Don't forget accessibility** - FormField handles ARIA automatically

## Troubleshooting

### "Field not registering"
Make sure `name` prop matches schema key exactly. Case-sensitive.

### "Validation not working"
Check that schema is defined correctly. Use `schema.safeParse(data)` to test.

### "Default values not showing"
Ensure `defaultValues` matches schema structure. All keys must be present.

### "Form not submitting"
Check for validation errors. Form won't submit if validation fails.

### "TypeScript errors"
Make sure schema types match your form data. Use `z.infer<typeof schema>`.

### "Re-renders on every keystroke"
This is normal. Use `watch()` judiciously for computed values.

## Further Reading

- [react-hook-form documentation](https://react-hook-form.com/)
- [Zod documentation](https://zod.dev/)
- [Form accessibility guide](https://www.w3.org/WAI/tutorials/forms/)
