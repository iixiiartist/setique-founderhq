# Domain Widgets Documentation

## Overview

Domain widgets are specialized, reusable components that handle common business logic patterns across the application. They provide consistent UIs for selecting entities, managing relationships, and handling complex inputs.

## Widgets

### 1. EntityLinkField

Universal widget for linking any entity type (deals, campaigns, events, tasks, documents, contacts, CRM items).

**Import:**
```typescript
import { EntityLinkField } from '../components/domain/EntityLinkField';
```

**Use Cases:**
- Link deals to campaigns
- Link events to tasks
- Link documents to any entity
- Associate contacts with deals
- Cross-reference entities

**Example:**
```typescript
import { EntityLinkField, Entity } from '../components/domain/EntityLinkField';

// Prepare entities
const campaigns: Entity[] = marketingItems.map(item => ({
  id: item.id,
  title: item.title,
  subtitle: `${item.type} • ${item.status}`,
  icon: '📢',
  metadata: {
    budget: `$${item.campaignBudget}`,
    launch: item.dueDate,
  },
}));

// Single-select mode
<EntityLinkField
  label="Link to Campaign"
  entityType="campaign"
  entities={campaigns}
  selectedIds={selectedCampaigns}
  onSelect={setSelectedCampaigns}
  mode="single"
  helpText="Associate this deal with a marketing campaign"
/>

// Multi-select mode
<EntityLinkField
  label="Related Events"
  entityType="event"
  entities={events}
  selectedIds={linkedEvents}
  onSelect={setLinkedEvents}
  mode="multi"
  onCreate={() => setShowEventModal(true)}
  required
/>
```

**Props:**
```typescript
interface EntityLinkFieldProps {
  label: string;
  entityType: 'deal' | 'campaign' | 'event' | 'task' | 'document' | 'contact' | 'crm';
  entities: Entity[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  mode?: 'single' | 'multi'; // Default: 'multi'
  placeholder?: string;
  helpText?: string;
  onCreate?: () => void; // Shows "+ New" button
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface Entity {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string; // Emoji or icon
  metadata?: Record<string, any>; // Additional info to display
}
```

**Features:**
- Modal-based picker with search
- Type-specific icons (💰 deals, 📢 campaigns, etc.)
- Single or multi-select modes
- Badge display for selected items
- Optional "Create New" button
- Metadata display in selection list
- Clear all functionality

**Entity Type Icons:**
- `deal`: 💰
- `campaign`: 📢
- `event`: 📅
- `task`: ✓
- `document`: 📄
- `contact`: 👤
- `crm`: 🏢

---

### 2. ProductServicePicker

Multi-select widget for choosing products and services with type filtering and pricing display.

**Import:**
```typescript
import { ProductServicePicker } from '../components/domain/ProductServicePicker';
```

**Use Cases:**
- Select products for a deal
- Link services to revenue transactions
- Choose items for marketing campaigns
- Build product bundles

**Example:**
```typescript
// All types
<ProductServicePicker
  label="Promoted Products/Services"
  productsServices={allProducts}
  selectedIds={selectedProductIds}
  onSelect={setSelectedProductIds}
  helpText="Select products this campaign will promote"
/>

// Filter by type
<ProductServicePicker
  label="SaaS Products"
  productsServices={allProducts}
  selectedIds={selectedIds}
  onSelect={setSelectedIds}
  filterType="saas"
  showInactive={false}
/>

// With create button
<ProductServicePicker
  productsServices={products}
  selectedIds={selected}
  onSelect={setSelected}
  onCreateNew={() => setShowProductModal(true)}
/>
```

**Props:**
```typescript
interface ProductServicePickerProps {
  label?: string; // Default: "Products/Services"
  productsServices: ProductService[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  filterType?: 'physical' | 'digital' | 'saas' | 'consulting' | 'package' | 'subscription' | 'booking' | 'all'; // Default: 'all'
  showInactive?: boolean; // Default: false
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onCreateNew?: () => void;
}
```

