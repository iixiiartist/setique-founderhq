# FounderHQ Modern Style Guide

This guide documents the modern design system for the FounderHQ application. The design emphasizes a clean, premium SaaS aesthetic with soft shadows, rounded corners, and a professional slate color palette.

---

## Design Philosophy: Modern Premium SaaS

**Core Characteristics:**

- Rounded corners (`rounded-xl`, `rounded-2xl`)
- Soft shadows (`shadow-sm`, `shadow-md`, `shadow-lg`)
- Light borders (`border border-gray-200`)
- Slate/navy color palette for text and dark elements
- Clean sans-serif typography
- Subtle hover effects (no transforms)
- Pill-shaped badges (`rounded-full`)
- Green checkmarks for feature lists

---

## Colors

### Primary Palette

| Use | Class |
|-----|-------|
| Page background | `bg-white` or `bg-gray-50` |
| Card background | `bg-white` |
| Dark backgrounds | `bg-slate-900` or `bg-gradient-to-br from-slate-800 to-slate-900` |
| Light backgrounds | `bg-slate-50` or `bg-gray-50` |
| Borders | `border-gray-200` or `border-gray-100` |

### Text Colors

| Use | Class |
|-----|-------|
| Primary headings | `text-slate-900` |
| Primary body text | `text-slate-700` |
| Secondary text | `text-slate-600` |
| Muted text | `text-slate-500` or `text-gray-500` |
| Labels | `text-slate-500` with `uppercase tracking-wide` |
| On dark bg | `text-white` |
| On dark bg secondary | `text-slate-300` |

### Semantic Colors

| Use | Class |
|-----|-------|
| Success | `text-emerald-600`, `bg-emerald-50`, `border-emerald-200` |
| Warning | `text-amber-600`, `bg-amber-50`, `border-amber-200` |
| Error | `text-red-600`, `bg-red-50`, `border-red-200` |
| Info | `text-blue-600`, `bg-blue-50`, `border-blue-200` |

---

## Typography

### Fonts

```
All text: font-sans (Inter or system sans-serif)
Code: font-mono
```

### Text Sizes

| Element | Classes |
|---------|---------|
| Hero H1 | `text-5xl sm:text-6xl font-bold text-slate-900` |
| Section H2 | `text-3xl font-bold text-slate-900` |
| Card title | `text-xl font-semibold text-slate-900` |
| Body text | `text-base text-slate-700` |
| Small text | `text-sm text-slate-600` |
| Labels | `text-xs font-medium text-slate-500 uppercase tracking-wide` |

### Text Conventions

- Headings: Title Case or Sentence case (NOT ALL CAPS)
- Button labels: Sentence case with medium font weight
- Nav links: Sentence case
- Badges: Sentence case

---

## Shadows

### Shadow Classes

```
shadow-sm    → Default cards, inputs
shadow-md    → Hover state for cards
shadow-lg    → Modals, dropdowns
shadow-xl    → Large elevated elements
shadow-2xl   → Full modals, overlays
```

### Shadow Usage

| Element | Shadow |
|---------|--------|
| Cards | `shadow-sm` → `hover:shadow-md` |
| Buttons | `shadow-sm` → `hover:shadow-md` |
| Modals | `shadow-2xl` |
| Dropdowns | `shadow-lg` |
| Inputs | No shadow or `shadow-sm` on focus |

---

## Border Radius

| Element | Radius |
|---------|--------|
| Large cards, modals | `rounded-2xl` |
| Buttons, inputs, small cards | `rounded-xl` |
| Badges, pills | `rounded-full` |
| Checkboxes | `rounded-md` |
| Small elements | `rounded-lg` |

---

## Borders

| Element | Border |
|---------|--------|
| Cards | `border border-gray-200` |
| Inputs (default) | `border border-gray-200` |
| Inputs (focus) | `border-slate-400` with `ring-slate-900/10` |
| Dividers | `border-t border-gray-100` or `border-t border-gray-200` |
| Dark sections | No border or `border-white/10` |

---

## Component Patterns

### Buttons

**Primary Button:**
```jsx
className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
```

**Secondary Button:**
```jsx
className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
```

**Danger Button:**
```jsx
className="px-6 py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition-all"
```

### Cards

**Default Card:**
```jsx
className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
```

**Interactive Card:**
```jsx
className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
```

### Inputs

**Text Input:**
```jsx
className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
```

### Badges

**Default Badge:**
```jsx
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
```

**Success Badge:**
```jsx
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
```

### Modals

**Modal Container:**
```jsx
className="bg-white rounded-2xl shadow-2xl border border-gray-200"
```

**Modal Header:**
```jsx
className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl"
```

### Toggle Switches

**Modern Toggle Switch (like Create Channel modal):**
```jsx
<div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
  <div className="flex items-center gap-3">
    <span className="text-lg">🌐</span>
    <div>
      <div className="text-sm font-medium text-gray-900">
        Public channel
      </div>
      <div className="text-xs text-gray-500">
        Anyone in workspace can join
      </div>
    </div>
  </div>
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => setValue(e.target.checked)}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
  </label>
</div>
```

