# Design System Documentation

## Overview

The design system provides a consistent set of UI primitives following a **neo-brutal** design language. All components share common styling patterns, making the interface cohesive and maintainable.

## Design Principles

### Neo-Brutal Aesthetic
- **Bold borders**: 2px black borders on most elements
- **No border radius**: Sharp, rectangular edges (rounded-none)
- **Shadow effects**: Custom shadow-neo utilities for depth
- **High contrast**: Black text on white backgrounds
- **Hover transforms**: Elements shift position on hover for tactile feedback

### Accessibility First
- **ARIA labels**: All interactive elements properly labeled
- **Keyboard navigation**: Full keyboard support (Tab, Enter, Escape)
- **Focus indicators**: Clear blue focus rings
- **Error associations**: aria-describedby links errors to inputs
- **Screen reader support**: Semantic HTML with proper roles

## UI Primitives

### Button

Standardized button component with 5 variants, 3 sizes, and loading states.

**Import:**
```typescript
import { Button } from '../components/ui/Button';
```

**Variants:**
- `primary` - Black background, white text (default)
- `secondary` - White background, black text
- `danger` - Red background, white text
- `ghost` - Transparent, hover background
- `outline` - Border only, no background

**Sizes:**
- `sm` - Small (px-3 py-1.5, text-sm)
- `md` - Medium (px-4 py-2, text-base) - default
- `lg` - Large (px-6 py-3, text-lg)

**Usage:**
```typescript
// Primary button
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Loading state
<Button variant="primary" loading={isSubmitting}>
  Saving...
</Button>

// Disabled
<Button variant="secondary" disabled>
  Not Available
</Button>

// With icon
<Button variant="danger" size="sm">
  🗑️ Delete
</Button>
```

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}
```

**Styling:**
- Shadow: `shadow-neo-btn`
- Hover: `translate-x-[2px] translate-y-[2px]` + shadow removal
- Border: `border-2 border-black`
- Font: `font-mono font-semibold`

---

### Input

Standalone input component for use outside forms.

**Import:**
```typescript
import { Input } from '../components/ui/Input';
```

**Sizes:**
- `sm` - Small (text-sm, p-1.5)
- `md` - Medium (text-base, p-2) - default
- `lg` - Large (text-lg, p-3)

**Usage:**
```typescript
// Basic input
<Input
  label="Email Address"
  type="email"
  value={email}
  onChange={e => setEmail(e.target.value)}
/>

// With error
<Input
  label="Password"
  type="password"
  value={password}
  onChange={e => setPassword(e.target.value)}
  error="Password must be at least 8 characters"
/>

// With help text
<Input
  label="Username"
  value={username}
  onChange={e => setUsername(e.target.value)}
  helpText="Choose a unique username"
/>

// Required field
<Input
  label="Company Name"
  value={company}
  onChange={e => setCompany(e.target.value)}
  required
/>
```

**Props:**
```typescript
interface InputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}
```

**Styling:**
- Border: `border-2 border-black` (red when error)
- Focus: `focus:border-blue-500`
- Background: `bg-white`
- Disabled: `bg-gray-100 cursor-not-allowed`

---

### Select

Standalone select dropdown for use outside forms.

**Import:**
```typescript
import { Select } from '../components/ui/Select';
```

**Usage:**
```typescript
<Select
  label="Country"
  value={country}
  onChange={e => setCountry(e.target.value)}
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ]}
/>

// With placeholder
<Select
  label="Select Industry"
  value={industry}
  onChange={e => setIndustry(e.target.value)}
  placeholder="Choose an option..."
  options={industryOptions}
