# Unit Tests

This directory contains unit tests for the FounderHQ application's business logic layer. These tests focus on data transformation and persistence operations with mocked dependencies.

## Test Suite Overview

### Coverage
- **57 tests total** covering core business logic
- Field transformation functions (bidirectional camelCase ↔ snake_case)
- Data persistence adapter methods with mocked Supabase responses
- Error handling and edge cases

### Test Files

#### `fieldTransformers.test.ts` (31 tests)
Tests for the centralized field transformation utilities that convert between database and application models.

**Database → Application Transformers:**
- `dbToTask` - Converts database task records to Task models
- `dbToMarketingItem` - Converts marketing item records
- `dbToCrmItem` - Converts CRM item records
- `dbToContact` - Converts contact records
- `dbToFinancialLog` - Converts financial log records
- Batch transformers for arrays

**Test Coverage:**
- ✅ Complete field transformations with all properties
- ✅ Null/undefined optional field handling
- ✅ Date conversions (ISO strings ↔ timestamps)
- ✅ Nested object transformations (assigned_to_profile)
- ✅ Empty string to null conversions
- ✅ Batch array transformations

**Application → Database Transformers:**
- `taskToDb` - Converts Task models to database insert/update objects
- `marketingItemToDb` - Converts MarketingItem models
- `crmItemToDb` - Converts CRM item models
- `contactToDb` - Converts Contact models

**Test Coverage:**
- ✅ Field name transformations (camelCase → snake_case)
- ✅ Undefined fields omitted from result (partial updates)
- ✅ Empty string to null conversions
- ✅ Timestamp to ISO string conversions
- ✅ Type-safe transformations

#### `dataPersistenceAdapter.test.ts` (31 tests)
Tests for the DataPersistenceAdapter with fully mocked DatabaseService and ActivityService.

**Task Operations (10 tests):**
- `createTask` - Create tasks with workspace validation
- `updateTask` - Update tasks with field transformations
- `deleteTask` - Delete task operations
- `addTaskNote` - Add notes to existing tasks

**Test Coverage:**
- ✅ Complete CRUD operations
- ✅ Field transformation integration
- ✅ Workspace ID validation
- ✅ Activity logging integration
- ✅ Error handling (database, network, permission errors)
- ✅ Null/undefined handling

**CRM Operations (6 tests):**
- `createCrmItem` - Create CRM items with type mapping
- `updateCrmItem` - Update CRM items with type-specific fields
- `deleteCrmItem` - Delete CRM item operations

**Test Coverage:**
- ✅ Collection name to type mapping (investors → 'investor')
- ✅ Type-specific fields (checkSize, dealValue, opportunity)
- ✅ Field transformations (nextAction → next_action)
- ✅ Null optional field handling

**Contact Operations (4 tests):**
- `createContact` - Create contacts with CRM item association
- `updateContact` - Update contact information
- `addContactNote` - Add notes to contacts

**Marketing Operations (4 tests):**
- `createMarketingItem` - Create marketing items
- `updateMarketingItem` - Update marketing items
- `deleteMarketingItem` - Delete marketing items

**Test Coverage:**
- ✅ Default status assignment ('Planned')
- ✅ Due date/time transformations
- ✅ Assignment field transformations

**Financial Operations (4 tests):**
- `logFinancials` - Create financial logs
- `updateFinancialLog` - Update financial logs with partial data
- `deleteFinancialLog` - Delete financial logs

**Test Coverage:**
- ✅ Zero value handling
- ✅ Partial update support

**Error Handling (3 tests):**
- Network errors
- Validation errors
- Permission errors

## Running Tests

### Run All Unit Tests
```bash
npm run test -- tests/unit
```

### Run Specific Test File
```bash
npm run test -- tests/unit/fieldTransformers.test.ts
npm run test -- tests/unit/dataPersistenceAdapter.test.ts
```

### Run with Coverage
```bash
npm run test:coverage -- tests/unit
```

### Watch Mode (for development)
```bash
npm run test -- tests/unit --watch
```

### UI Mode (interactive test runner)
```bash
npm run test:ui
```

## Test Configuration