**Key Toggle Classes:**
- Container: `bg-gray-200` (off) → `peer-checked:bg-slate-900` (on)
- Focus ring: `peer-focus:ring-4 peer-focus:ring-slate-300`
- Track: `w-11 h-6 rounded-full`
- Thumb: `w-5 h-5 rounded-full bg-white`

---

## Hover & Focus States

### Hover Effects

| Element | Effect |
|---------|--------|
| Buttons | `hover:shadow-md hover:bg-[darker]` |
| Cards | `hover:shadow-md` |
| Links | `hover:text-slate-900` or slight color change |
| List items | `hover:bg-gray-50` |

**No transform effects** - avoid `hover:translate-x` or `hover:translate-y`

### Focus States

```jsx
focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
```

---

## Quick Reference

### Complete Button Classes
```
Primary: bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-slate-800 transition-all
Secondary: bg-white text-slate-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all
Danger: bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition-all
```

### Complete Card Classes
```
Default: bg-white rounded-2xl border border-gray-200 shadow-sm p-6
Interactive: bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow
```

### Complete Input Classes
```
Text: w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors
Select: Same as text input
Checkbox: w-4 h-4 rounded-md border-slate-300 text-slate-900 focus:ring-slate-500
```

### Complete Modal Classes
```
Backdrop: bg-black/5 backdrop-blur-[2px]
Container: bg-white rounded-2xl shadow-2xl border border-gray-200
Header: px-6 py-4 border-b border-gray-100
Footer: px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl
```

---

## Migration Notes

When updating from the old neo-brutalist design:

| Old Pattern | New Pattern |
|-------------|-------------|
| `border-2 border-black` | `border border-gray-200` |
| `shadow-neo` | `shadow-sm` |
| `rounded-none` | `rounded-xl` or `rounded-2xl` |
| `font-mono font-bold uppercase` | `font-semibold` (normal case) |
| `hover:translate-x-[2px]` | Remove - use `hover:shadow-md` instead |
| `bg-black text-white` (buttons) | `bg-slate-900 text-white` |
| `text-black` | `text-slate-900` or `text-slate-700` |
| `focus:ring-black` | `focus:ring-slate-900/10` |

---

## Components Updated to Modern Design

### Core UI Components ✅
- [x] Button.tsx
- [x] Card.tsx  
- [x] Input.tsx
- [x] Badge.tsx
- [x] Select.tsx
- [x] Checkbox.tsx
- [x] Modal.tsx
- [x] Toast.tsx

### Navigation ✅
- [x] SideMenu.tsx

### Calendar ✅
- [x] CalendarHeader.tsx
- [x] EventDetailModal.tsx

### Agents ✅
- [x] AgentCard.tsx
- [x] AgentResponsePresenter.tsx

### Assistant ✅
- [x] AssistantModal.tsx

### Auth ✅
- [x] LoginForm.tsx
- [x] ResetPassword.tsx

### Modal Components ✅
- [x] TaskCreationModal.tsx
- [x] InviteTeamMemberModal.tsx
- [x] DocumentUploadModal.tsx
- [x] CreateRoomModal.tsx
- [x] RoomSettingsModal.tsx
- [x] ShareToHuddleModal.tsx
- [x] TaskFocusModal.tsx
- [x] ProductServiceCreateModal.tsx
- [x] InlineFormModal.tsx
- [x] CampaignFormModal.tsx
- [x] AccountModals.tsx
- [x] ContactModals.tsx
- [x] ContactBulkModals.tsx
- [x] DocShareModal.tsx
- [x] NewEventModal.tsx
- [x] ImageUploadModal.tsx
- [x] ProductServiceDetailModal.tsx
- [x] DocEditorExportModal.tsx

### Agent Modals ✅ (Already Modern)
- [x] WhyNowAgentModal.tsx
- [x] ResearchAgentModal.tsx
- [x] DealStrategistModal.tsx

### Pages & Tabs ✅
- [x] PricingPage.tsx
- [x] PrivacyPolicyPage.tsx
- [x] TermsOfServicePage.tsx
- [x] CalendarTab.tsx
- [x] MarketingTab.tsx

### Marketing Components ✅
- [x] AttributionModule.tsx

### Team Components ✅
- [x] TeamCalendarView.tsx

### Domain Components ✅
- [x] CRMContactSelector.tsx

### Other Remaining (Need Update)
- [ ] LandingPage.tsx
- [ ] BusinessProfileSetup.tsx
- [ ] FinancialsTab.tsx
- [ ] CashFlowModule.tsx
- [ ] DocumentVersionHistory.tsx
- [ ] DocumentComments.tsx
- [ ] DashboardApp.tsx (header/nav elements)
- [ ] Various other components with neo-brutalist styles
