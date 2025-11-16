# Testing Unified Accounts Tab - Quick Guide

## ✅ Phase 3 Complete - Ready for Testing!

The unified Accounts tab has been successfully implemented and integrated. This guide will help you test all functionality.

---

## 🚀 How to Access

### Option 1: Feature Flag Enabled (Default)
The unified Accounts tab is **enabled by default**. Just run the app:

```bash
npm run dev
```

Navigate to: **✨ Accounts** tab in the sidebar

### Option 2: Toggle Feature Flag
To switch between old and new UI:

**Disable Unified Accounts (Revert to Old 3-Tab UI):**
```bash
# Create/edit .env.local
echo "VITE_UNIFIED_ACCOUNTS=false" >> .env.local
npm run dev
```

**Enable Unified Accounts:**
```bash
# Create/edit .env.local
echo "VITE_UNIFIED_ACCOUNTS=true" >> .env.local
npm run dev
```

---

## 🧪 Testing Checklist

### 1. Basic Navigation ✅
- [ ] Sidebar shows "✨ Accounts" tab
- [ ] Click Accounts tab → Should load without errors
- [ ] Tab loads with TabLoadingFallback spinner
- [ ] Old tabs (Investors, Customers, Partners) should be HIDDEN
- [ ] Switch to other tabs and back → Accounts tab maintains state

### 2. Type Filtering 🎯
- [ ] Click "All" button → Shows all accounts with total count
- [ ] Click "💰 Investors" → Shows only investors with count
- [ ] Click "🛒 Customers" → Shows only customers with count
- [ ] Click "🤝 Partners" → Shows only partners with count
- [ ] Counts update correctly for each type
- [ ] Active filter button is highlighted (bg-blue-500)

### 3. Search Functionality 🔍
- [ ] Type in search box → Should filter results instantly
- [ ] Search by company name → Finds matches
- [ ] Search by status → Finds matches
- [ ] Search by contact name → Finds parent account
- [ ] Clear search → Shows all filtered items again
- [ ] Search works across all types when "All" is selected
- [ ] Search respects type filter when specific type selected

### 4. View Switching 📋
- [ ] Default view is "Accounts" (📋 highlighted)
- [ ] Click "👤 Contacts" → Shows contact list
- [ ] Click "📅 Follow-ups" → Shows items with next actions
- [ ] Click "💰 Deals" → Shows deal pipeline
- [ ] Switch between views → State is maintained
- [ ] Each view shows appropriate content

### 5. Account Management 🏢

#### Create New Account
- [ ] Click "Create Account" button
- [ ] Form opens with all fields
- [ ] Can select type (Investor, Customer, Partner)
- [ ] Type-specific fields appear based on selection:
  - Investor: Check Size field
  - Customer: Deal Value field
  - Partner: Opportunity field
- [ ] Fill in required fields (company name, status)
- [ ] Submit form → Account appears immediately in list
- [ ] New account has correct type icon

#### View Account Details
- [ ] Click on any account → Detail view opens
- [ ] Shows all account information
- [ ] Shows associated contacts
- [ ] Shows tasks linked to account
- [ ] Shows next action (if set)
- [ ] Can navigate back to list

#### Update Account
- [ ] Open account detail view
- [ ] Click "Edit" button
- [ ] Modify fields (company name, status, etc.)
- [ ] Save changes → Updates reflected immediately
- [ ] Changes persist after navigating away and back

#### Delete Account
- [ ] Open account detail view
- [ ] Click "Delete" button
- [ ] Confirmation modal appears
- [ ] Confirm deletion → Account removed from list
- [ ] Toast notification appears
- [ ] Deleted account no longer appears in any view

#### Assign Account
- [ ] Open account detail view
- [ ] Click "Assign To" dropdown
- [ ] Select workspace member
- [ ] Assignment saved immediately
- [ ] Assigned user shows in account card

### 6. Contact Management 👤

#### View Contacts
- [ ] Switch to "Contacts" view
- [ ] All contacts from all account types shown
- [ ] Each contact shows parent company name
- [ ] Contact type icon matches parent type