**Features:**
- Multi-select with checkboxes
- Filter by product type (physical, digital, saas, consulting, subscription, booking)
- Search by name, description, or category
- Shows pricing and category
- Active/inactive filtering
- Total value calculation
- Selected items summary
- Type-specific icons

**Type Icons:**
- `physical`: 📦
- `digital`: 💿
- `saas`: ☁️
- `consulting`: 🔧
- `subscription`: 🔄
- `booking`: 📅
- `package`: 📋

---

### 3. CRMContactSelector

Widget for searching and selecting contacts with CRM company filtering.

**Import:**
```typescript
import { CRMContactSelector } from '../components/domain/CRMContactSelector';
```

**Use Cases:**
- Select meeting attendees
- Assign contacts to deals
- Link contacts to campaigns
- Associate contacts with tasks

**Example:**
```typescript
// Multi-select for meeting attendees
<CRMContactSelector
  label="Meeting Attendees"
  crmItems={crmItems}
  contacts={contacts}
  selectedContactIds={attendeeIds}
  onSelectContacts={setAttendeeIds}
  mode="multi"
  helpText="Select all meeting participants"
/>

// Single-select for deal primary contact
<CRMContactSelector
  label="Primary Contact"
  crmItems={crmItems}
  contacts={contacts}
  selectedContactIds={primaryContactId ? [primaryContactId] : []}
  onSelectContacts={ids => setPrimaryContactId(ids[0])}
  mode="single"
  required
/>

// Filter by CRM type
<CRMContactSelector
  label="Investor Contacts"
  crmItems={crmItems}
  contacts={contacts}
  selectedContactIds={selected}
  onSelectContacts={setSelected}
  filterByCrmType="investor"
/>

// With create button
<CRMContactSelector
  crmItems={crmItems}
  contacts={contacts}
  selectedContactIds={selected}
  onSelectContacts={setSelected}
  onCreateNew={() => setShowContactModal(true)}
/>
```

**Props:**
```typescript
interface CRMContactSelectorProps {
  label?: string; // Default: "Contacts"
  crmItems?: CRMItem[];
  contacts?: Contact[];
  selectedContactIds: string[];
  onSelectContacts: (ids: string[]) => void;
  mode?: 'single' | 'multi'; // Default: 'multi'
  filterByCrmType?: 'investor' | 'customer' | 'partner' | 'all'; // Default: 'all'
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onCreateNew?: () => void;
}
```

**Features:**
- Search by name, email, title, or phone
- Filter by CRM type (investors, customers, partners)
- Shows company affiliation
- Displays contact details (email, phone)
- Single or multi-select modes
- Badge display with company name
- Clear all functionality
- Type-specific filtering buttons

---

### 4. CurrencyInput

Specialized input for currency amounts with formatting, validation, and symbol display.

**Import:**
```typescript
import { CurrencyInput } from '../components/domain/CurrencyInput';
```

**Use Cases:**
- Deal values
- Revenue amounts
- Expense entries
- Budget fields
- Pricing inputs

**Example:**
```typescript
// Basic usage
<CurrencyInput
  label="Deal Value"
  value={dealValue}
  onChange={setDealValue}
  required
/>

// With constraints
<CurrencyInput
  label="Discount Amount"
  value={discount}
  onChange={setDiscount}
  min={0}
  max={totalPrice}
  helpText="Cannot exceed total price"
/>

// Different currency
<CurrencyInput
  label="Budget"
  value={budget}
  onChange={setBudget}
  currency="EUR"
  currencySymbol="€"
  locale="de-DE"
/>

// Allow negative (for adjustments)
<CurrencyInput
  label="Adjustment"
  value={adjustment}
  onChange={setAdjustment}
  allowNegative
  showSymbol={false}
/>

// In a form with error
<CurrencyInput
  name="campaignBudget"
  label="Campaign Budget"
  value={budget}
  onChange={setBudget}
  error={errors.budget}
  required
/>
```