Tests are configured in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'node',
  setupFiles: (process.env.TEST_TYPE === 'rls') ? ['./tests/rls/setup.ts'] : [],
  testMatch: ['**/tests/**/*.test.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['lib/**/*.ts', 'hooks/**/*.ts'],
    exclude: ['**/*.d.ts', '**/*.test.ts', '**/node_modules/**'],
  },
}
```

## Mocking Strategy

### DatabaseService Mock
All database operations are mocked using Vitest's `vi.mock()`:

```typescript
vi.mock('../../lib/services/database', () => ({
  DatabaseService: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    // ... other methods
  },
}));
```

### ActivityService Mock
Activity logging is mocked to verify it's called correctly:

```typescript
vi.mock('../../lib/services/activityService', () => ({
  logActivity: vi.fn(),
}));
```

### Mock Setup
Each test file uses `beforeEach` to clear all mocks:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Writing New Tests

### Test Structure
```typescript
describe('Feature Name', () => {
  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange: Setup mocks and test data
      vi.mocked(DatabaseService.someMethod).mockResolvedValue({
        data: mockData,
        error: null,
      });

      // Act: Call the method under test
      const result = await Adapter.someMethod(params);

      // Assert: Verify results and mock calls
      expect(result.data).toEqual(expectedData);
      expect(DatabaseService.someMethod).toHaveBeenCalledWith(expectedParams);
    });
  });
});
```

### Best Practices

1. **Test One Thing**: Each test should verify a single behavior
2. **Clear Test Names**: Use descriptive names that explain what's being tested
3. **AAA Pattern**: Arrange, Act, Assert - structure tests clearly
4. **Mock Returns**: Always mock both success and error cases
5. **Verify Calls**: Check that mocked functions are called with correct arguments
6. **Edge Cases**: Test null, undefined, empty strings, and boundary conditions

### Example: Adding a New Test

```typescript
describe('createDocument', () => {
  it('should create a document with file metadata', async () => {
    // Arrange
    const mockDoc = {
      id: 'doc-123',
      name: 'proposal.pdf',
      mime_type: 'application/pdf',
    };

    vi.mocked(DatabaseService.createDocument).mockResolvedValue({
      data: mockDoc,
      error: null,
    });

    // Act
    const result = await DataPersistenceAdapter.uploadDocument(
      'user-123',
      'workspace-001',
      {
        name: 'proposal.pdf',
        mimeType: 'application/pdf',
        content: 'base64content',
        module: 'crm',
      }
    );

    // Assert
    expect(result.data).toEqual(mockDoc);
    expect(DatabaseService.createDocument).toHaveBeenCalledWith(
      'user-123',
      'workspace-001',
      expect.objectContaining({
        name: 'proposal.pdf',
        mime_type: 'application/pdf',
      })
    );
  });
});
```

## Troubleshooting

### Tests Fail with "Missing Supabase environment variables"
Unit tests should NOT require Supabase credentials. If you see this error, the test is incorrectly importing the RLS setup file. Unit tests mock all Supabase interactions.

**Solution**: Ensure `TEST_TYPE` is not set to 'rls' when running unit tests.

### Mock Not Working
If a mock isn't being applied:
1. Ensure `vi.mock()` is called at the top level (not inside describe/it)
2. Check that the import path in the mock matches the actual import
3. Clear mocks with `vi.clearAllMocks()` in `beforeEach()`

### Type Errors in Tests
If TypeScript complains about mocked functions:
```typescript
// Use vi.mocked() for proper typing
vi.mocked(DatabaseService.createTask).mockResolvedValue({...});
```

## Coverage Goals

Target coverage for business logic:
- **Transformers**: 100% (pure functions, easy to test)
- **Adapters**: 80% (focus on main paths and error handling)
- **Hooks**: 70% (React hooks harder to unit test, prefer E2E)

Current coverage:
- ✅ Field transformers: Complete coverage
- ✅ DataPersistenceAdapter: All CRUD operations covered
- ⏳ Gamification calculations: TODO
- ⏳ Validation utilities: TODO

## CI Integration

Unit tests run automatically in CI:
```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test -- tests/unit --run
```

Tests must pass before merging to main branch.

## Related Documentation

- [E2E Tests](../e2e/README.md) - End-to-end testing with Playwright
- [RLS Tests](../rls/README.md) - Row-level security policy testing
- [Field Transformers](../../lib/utils/fieldTransformers.ts) - Source code
- [Data Persistence Adapter](../../lib/services/dataPersistenceAdapter.ts) - Source code

## Future Enhancements

- [ ] Add tests for gamification calculations
- [ ] Add tests for validation utilities
- [ ] Add tests for React Query hooks (using React Testing Library)
- [ ] Add performance benchmarks for transformers
- [ ] Add mutation testing to verify test quality