#### Create Contact
- [ ] Click "Add Contact" button
- [ ] Select parent account or create new
- [ ] Fill in contact details (name, email, phone, title)
- [ ] Submit → Contact appears in list
- [ ] Contact linked to correct parent account

#### View Contact Details
- [ ] Click on contact → Detail view opens
- [ ] Shows contact information
- [ ] Shows parent account info
- [ ] Shows tasks linked to contact
- [ ] Can schedule meeting with contact

#### Update/Delete Contact
- [ ] Edit contact details → Changes saved
- [ ] Delete contact → Confirmation + removal
- [ ] Parent account still exists after contact deletion

### 7. Follow-Ups Manager 📅
- [ ] Switch to "Follow-ups" view
- [ ] Shows all accounts with next actions
- [ ] Items sorted by next action date
- [ ] Overdue items highlighted in red
- [ ] Can filter by priority
- [ ] Can filter by assignment (My items, All, Unassigned)
- [ ] Can show/hide completed items
- [ ] Click on item → Opens account detail view

### 8. Deals Integration 💰
- [ ] Switch to "Deals" view
- [ ] Shows deal pipeline
- [ ] Can create new deal
- [ ] Can link deal to any account type (investor, customer, partner)
- [ ] Deal stages work correctly
- [ ] Can move deals between stages
- [ ] Can update deal value
- [ ] Can close deal (Won/Lost)

### 9. Cross-Module Integration 🔗

#### Calendar Integration
- [ ] Go to Calendar tab
- [ ] Next actions from all CRM types appear
- [ ] Can create meeting from calendar
- [ ] Meeting can invite contacts from any account type
- [ ] Calendar events link back to accounts

#### Products & Services
- [ ] Create deal in Accounts tab
- [ ] Link product/service to deal
- [ ] Product appears in deal details
- [ ] Pricing calculates correctly
- [ ] Can create product bundle

#### Task Management
- [ ] Create task on account (any type)
- [ ] Task appears in account detail view
- [ ] Task appears in "All Tasks" list with correct type
- [ ] Can filter tasks by CRM type
- [ ] Task assignments work
- [ ] Task completion updates immediately

#### Document Linking
- [ ] Open account detail view
- [ ] Attach document to account
- [ ] Document appears in account's document list
- [ ] Can view/download document
- [ ] Document visible in Documents tab

### 10. Performance Testing ⚡
- [ ] Tab loads in <2 seconds
- [ ] Type filtering is instant
- [ ] Search results appear instantly (<100ms)
- [ ] No lag when switching views
- [ ] No memory leaks (check browser DevTools)
- [ ] Console shows no errors

### 11. Data Consistency 🔄
- [ ] Create account in Accounts tab
- [ ] Disable feature flag (revert to old UI)
- [ ] Check Investors/Customers/Partners tabs → New account appears
- [ ] Update account in old UI
- [ ] Re-enable feature flag
- [ ] Check Accounts tab → Changes reflected
- [ ] **Confirms both UIs use same database**

### 12. Error Handling 🛡️
- [ ] Network error → Shows error message
- [ ] Create account with missing required field → Validation error
- [ ] Delete non-existent account → Handles gracefully
- [ ] Console shows no unhandled errors
- [ ] Error boundaries catch component errors

---

## 🐛 Known Limitations (To Be Fixed in Phase 4-5)

### AI Assistant (Phase 4 - Not Yet Updated)
- ⚠️ AI assistant still uses old split arrays
- ⚠️ AI filtering by type may not work correctly
- ⚠️ AI context switching needs update
- **Fix:** Phase 4 will update assistantConfig.ts

### Untested Integrations (Phase 5 - Pending Testing)
- ⚠️ Marketing campaign attribution
- ⚠️ Financial forecasting with CRM data
- ⚠️ Advanced reporting/analytics
- ⚠️ Export/import functionality
- **Fix:** Phase 5 integration testing will verify