**Props:**
```typescript
interface CurrencyInputProps {
  name?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  currency?: string; // Default: 'USD'
  currencySymbol?: string; // Default: '$'
  min?: number; // Default: 0
  max?: number;
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowNegative?: boolean; // Default: false
  showSymbol?: boolean; // Default: true
  locale?: string; // Default: 'en-US'
}
```

**Features:**
- Automatic thousand separators (1,234.56)
- Decimal handling (always 2 decimals)
- Currency symbol display ($, €, £, etc.)
- Raw number input when focused
- Formatted display when blurred
- Min/max validation
- Keyboard-only input (blocks non-numeric keys)
- Intl.NumberFormat for proper localization
- Live preview of formatted value

**Behavior:**
- **On Focus**: Shows raw number for easy editing
- **On Blur**: Formats with separators and decimals
- **On Change**: Validates input, allows only numbers
- **On Submit**: Returns clean numeric value

---

### 5. DocumentPicker

Unified picker for GTM documents and templates with search, filtering, and metadata display.

**Import:**
```typescript
import { DocumentPicker } from '../components/domain/DocumentPicker';
```

**Use Cases:**
- Link documents to campaigns
- Attach templates to tasks
- Associate docs with deals
- Reference materials in events

**Example:**
```typescript
// All documents
<DocumentPicker
  label="Campaign Documents"
  documents={allDocs}
  selectedDocIds={linkedDocIds}
  onSelect={setLinkedDocIds}
  helpText="Attach relevant campaign materials"
/>

// Templates only
<DocumentPicker
  label="Select Template"
  documents={allDocs}
  selectedDocIds={templateId ? [templateId] : []}
  onSelect={ids => setTemplateId(ids[0])}
  mode="single"
  filterByType="template"
/>

// Filter by document type
<DocumentPicker
  label="Pitch Decks"
  documents={allDocs}
  selectedDocIds={selected}
  onSelect={setSelected}
  filterByDocType={['pitch_deck', 'presentation']}
/>

// With create button
<DocumentPicker
  documents={docs}
  selectedDocIds={selected}
  onSelect={setSelected}
  onCreateNew={() => setShowDocModal(true)}
/>
```

**Props:**
```typescript
interface DocumentPickerProps {
  label?: string; // Default: "Documents"
  documents: GTMDocMetadata[];
  selectedDocIds: string[];
  onSelect: (ids: string[]) => void;
  mode?: 'single' | 'multi'; // Default: 'multi'
  filterByType?: 'template' | 'user_doc' | 'all'; // Default: 'all'
  filterByDocType?: string[]; // Array of doc types to include
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onCreateNew?: () => void;
  showPreview?: boolean; // Future: show doc preview
}
```

**Features:**
- Search by title and tags
- Filter templates vs user documents
- Filter by document type
- Shows document metadata (type, visibility, tags)
- Updated date display
- Template badge
- Private badge for private docs
- Sorted: templates first, then by date
- Multi or single-select modes
- Tag display (first 3 tags + count)

**Document Type Icons:**
From `constants.ts`:
- Pitch Deck: 📊
- Investor Update: 📈
- One Pager: 📄
- Business Plan: 📋
- Financial Model: 💰
- etc.

---

## Integration Examples

### Deal Form with Multiple Widgets

