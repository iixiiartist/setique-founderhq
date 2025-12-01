# UI Migration Plan: Neo-Brutalist Black & White Design

This document outlines the step-by-step plan to update the entire FounderHQ application UI to match the landing page's Neo-Brutalist black and white design system.

---

## Overview

**Goal:** Migrate all UI components from the current mixed color palette to a strict black, white, and gray Neo-Brutalist design.

**Key Changes:**
- Remove all colored backgrounds (blue, green, yellow, purple, etc.)
- Remove all colored text (except black/white/gray)
- Apply consistent `border-2 border-black` to all interactive elements
- Apply `shadow-neo` shadows throughout
- Use `font-mono` for headings, buttons, labels
- Remove all border-radius (sharp corners only)
- Standardize hover effects (press-in animation)

---

## Phase 1: Core UI Components (Foundation)

Update the reusable components in `/components/ui/` first, as these propagate changes throughout the app.

### 1.1 Button.tsx ✅ (Mostly Done)
**Current State:** Already has neo-brutalist styling
**Changes Needed:**
- [ ] Remove `danger` variant colors (red) → use black with different label
- [ ] Remove `success` variant colors (green) → use black
- [ ] Change hover from `hover:bg-gray-800` to press-in effect
- [ ] Ensure `shadow-neo` on hover removes properly

```tsx
// Updated variant styles
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-black text-white',
  secondary: 'bg-white text-black',
  danger: 'bg-black text-white',      // Remove red
  ghost: 'bg-transparent text-black',
  outline: 'bg-white text-black',
  success: 'bg-black text-white',     // Remove green
};
```

### 1.2 Card.tsx ✅ (Mostly Done)
**Current State:** Has neo-brutalist base
**Changes Needed:**
- [ ] Remove `section` variant gray background → use white
- [ ] Change `border-gray-300` to `border-black`
- [ ] Ensure clickable cards have press-in hover effect

### 1.3 Input.tsx
**Current State:** Has some neo-brutalist styling
**Changes Needed:**
- [ ] Remove blue focus border → use black
- [ ] Remove red error border → use black with error text
- [ ] Add `bg-white` explicitly
- [ ] Ensure `font-mono` on placeholder

```tsx
// Focus state change
${error 
  ? 'border-black'  // Remove red border
  : 'border-black focus:ring-2 focus:ring-black'
}
```

### 1.4 Badge.tsx
**Current State:** Uses colored variants
**Changes Needed:**
- [ ] Remove all colored variants (blue, green, yellow, red, purple)
- [ ] Create black/white/gray variants only
- [ ] Add `border-2 border-black`

```tsx
// New variant styles
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white text-black border-black',
  filled: 'bg-black text-white border-black',
  muted: 'bg-gray-100 text-gray-700 border-gray-400',
};
```

### 1.5 Select.tsx & Checkbox.tsx
**Changes Needed:**
- [ ] Remove any colored focus states
- [ ] Apply `border-2 border-black`
- [ ] Use black checkmark/indicator

---

## Phase 2: Shared Components

Update components in `/components/shared/` that are used across multiple features.

### 2.1 Modal.tsx ✅ (Mostly Done)
**Current State:** Has neo-brutalist base
**Changes Needed:**
- [ ] Ensure backdrop is `bg-black/30` (no color tint)
- [ ] Verify `border-2 border-black` on modal container
- [ ] Header border should be `border-black` not `border-gray-200`

### 2.2 Toast.tsx
**Current State:** Uses colored backgrounds (blue-100, green-100)
**Changes Needed:**
- [ ] Remove `bg-blue-100` → use `bg-white`
- [ ] Remove `bg-green-100` → use `bg-white`
- [ ] Add icon or prefix to differentiate types instead of color

```tsx
const typeClasses = {
  info: "bg-white",     // Remove blue
  success: "bg-white",  // Remove green
  error: "bg-white",    // For error variant
};

// Use icons instead:
// info: ℹ️ or (i)
// success: ✓
// error: ✕
```

### 2.3 ConfirmDialog.tsx
**Changes Needed:**
- [ ] Remove any red "danger" button styling
- [ ] Use black buttons with clear labels ("DELETE", "CANCEL")
- [ ] Apply modal styling consistently

### 2.4 Loading.tsx
**Changes Needed:**
- [ ] Ensure spinner is black
- [ ] Remove any colored loading indicators

### 2.5 KpiCard.tsx
**Changes Needed:**
- [ ] Remove any colored backgrounds
- [ ] Use `bg-white border-2 border-black shadow-neo`

### 2.6 TabLoadingFallback.tsx
**Changes Needed:**
- [ ] Skeleton loaders should be `bg-gray-200` only
- [ ] No colored shimmer effects

### 2.7 NotificationBell.tsx & InAppNotificationsPanel.tsx
**Changes Needed:**
- [ ] Remove colored notification badges → use black
- [ ] Remove colored backgrounds in notification list