/>
```

**Props:**
```typescript
interface SelectProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}
```

---

### Card

Container component with 3 variants and 4 subcomponents for structured layouts.

**Import:**
```typescript
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
```

**Variants:**
- `default` - White bg, black border, shadow-neo
- `metric` - Adds hover effects (hover:shadow-neo-lg, hover:scale-[1.02])
- `section` - Gray bg (bg-gray-50), lighter border

**Padding:**
- `none` - No padding
- `sm` - p-3
- `md` - p-4 (default)
- `lg` - p-6

**Usage:**
```typescript
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Revenue Summary</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Total revenue: $125,000</p>
  </CardContent>
  <CardFooter>
    <Button variant="primary">View Details</Button>
  </CardFooter>
</Card>

// Metric card (clickable)
<Card variant="metric" onClick={() => navigate('/deals')} padding="lg">
  <div className="text-3xl font-bold">$2.5M</div>
  <div className="text-gray-600">Total Pipeline</div>
</Card>

// Section card
<Card variant="section" padding="sm">
  <p className="text-sm text-gray-700">This is a less prominent container</p>
</Card>
```

**Props:**
```typescript
interface CardProps {
  variant?: 'default' | 'metric' | 'section';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}
```

**Subcomponents:**
- `CardHeader` - Top section with bottom border
- `CardTitle` - Large, bold heading
- `CardContent` - Main content area
- `CardFooter` - Bottom section with top border

---

### Badge

Small labels for status, tags, categories, and counts.

**Import:**
```typescript
import { Badge } from '../components/ui/Badge';
```

**Variants:**
- `default` - Gray (bg-gray-200, text-gray-800)
- `primary` - Blue (bg-blue-100, text-blue-800)
- `success` - Green (bg-green-100, text-green-800)
- `warning` - Yellow (bg-yellow-100, text-yellow-800)
- `danger` - Red (bg-red-100, text-red-800)
- `info` - Purple (bg-purple-100, text-purple-800)

**Sizes:**
- `sm` - text-xs, px-1.5 py-0.5
- `md` - text-sm, px-2 py-0.5 (default)
- `lg` - text-base, px-2.5 py-1

**Usage:**
```typescript
// Status indicators
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Overdue</Badge>

// Removable tags
<Badge variant="primary" onRemove={() => removeTag('Q1')}>
  Q1
</Badge>

// Counts
<Badge variant="info" size="sm">12 new</Badge>
```

**Props:**
```typescript
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
  className?: string;
  children: React.ReactNode;
}
```

---

### Modal

Enhanced modal with size options, header actions, and footer slots.

**Import:**
```typescript
import Modal from '../components/shared/Modal';
```

**Sizes:**
- `sm` - max-w-md
- `md` - max-w-2xl (default)
- `lg` - max-w-4xl
- `xl` - max-w-6xl
- `full` - max-w-[95vw] min-h-[90vh]

**Usage:**
```typescript
// Basic modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Profile"
>
  <form>{/* Form fields */}</form>
</Modal>

// Large modal with footer
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Campaign Details"
  size="lg"
  footer={
    <div className="flex gap-2 justify-end">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={onSave}>Save</Button>
    </div>
  }
>
  <CampaignForm />
</Modal>

// With header actions
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Document Preview"
  size="xl"
  headerActions={
    <Button variant="ghost" size="sm" onClick={onDownload}>
      ⬇️ Download
    </Button>
  }
>
  <DocumentViewer />
</Modal>

// Hide close button
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Processing..."
  hideCloseButton
>
  <LoadingSpinner />
</Modal>
```

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  triggerRef?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}
```

**Features:**
- **Focus trap**: Tab cycles within modal
- **Escape key**: Closes modal
- **Backdrop click**: Closes modal
- **Return focus**: Focus returns to trigger element
- **Scrollable content**: Max height with custom scrollbar

---

## Layout Components

### FormSection

Groups related form fields with optional title and description.

**Import:**
```typescript
import { FormSection } from '../components/forms/FormSection';
```

**Usage:**
```typescript
<FormSection
  title="Billing Information"
  description="Enter your payment details"
>
  <FormField name="cardNumber" label="Card Number" />
  <FormField name="expiry" label="Expiry Date" />
  <FormField name="cvv" label="CVV" />
</FormSection>
```