```typescript
import { Form, FormField, FormSection } from '../components/forms';
import { EntityLinkField } from '../components/domain/EntityLinkField';
import { ProductServicePicker } from '../components/domain/ProductServicePicker';
import { CRMContactSelector } from '../components/domain/CRMContactSelector';
import { CurrencyInput } from '../components/domain/CurrencyInput';
import { z } from 'zod';

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  expectedCloseDate: z.string().optional(),
});

export function DealForm({ deal, crmItems, contacts, products, campaigns, onSave }) {
  const [dealValue, setDealValue] = useState(deal?.value || 0);
  const [linkedCampaigns, setLinkedCampaigns] = useState<string[]>(deal?.linkedCampaigns || []);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(deal?.productServiceIds || []);
  const [primaryContactId, setPrimaryContactId] = useState<string[]>(deal?.contactId ? [deal.contactId] : []);

  const campaignEntities = campaigns.map(c => ({
    id: c.id,
    title: c.title,
    subtitle: c.status,
    icon: '📢',
  }));

  const handleSubmit = async (data: z.infer<typeof dealSchema>) => {
    await onSave({
      ...data,
      value: dealValue,
      linkedCampaigns,
      productServiceIds: selectedProducts,
      contactId: primaryContactId[0],
    });
  };

  return (
    <Form schema={dealSchema} defaultValues={deal} onSubmit={handleSubmit}>
      <FormSection title="Basic Information">
        <FormField name="title" label="Deal Title" required />
        <SelectField name="stage" label="Stage" required options={stageOptions} />
        <FormField name="expectedCloseDate" label="Expected Close Date" type="date" />
      </FormSection>

      <FormSection title="Financial Details">
        <CurrencyInput
          label="Deal Value"
          value={dealValue}
          onChange={setDealValue}
          required
          helpText="Total value of this opportunity"
        />
        
        <ProductServicePicker
          label="Products/Services"
          productsServices={products}
          selectedIds={selectedProducts}
          onSelect={setSelectedProducts}
        />
      </FormSection>

      <FormSection title="Relationships">
        <CRMContactSelector
          label="Primary Contact"
          crmItems={crmItems}
          contacts={contacts}
          selectedContactIds={primaryContactId}
          onSelectContacts={setPrimaryContactId}
          mode="single"
          required
        />
        
        <EntityLinkField
          label="Related Campaigns"
          entityType="campaign"
          entities={campaignEntities}
          selectedIds={linkedCampaigns}
          onSelect={setLinkedCampaigns}
        />
      </FormSection>

      <Button type="submit" variant="primary">
        Save Deal
      </Button>
    </Form>
  );
}
```

### Campaign Form Integration

```typescript
export function CampaignForm() {
  const [budget, setBudget] = useState(0);
  const [actualSpend, setActualSpend] = useState(0);
  const [linkedProducts, setLinkedProducts] = useState<string[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);

  return (
    <Form schema={campaignSchema} defaultValues={...} onSubmit={...}>
      <FormSection title="Budget">
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Budget"
            value={budget}
            onChange={setBudget}
          />
          <CurrencyInput
            label="Actual Spend"
            value={actualSpend}
            onChange={setActualSpend}
          />
        </div>
        {budget > 0 && actualSpend > 0 && (
          <div className="p-3 bg-gray-100 border-2 border-black">
            <p className="font-semibold">
              Utilization: {((actualSpend / budget) * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </FormSection>

      <ProductServicePicker
        label="Promoted Products"
        productsServices={allProducts}
        selectedIds={linkedProducts}
        onSelect={setLinkedProducts}
      />

      <DocumentPicker
        label="Campaign Materials"
        documents={allDocs}
        selectedDocIds={linkedDocs}
        onSelect={setLinkedDocs}
      />

      <CRMContactSelector
        label="Target Contacts"
        crmItems={crmItems}
        contacts={allContacts}
        selectedContactIds={contacts}
        onSelectContacts={setContacts}
      />
    </Form>
  );
}
```

---

## Common Patterns

### Controlled State Outside Form

Domain widgets manage their own state and communicate via callbacks. This is intentional for flexibility:

```typescript
// Widget state is separate from form state
const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

// In form submission, merge widget state
const handleSubmit = async (formData: FormData) => {
  const fullData = {
    ...formData,
    productServiceIds: selectedProducts, // From widget
  };
  await saveData(fullData);
};
```

### Validation with Domain Widgets