### 2.8 ActivityFeed.tsx
**Changes Needed:**
- [ ] Remove colored activity type indicators
- [ ] Use icons or text prefixes instead

---

## Phase 3: Authentication Pages

### 3.1 LoginForm.tsx
**Current State:** Uses yellow accents
**Changes Needed:**
- [ ] Remove `bg-yellow-400` button → use `bg-black text-white`
- [ ] Remove `text-yellow-400` header text → use `text-white`
- [ ] Remove `focus:border-yellow-400` → use `focus:border-black` or `focus:ring-black`
- [ ] Remove `hover:text-yellow-600` → use `hover:text-gray-600`
- [ ] Error box: remove `border-red-600` → use `border-black`
- [ ] Success box: remove `border-green-600` → use `border-black`
- [ ] Warning box: remove `bg-yellow-50 border-yellow-600` → use `bg-gray-50 border-black`

### 3.2 ResetPassword.tsx
**Changes Needed:**
- [ ] Apply same changes as LoginForm
- [ ] Consistent button and input styling

---

## Phase 4: Navigation & Layout

### 4.1 SideMenu.tsx
**Current State:** Uses blue active state
**Changes Needed:**
- [ ] Remove `text-blue-500` active state → use `bg-black text-white`
- [ ] Remove `border-black bg-gray-100` → use `bg-black text-white` for active
- [ ] Remove `rounded-lg` → sharp corners

```tsx
// Updated active/inactive classes
const activeClass = "text-white bg-black border-black";
const inactiveClass = "text-black bg-white border-transparent hover:bg-gray-100";
```

### 4.2 SubscriptionBanner.tsx
**Changes Needed:**
- [ ] Remove any colored backgrounds
- [ ] Use `bg-black text-white` or `bg-white border-2 border-black`

---

## Phase 5: Main Tab Components

Each tab file needs individual review. Common changes:

### General Tab Updates
Apply to all tabs (DashboardTab, CrmTab, CalendarTab, etc.):

- [ ] Remove all colored status indicators
- [ ] Remove colored priority badges
- [ ] Remove colored category tags
- [ ] Update section headers to use `border-b-2 border-black`
- [ ] Ensure all buttons use Button component or neo-brutalist classes
- [ ] Remove any `rounded-*` classes

### 5.1 DashboardTab.tsx
- [ ] KPI cards: `bg-white border-2 border-black shadow-neo`
- [ ] Charts: Use black/gray color palette only
- [ ] Activity feed: Remove colored indicators

### 5.2 CrmTab.tsx / AccountsTab.tsx
- [ ] Pipeline stages: Use black borders, white/gray backgrounds
- [ ] Status badges: Black text on white, or white text on black
- [ ] Contact cards: `bg-white border-2 border-black shadow-neo`

### 5.3 CalendarTab.tsx
- [ ] Calendar grid: Black borders
- [ ] Event colors: Use patterns/icons instead of colors
- [ ] Today indicator: `bg-black text-white` instead of color

### 5.4 TasksTab.tsx
- [ ] Priority indicators: Use text labels (HIGH, MED, LOW) instead of colors
- [ ] Status: Use checkboxes and text instead of colored pills
- [ ] Task cards: `bg-white border-2 border-black`

### 5.5 FinancialsTab.tsx
- [ ] Revenue/expense indicators: Use +/- symbols and position, not green/red
- [ ] Charts: Black and gray tones only
- [ ] Summary cards: Neo-brutalist styling

### 5.6 EmailTab.tsx
- [ ] Email list: Black borders, white background
- [ ] Unread indicator: Bold text or black dot, not colored
- [ ] Compose button: Black neo-brutalist button

### 5.7 MarketingTab.tsx
- [ ] Campaign status: Text labels, not colored badges
- [ ] Performance metrics: Black/white cards

### 5.8 HuddleTab.tsx (Team Chat)
- [ ] Message bubbles: `bg-white border-2 border-black` or `bg-black text-white`
- [ ] Online status: Black dot, not green
- [ ] Reactions: Grayscale or black icons

### 5.9 DocumentLibraryTab.tsx / FileLibraryTab.tsx
- [ ] File type icons: Grayscale
- [ ] Folder colors: Remove, use icons only

### 5.10 SettingsTab.tsx
- [ ] Form inputs: Neo-brutalist styling
- [ ] Section dividers: `border-b-2 border-black`
- [ ] Toggle switches: Black/white only

### 5.11 AdminTab.tsx
- [ ] Admin panels: Neo-brutalist cards
- [ ] User status: Text labels, not colors

---

## Phase 6: Feature-Specific Components

### 6.1 /components/crm/
- [ ] ContactDetailView, AccountDetailView: Remove colored sections
- [ ] Pipeline components: Black/white stages