---

## Color Palette

### Primary Colors
- **Black**: `#000000` - Primary text, borders, buttons
- **White**: `#FFFFFF` - Backgrounds, secondary text

### Semantic Colors
- **Blue**: Primary actions, focus states
  - `blue-50`: `#EFF6FF` - Backgrounds
  - `blue-500`: `#3B82F6` - Borders, active states
  - `blue-700`: `#1D4ED8` - Text
  - `blue-900`: `#1E3A8A` - Dark text

- **Green**: Success states
  - `green-100`: `#DCFCE7`
  - `green-500`: `#22C55E`
  - `green-600`: `#16A34A`

- **Yellow**: Warnings
  - `yellow-100`: `#FEF9C3`
  - `yellow-500`: `#EAB308`
  - `yellow-800`: `#854D0E`

- **Red**: Errors, destructive actions
  - `red-100`: `#FEE2E2`
  - `red-500`: `#EF4444`
  - `red-600`: `#DC2626`
  - `red-800`: `#991B1B`

- **Purple**: Documents, special features
  - `purple-50`: `#FAF5FF`
  - `purple-100`: `#F3E8FF`
  - `purple-500`: `#A855F7`
  - `purple-600`: `#9333EA`

- **Gray**: Neutral elements
  - `gray-50`: `#F9FAFB`
  - `gray-100`: `#F3F4F6`
  - `gray-200`: `#E5E7EB`
  - `gray-300`: `#D1D5DB`
  - `gray-500`: `#6B7280`
  - `gray-600`: `#4B5563`
  - `gray-700`: `#374151`

---

## Typography

### Font Families
- **Primary**: System font stack (default)
- **Mono**: `font-mono` - For labels, codes, numbers

### Font Weights
- **Regular**: `font-normal` (400)
- **Semibold**: `font-semibold` (600) - Labels, buttons
- **Bold**: `font-bold` (700) - Headings, emphasis

### Font Sizes
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)

---

## Spacing

### Padding/Margin Scale
- `p-1`: 0.25rem (4px)
- `p-2`: 0.5rem (8px)
- `p-3`: 0.75rem (12px)
- `p-4`: 1rem (16px)
- `p-6`: 1.5rem (24px)
- `p-8`: 2rem (32px)

### Gap Scale (Flexbox/Grid)
- `gap-1`: 0.25rem (4px)
- `gap-2`: 0.5rem (8px)
- `gap-3`: 0.75rem (12px)
- `gap-4`: 1rem (16px)

---

## Shadows

### Custom Shadows
```css
.shadow-neo {
  box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 1);
}

.shadow-neo-lg {
  box-shadow: 6px 6px 0px 0px rgba(0, 0, 0, 1);
}

.shadow-neo-btn {
  box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 1);
}
```

**Usage:**
```typescript
<div className="border-2 border-black shadow-neo">
  Content with neo-brutal shadow
</div>
```

---

## Animations

### Hover Transforms
```typescript
// Button hover
className="hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"

// Card hover (metric variant)
className="hover:scale-[1.02] hover:shadow-neo-lg"
```

### Transitions
```typescript
// Standard transition
className="transition-colors"

// All properties
className="transition-all"

// Custom duration
className="transition-transform duration-200"
```

---

## Composition Patterns

### Form Layout
```typescript
<Form schema={schema} defaultValues={...} onSubmit={...}>
  <FormSection title="Basic Info">
    <FormField name="title" label="Title" required />
    <div className="grid grid-cols-2 gap-4">
      <SelectField name="type" label="Type" options={...} />
      <SelectField name="status" label="Status" options={...} />
    </div>
  </FormSection>
  
  <div className="flex gap-2 pt-4 border-t-2 border-gray-300">
    <Button type="submit" variant="primary">Save</Button>
    <Button type="button" variant="secondary" onClick={onCancel}>
      Cancel
    </Button>
  </div>
</Form>
```