---

## 🎯 Expected Results

### What Should Work ✅
- All account CRUD operations (Create, Read, Update, Delete)
- Type filtering (All, Investors, Customers, Partners)
- Cross-type search
- View switching (Accounts, Contacts, Follow-ups, Deals)
- Contact management
- Task creation and management
- Deal creation and linking
- Calendar integration (next actions appear)
- Product/service linking to deals
- Document attachment
- Workspace member assignments
- Real-time updates (no page refresh needed)

### What's Different from Old UI 🆕
- **Navigation:** Single "Accounts" tab instead of 3 tabs
- **Filtering:** Type buttons instead of separate tabs
- **Search:** Unified search across all types
- **Views:** Multiple views in one tab
- **Performance:** Faster (single data load)
- **UX:** More consistent across types

---

## 🔍 How to Report Issues

### If You Find a Bug:

1. **Check Console:** Open browser DevTools (F12) → Console tab
2. **Note Steps:** Write down exact steps to reproduce
3. **Take Screenshot:** Capture the issue
4. **Check Feature Flag:** Verify VITE_UNIFIED_ACCOUNTS setting
5. **Try Rollback:** Disable feature flag → Does issue persist?

### Bug Report Template:
```markdown
**Issue:** [Brief description]

**Steps to Reproduce:**
1. Go to Accounts tab
2. Click [button]
3. Error occurs

**Expected:** [What should happen]
**Actual:** [What actually happens]

**Console Errors:** [Copy any error messages]
**Feature Flag:** ui.unified-accounts = [true/false]
**Browser:** [Chrome 120, Firefox 121, etc.]

**Additional Context:** [Screenshots, etc.]
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. **Phase 4:** Update AI assistant integration
2. **Phase 5:** Complete integration testing
3. **Deploy to Staging:** Test with real data
4. **User Acceptance Testing:** Gather feedback
5. **Production Rollout:** Enable for all users

### If Issues Found ❌
1. **Document Issues:** Use bug report template above
2. **Prioritize:** Critical bugs first
3. **Fix Issues:** Address blocking issues
4. **Retest:** Verify fixes work
5. **Continue:** Resume testing checklist

---

## 🎛️ Quick Rollback (If Needed)

### Emergency Rollback
```bash
# Disable unified accounts immediately
echo "VITE_UNIFIED_ACCOUNTS=false" >> .env.local
npm run dev
```

Result: Instantly reverts to old 3-tab system (no data loss, no code changes needed)

### Git Rollback
```bash
# Revert just the integration (keeps type system)
git revert 5907f5f

# Full rollback (removes everything)
git revert 5907f5f 4fcbf05
```

---

## 📊 Test Tracking

Use this checklist to track your testing progress:

```
Phase 3 Testing Progress:
├── Basic Navigation: [ ]
├── Type Filtering: [ ]
├── Search Functionality: [ ]
├── View Switching: [ ]
├── Account Management: [ ]
├── Contact Management: [ ]
├── Follow-Ups Manager: [ ]
├── Deals Integration: [ ]
├── Cross-Module Integration: [ ]
├── Performance Testing: [ ]
├── Data Consistency: [ ]
└── Error Handling: [ ]

Issues Found: [List here]
Tests Passed: [X/12]
Ready for Phase 4: [Yes/No]
```

---

## 🎉 Success Criteria

### Phase 3 is considered successful if:
- ✅ All 12 test categories pass
- ✅ No critical bugs found
- ✅ Performance is equal or better than old UI
- ✅ Data consistency maintained between old and new UI
- ✅ No console errors during normal operation
- ✅ Feature flag toggle works correctly
- ✅ Rollback can be performed instantly

---

**Happy Testing!** 🚀

If you have any questions or need help with testing, refer to:
- **Implementation Details:** `CRM_CONSOLIDATION_STATUS.md`
- **Full Plan:** `CRM_CONSOLIDATION_IMPLEMENTATION_PLAN.md`
- **Component Code:** `components/AccountsTab.tsx`
