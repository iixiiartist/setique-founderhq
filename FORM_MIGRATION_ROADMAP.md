# Form Migration Roadmap

## Status: 1/15 Complete ✅

**Completed**: Campaign Form Modal (-18% code, +type safety, +validation)

## Migration Strategy

Each form migration follows this proven pattern from CampaignFormModal:

1. **Create Zod schema** with all validation rules
2. **Replace useState** with Form component + defaultValues  
3. **Replace inputs** with FormField/SelectField
4. **Use FormSection** to group related fields
5. **Replace buttons** with Button component
6. **Use domain widgets** where applicable
7. **Test** validation, submission, error handling

## Remaining Migrations (Priority Order)

### High Priority (Complex, High Impact)

#### 1. CalendarEventForm.tsx (650+ lines) 🔥
**Location**: `components/calendar/CalendarEventForm.tsx`
**Complexity**: High - Three form types in one (task/meeting/crm-action)
**Impact**: Used across calendar, creates tasks, meetings, CRM actions
**Domain Widgets Needed**:
- CRMContactSelector (for meetings)
- None for tasks (already has SubtaskManager)

**Migration Pattern**:
```typescript
// Three schemas for three event types
const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([...]),
  priority: z.enum(['Low', 'Medium', 'High']),
  dueDate: z.string().min(1),
  dueTime: z.string().optional(),
  assignedTo: z.string().optional(),
});

const meetingSchema = z.object({
  crmCollection: z.enum(['investors', 'customers', 'partners']),
  crmItemId: z.string().min(1),
  contactId: z.string().optional(),
  meetingTitle: z.string().min(1),
  attendees: z.string().min(1),
  meetingSummary: z.string().optional(),
  dueDate: z.string().min(1),
  dueTime: z.string().optional(),
});

const crmActionSchema = z.object({
  crmCollection: z.enum(['investors', 'customers', 'partners']),
  crmItemId: z.string().min(1),
  nextAction: z.string().min(1),
  dueDate: z.string().min(1),
  dueTime: z.string().optional(),
});

// Use discriminated union
const calendarEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task'), ...taskSchema }),
  z.object({ type: z.literal('meeting'), ...meetingSchema }),
  z.object({ type: z.literal('crm-action'), ...crmActionSchema }),
]);
```

**Benefits**:
- Centralized validation for all three types
- Type-safe form data
- Eliminate ~150 lines of useState
- Better error messages

---

#### 2. FinancialsTab.tsx - Revenue Form (200+ lines) 💰
**Location**: `components/FinancialsTab.tsx` (lines ~320-550)
**Complexity**: Medium - Embedded in larger component
**Impact**: Core financial tracking feature
**Domain Widgets Needed**: None (simple numeric inputs)

**Current State** (lines 325-327):
```typescript
const [form, setForm] = useState<Omit<FinancialLog, 'id'>>(getDefaultFinancialLogForm);
```

**Migration Pattern**:
```typescript
const financialLogSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  mrr: z.number().min(0, 'MRR must be positive').default(0),
  gmv: z.number().min(0, 'GMV must be positive').default(0),
  signups: z.number().int().min(0, 'Signups must be positive').default(0),
});

// In component:
<Form schema={financialLogSchema} defaultValues={...} onSubmit={handleLog}>
  <FormField name="date" label="Date" type="date" required />
  <FormField name="mrr" label="MRR ($)" type="number" min={0} step={0.01} />
  <FormField name="gmv" label="GMV ($)" type="number" min={0} step={0.01} />
  <FormField name="signups" label="Signups" type="number" min={0} step={1} />
  <Button type="submit">Log Financials</Button>
</Form>
```

**Benefits**:
- Eliminate manual sanitization (sanitizedForm logic)
- Built-in numeric validation
- Type-safe defaults

---

#### 3. FinancialsTab.tsx - Expense Form (200+ lines) 💳
**Location**: `components/FinancialsTab.tsx` (lines ~327-550)
**Complexity**: Medium
**Impact**: Expense tracking, used frequently
**Domain Widgets Needed**:
- **CurrencyInput** for amount field

**Current State** (line 327):
```typescript
const [expenseForm, setExpenseForm] = useState<Omit<Expense, 'id' | 'notes'>>(getDefaultExpenseForm);
```

**Migration Pattern**:
```typescript
const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(EXPENSE_CATEGORY_OPTIONS as [string, ...string[]]),
  description: z.string().min(1, 'Description is required').max(500),
});

// In component:
const [amount, setAmount] = useState(0);

<Form schema={expenseSchema} defaultValues={...} onSubmit={handleExpense}>
  <FormField name="date" label="Date" type="date" required />
  <SelectField 
    name="category" 
    label="Category" 
    options={EXPENSE_CATEGORY_OPTIONS.map(c => ({ value: c, label: c }))}
    required
  />
  <CurrencyInput
    label="Amount"
    value={amount}
    onChange={setAmount}
    required
  />
  <FormField name="description" label="Description" required />
  <Button type="submit">Log Expense</Button>
</Form>
```