### Metric Cards Grid
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card variant="metric" onClick={() => navigate('/revenue')}>
    <CardContent>
      <div className="text-3xl font-bold text-green-600">$125K</div>
      <div className="text-sm text-gray-600">Total Revenue</div>
    </CardContent>
  </Card>
  
  <Card variant="metric" onClick={() => navigate('/deals')}>
    <CardContent>
      <div className="text-3xl font-bold text-blue-600">$2.5M</div>
      <div className="text-sm text-gray-600">Pipeline Value</div>
    </CardContent>
  </Card>
  
  <Card variant="metric" onClick={() => navigate('/customers')}>
    <CardContent>
      <div className="text-3xl font-bold text-purple-600">47</div>
      <div className="text-sm text-gray-600">Active Customers</div>
    </CardContent>
  </Card>
</div>
```

### List with Actions
```typescript
<div className="space-y-2">
  {items.map(item => (
    <Card key={item.id}>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="primary">{item.status}</Badge>
              <Badge variant="default">{item.category}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
              ✏️ Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(item)}>
              🗑️
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## Best Practices

### Do's ✅
- **Use semantic HTML** - Button for actions, links for navigation
- **Maintain consistency** - Use design system components everywhere
- **Follow color semantics** - Green for success, red for errors, etc.
- **Add hover states** - All interactive elements should have hover feedback
- **Provide feedback** - Loading states, success messages, error handling
- **Test accessibility** - Keyboard navigation, screen readers
- **Use spacing consistently** - Stick to the spacing scale

### Don'ts ❌
- **Don't mix custom styles** - Use design system components
- **Don't skip loading states** - Always show loading feedback
- **Don't forget disabled states** - Disable buttons during async operations
- **Don't use colors arbitrarily** - Follow semantic color guidelines
- **Don't skip ARIA labels** - Accessibility is mandatory
- **Don't create custom buttons** - Use Button component with variants
- **Don't hardcode shadows** - Use shadow-neo utilities

---

## Responsive Design

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile-First Approach
```typescript
// Mobile: 1 column, Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

// Responsive padding
<div className="p-2 sm:p-4 lg:p-6">

// Responsive text
<h1 className="text-xl sm:text-2xl lg:text-3xl">

// Hide on mobile
<div className="hidden md:block">
```

---

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible on all focusable elements
- [ ] ARIA labels on form inputs
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Loading states announced to screen readers
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets at least 44x44px
- [ ] Form validation errors clear and actionable
- [ ] Modal focus trapping implemented
- [ ] Skip links for navigation (if applicable)

---

## Component Checklist

When creating new components:

- [ ] TypeScript interface for props
- [ ] Variant/size props where applicable
- [ ] Disabled state styling
- [ ] Error state styling (if applicable)
- [ ] Loading state (for async components)
- [ ] ARIA attributes
- [ ] Keyboard event handlers
- [ ] Focus management
- [ ] Hover/active states
- [ ] Consistent with neo-brutal design
- [ ] Responsive breakpoints
- [ ] forwardRef (if ref needed)

---

## Migration Guide

### Replacing Custom Styles

**Before:**
```typescript
<button
  onClick={handleClick}
  className="bg-black text-white px-4 py-2 border-2 border-black font-mono font-semibold shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
>
  Save
</button>
```

**After:**
```typescript
<Button variant="primary" onClick={handleClick}>
  Save
</Button>
```

### Replacing Custom Badges

**Before:**
```typescript
<span className="px-2 py-0.5 bg-blue-100 border border-blue-500 text-blue-800 text-sm font-semibold">
  Active
</span>
```

**After:**
```typescript
<Badge variant="primary">Active</Badge>
```

### Replacing Custom Cards

**Before:**
```typescript
<div className="bg-white border-2 border-black shadow-neo p-4">
  <h3 className="text-lg font-bold mb-2">Title</h3>
  <p>Content</p>
</div>
```

**After:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```