### 6.2 /components/calendar/
- [ ] Event cards: Remove colored event types
- [ ] Use icons or patterns to differentiate

### 6.3 /components/huddle/
- [ ] Chat components: Black/white message styling
- [ ] Mentions: Bold text instead of colored highlight

### 6.4 /components/financials/
- [ ] Transaction lists: +/- indicators, not red/green
- [ ] Charts: Grayscale palette

### 6.5 /components/tasks/
- [ ] Task cards, subtasks: Neo-brutalist styling
- [ ] Priority: Text-based (HIGH/MED/LOW in black)

### 6.6 /components/notifications/
- [ ] Notification items: Remove colored backgrounds
- [ ] Type indicators: Icons instead of colors

### 6.7 /components/forms/
- [ ] Form builder: Neo-brutalist inputs
- [ ] Validation: Black border on error, with error text

---

## Phase 7: Static Pages

### 7.1 PricingPage.tsx
- [ ] Pricing cards: `bg-white border-2 border-black shadow-neo`
- [ ] Popular badge: `bg-black text-white`
- [ ] CTA buttons: Black neo-brutalist

### 7.2 PrivacyPolicyPage.tsx & TermsOfServicePage.tsx
- [ ] Page container: `bg-white`
- [ ] Headings: `font-mono font-bold`
- [ ] Links: `text-black underline hover:text-gray-600`

### 7.3 CheckoutSuccessPage.tsx
- [ ] Success card: Neo-brutalist, no green
- [ ] Use ✓ icon with black background

---

## Phase 8: CSS & Tailwind Config

### 8.1 index.css
- [ ] Remove modern design system classes (`.btn-modern`, `.card-modern`, etc.) or update them
- [ ] Remove colored glow effects
- [ ] Update focus ring colors to black
- [ ] Update any hardcoded colors

### 8.2 tailwind.config.js
- [ ] Remove unused color extensions if any
- [ ] Ensure shadow-neo classes are defined
- [ ] Remove any gradient definitions that use colors

---

## Phase 9: Testing & QA

### 9.1 Visual Regression
- [ ] Screenshot all pages before migration
- [ ] Compare after migration
- [ ] Check for missed colored elements

### 9.2 Accessibility
- [ ] Ensure sufficient contrast (black on white)
- [ ] Test focus states are visible
- [ ] Screen reader compatibility

### 9.3 Responsive
- [ ] Test all breakpoints
- [ ] Mobile menu styling
- [ ] Touch targets (min 44px)

---

## Implementation Order (Recommended)

1. **Week 1: Foundation**
   - Phase 1: Core UI components
   - Phase 8: CSS/Tailwind config

2. **Week 2: Shared & Auth**
   - Phase 2: Shared components
   - Phase 3: Auth pages

3. **Week 3: Navigation & Main Tabs**
   - Phase 4: Navigation
   - Phase 5: Main tab components (Dashboard, CRM, Calendar)

4. **Week 4: Remaining Tabs**
   - Phase 5 continued: (Tasks, Financials, Email, Marketing, Huddle, etc.)

5. **Week 5: Feature Components**
   - Phase 6: All feature-specific components

6. **Week 6: Polish & QA**
   - Phase 7: Static pages
   - Phase 9: Testing

---

## Quick Reference: Find & Replace Patterns

Common class replacements to search for:

| Find | Replace With |
|------|--------------|
| `bg-blue-*` | `bg-white` or `bg-black` |
| `bg-green-*` | `bg-white` or `bg-black` |
| `bg-red-*` | `bg-white` or `bg-black` |
| `bg-yellow-*` | `bg-white` or `bg-black` |
| `bg-purple-*` | `bg-white` or `bg-black` |
| `text-blue-*` | `text-black` or `text-gray-700` |
| `text-green-*` | `text-black` |
| `text-red-*` | `text-black` |
| `text-yellow-*` | `text-black` or `text-white` |
| `border-blue-*` | `border-black` |
| `border-green-*` | `border-black` |
| `border-red-*` | `border-black` |
| `focus:border-blue-*` | `focus:border-black` |
| `focus:ring-blue-*` | `focus:ring-black` |
| `hover:text-blue-*` | `hover:text-gray-600` |
| `rounded-lg` | (remove) |
| `rounded-md` | (remove) |
| `rounded-xl` | (remove) |
| `rounded-full` | (remove or keep for avatars only) |

---

## Notes

- **Avatars:** Can keep `rounded-full` for user avatars as an exception
- **Charts:** Use grayscale palette: `#000`, `#333`, `#666`, `#999`, `#ccc`, `#fff`
- **Icons:** All icons should be black (`text-black`) or white (`text-white`)
- **Loading spinners:** Use black color
- **Hover states:** Prefer press-in effect over color change

---

*Created: December 2025*
*Last Updated: December 2025*