**Benefits**:
- Formatted currency input with thousand separators
- Eliminate sanitizeExpenseInput function
- Built-in validation

---

### Medium Priority (Multi-Purpose Forms)

#### 4-9. InlineFormModal.tsx (800+ lines) 🎯
**Location**: `components/shared/InlineFormModal.tsx`
**Complexity**: Very High - 6 different form types in one component
**Impact**: Used everywhere for quick creation
**Forms Within**:
- Task form (lines ~230-320)
- CRM form (lines ~320-420)
- Contact form (lines ~420-520)
- Event form (lines ~520-600)
- Expense form (lines ~650-700)
- Document upload form (lines ~700-750)

**Strategy**: Break into separate components first, then migrate each

**Step 1**: Extract into separate form components
```
components/forms/
  TaskQuickAddForm.tsx
  CRMQuickAddForm.tsx
  ContactQuickAddForm.tsx
  EventQuickAddForm.tsx
  ExpenseQuickAddForm.tsx
  DocumentUploadForm.tsx
```

**Step 2**: Migrate each extracted component

**Domain Widgets Needed**:
- ExpenseQuickAddForm: **CurrencyInput**
- ContactQuickAddForm: **CRMContactSelector** pattern
- EventQuickAddForm: Share with CalendarEventForm

**Benefits**:
- Reduce InlineFormModal from 800+ to ~200 lines
- Each form component reusable independently
- Easier to test and maintain
- Consistent validation across quick-add forms

---

#### 10. ProductServiceCreateModal.tsx (600+ lines) 📦
**Location**: `components/products/ProductServiceCreateModal.tsx`
**Complexity**: Very High - Multi-step wizard
**Impact**: Product/service creation, complex pricing models
**Domain Widgets Needed**:
- **CurrencyInput** for basePrice, costOfGoods, costOfService
- Consider splitting into multiple schemas per step

**Current State** (line 53):
```typescript
const [formData, setFormData] = useState<FormData>({...35 fields});
```

**Migration Pattern**:
```typescript
// Schema per step
const step1Schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  sku: z.string().optional(),
  category: z.enum(['product', 'service']),
  type: z.enum([...ProductServiceType]),
});

const step2Schema = z.object({
  pricingModel: z.enum(['flat_rate', 'tiered', 'usage_based', 'subscription']),
  basePrice: z.number().min(0),
  currency: z.string(),
  costOfGoods: z.number().min(0).optional(),
  costOfService: z.number().min(0).optional(),
});

// etc for steps 3, 4

// Use conditional schema based on current step
const getCurrentSchema = (step: number) => { ... };
```

**Benefits**:
- Validate each step independently
- Prevent advancement with invalid data
- CurrencyInput for better UX
- Eliminate massive formData useState

---

#### 11-12. AccountManager.tsx - Add/Edit Forms (400+ lines each) 🏢
**Location**: `components/shared/AccountManager.tsx`
**Complexity**: High - Duplicate code (add + edit forms almost identical)
**Impact**: CRM account management
**Domain Widgets Needed**: None (mostly text inputs)

**Add Form** (lines ~1100-1320):
```typescript
// Lots of useState for each field
```

**Edit Form** (lines ~1320-1600):
```typescript
// Almost identical to add form
```

**Migration Pattern**:
```typescript
const crmAccountSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(200),
  contactPerson: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal('')),
  stage: z.string().optional(),
  dealSize: z.number().min(0).optional(),
  notes: z.string().max(5000).optional(),
  // ... other fields
});

// SINGLE component handles both add and edit
<CRMAccountFormModal
  isOpen={showAddModal || showEditModal}
  onClose={...}
  onSave={editingAccount ? handleEdit : handleAdd}
  editingAccount={editingAccount}
  crmType={collection}
/>
```

**Benefits**:
- Eliminate duplicate code (~400 lines saved)
- Single source of truth for validation
- Easier to maintain consistency

---

#### 13. MeetingsManager.tsx - Meeting Form (200+ lines) 📅
**Location**: `components/shared/MeetingsManager.tsx`
**Complexity**: Medium
**Impact**: Meeting creation/editing
**Domain Widgets Needed**: None

**Current State** (lines ~40-60):
```typescript
const initialFormState = { title: '', attendees: '', summary: '', date: '', time: '' };
const [form, setForm] = useState(initialFormState);
```