Since widgets are outside the form schema, validate separately:

```typescript
const handleSubmit = async (formData: FormData) => {
  // Validate widget selections
  if (selectedProducts.length === 0) {
    setError('At least one product is required');
    return;
  }

  if (dealValue <= 0) {
    setError('Deal value must be positive');
    return;
  }

  // Proceed with save
  await saveData({
    ...formData,
    productServiceIds: selectedProducts,
    value: dealValue,
  });
};
```

### Conditional Rendering

Show widgets based on form state:

```typescript
<Form schema={schema} defaultValues={...} onSubmit={...}>
  {({ watch }) => {
    const dealType = watch('category');
    
    return (
      <>
        <FormField name="title" label="Title" />
        <SelectField name="category" label="Category" options={...} />
        
        {dealType === 'customer_deal' && (
          <ProductServicePicker
            productsServices={products}
            selectedIds={selectedProducts}
            onSelect={setSelectedProducts}
          />
        )}
        
        {dealType === 'investment' && (
          <CurrencyInput
            label="Investment Amount"
            value={investmentAmount}
            onChange={setInvestmentAmount}
          />
        )}
      </>
    );
  }}
</Form>
```

---

## Best Practices

### Do's ✅
- **Keep widget state separate** - Don't put in Zod schema
- **Validate before submission** - Check required selections
- **Show selection summary** - Use built-in count displays
- **Provide onCreate handlers** - Enable quick entity creation
- **Use appropriate modes** - Single for primary, multi for associations
- **Add helpful helpText** - Guide users on what to select
- **Clear on cancel** - Reset widget state when modal closes

### Don'ts ❌
- **Don't put widget data in schema** - Keep as separate state
- **Don't skip required validation** - Validate before save
- **Don't forget to pass all entities** - Ensure data is loaded
- **Don't use for simple selects** - Use SelectField for < 10 options
- **Don't ignore loading states** - Show loading while fetching entities
- **Don't forget empty states** - Handle no results gracefully
- **Don't skip accessibility** - Widgets include ARIA support

---

## Performance Considerations

### Large Entity Lists

For 100+ entities, consider pagination or virtual scrolling:

```typescript
// Filter entities before passing to widget
const recentCampaigns = campaigns
  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  .slice(0, 100);

<EntityLinkField
  entities={recentCampaigns}
  {...props}
/>
```

### Memoization

Memo entity transformation:

```typescript
const campaignEntities = useMemo(
  () => campaigns.map(c => ({
    id: c.id,
    title: c.title,
    subtitle: `${c.type} • ${c.status}`,
    icon: '📢',
  })),
  [campaigns]
);
```

### Lazy Loading

Load data only when modal opens:

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [entities, setEntities] = useState<Entity[]>([]);

useEffect(() => {
  if (isModalOpen && entities.length === 0) {
    loadEntities().then(setEntities);
  }
}, [isModalOpen]);
```

---

## Troubleshooting

### Widget not showing selected items
Ensure `selectedIds` array contains valid IDs that exist in the entities array.

### Search not working
Check that entity objects have `title` and optional `subtitle` fields populated.

### Currency not formatting
Verify `value` is a number, not a string. Use `parseFloat()` if needed.

### Contact filtering not working
Ensure CRM items array is passed and contacts have valid `crmItemId` fields.

### Document picker empty
Check that documents array contains GTMDocMetadata objects with required fields.

---

## Migration from Inline Selects

### Before (Inline Select):
```typescript
<select
  value={selectedProduct}
  onChange={e => setSelectedProduct(e.target.value)}
>
  {products.map(p => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
</select>
```

### After (Domain Widget):
```typescript
<ProductServicePicker
  productsServices={products}
  selectedIds={selectedProducts}
  onSelect={setSelectedProducts}
/>
```

**Benefits:**
- Search functionality
- Multi-select support
- Pricing display
- Category filtering
- Better mobile UX
- Consistent styling