**Migration Pattern**:
```typescript
const meetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  attendees: z.string().min(1, 'Attendees required').max(500),
  summary: z.string().max(2000),
  date: z.string().min(1, 'Date is required'),
  time: z.string().optional(),
});

<Form schema={meetingSchema} defaultValues={...} onSubmit={handleSave}>
  <FormField name="title" label="Meeting Title" required />
  <FormField name="attendees" label="Attendees" required />
  <FormField name="summary" label="Summary" type="text" />
  <FormField name="date" label="Date" type="date" required />
  <FormField name="time" label="Time" type="time" />
  <Button type="submit">
    {editingMeeting ? 'Save Changes' : 'Create Meeting'}
  </Button>
</Form>
```

**Benefits**:
- Eliminate manual form state initialization
- Automatic reset on modal close
- Built-in date/time validation

---

#### 14. ContactDetailView.tsx - Edit Form (150+ lines) 👤
**Location**: `components/shared/ContactDetailView.tsx`
**Complexity**: Medium
**Impact**: Contact editing
**Domain Widgets Needed**: None

**Current State** (lines ~60-80):
```typescript
const [editForm, setEditForm] = useState<Contact>(contact);
const [newTaskText, setNewTaskText] = useState('');
// ... many useState for editing
```

**Migration Pattern**:
```typescript
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  // ... other contact fields
});

<Form schema={contactSchema} defaultValues={contact} onSubmit={handleSaveEdit}>
  <FormField name="name" label="Name" required />
  <FormField name="email" label="Email" type="email" />
  <FormField name="phone" label="Phone" type="tel" />
  <FormField name="title" label="Title" />
  <Button type="submit">Save Changes</Button>
</Form>
```

**Benefits**:
- Email validation built-in
- Automatic form reset
- Type-safe contact editing

---

## Migration Checklist (Per Form)

- [ ] Read existing form code, identify all fields
- [ ] Create Zod schema with appropriate validation
- [ ] Identify which domain widgets apply (CurrencyInput, EntityLinkField, etc.)
- [ ] Replace useState declarations with Form component
- [ ] Replace manual inputs with FormField/SelectField
- [ ] Replace manual buttons with Button component
- [ ] Use FormSection for grouping (if >4 fields)
- [ ] Test validation (required fields, min/max, types)
- [ ] Test submission (success + error handling)
- [ ] Test form reset on cancel/close
- [ ] Measure code reduction
- [ ] Commit with descriptive message

---

## Expected Outcomes

**Total Lines Before**: ~6,500
**Total Lines After**: ~4,500 (est.)
**Overall Reduction**: ~30%

**Additional Benefits**:
- Type safety across all forms
- Consistent validation patterns
- Better error messages
- Easier to test
- Maintainable codebase
- Faster development of new forms

---

## Automated Migration Script

Due to the large number of forms, consider creating a migration script:

```bash
#!/bin/bash
# migrate-form.sh <form-name>

FORM_NAME=$1
BACKUP_DIR="./backups/forms"

# Backup original
mkdir -p $BACKUP_DIR
cp "components/${FORM_NAME}" "${BACKUP_DIR}/${FORM_NAME}.backup"

# Run migration (placeholder - would use AST transformation)
echo "Migrating ${FORM_NAME}..."

# Test after migration
npm run type-check
npm run lint

# Commit if successful
git add "components/${FORM_NAME}"
git commit -m "feat: Migrate ${FORM_NAME} to new form system"
```

---

## Next Steps

1. **Commit current progress** ✅ (Campaign Form done)
2. **Migrate CalendarEventForm** (highest complexity, high impact)
3. **Migrate FinancialsTab forms** (high usage, straightforward)
4. **Extract + migrate InlineFormModal forms** (biggest code reduction)
5. **Migrate ProductServiceCreateModal** (complex but contained)
6. **Migrate CRM forms** (eliminate duplication)
7. **Migrate remaining forms** (meetings, contacts)
8. **Comprehensive testing**
9. **Update documentation** with migration stats
10. **Delete old backup files**

---

## Resources

- **FORM_SYSTEM.md**: Complete form system guide
- **DESIGN_SYSTEM.md**: UI primitives reference  
- **DOMAIN_WIDGETS.md**: Domain widget API docs
- **CAMPAIGN_FORM_MIGRATION_POC.md**: Proof of concept with before/after

---

## Success Metrics

- ✅ All 15 forms migrated
- ✅ 30%+ code reduction achieved
- ✅ Zero TypeScript errors
- ✅ All forms tested in production
- ✅ No regression in functionality
- ✅ Team trained on new system
