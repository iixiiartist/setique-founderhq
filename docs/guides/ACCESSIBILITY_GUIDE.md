# Accessibility (a11y) Implementation Guide

## Overview

FounderHQ is built with accessibility as a core principle. This document outlines our accessibility features, implementation patterns, and testing guidelines to ensure all users can effectively use the application.

## Compliance Target

We aim for **WCAG 2.1 Level AA** compliance across all features.

---

## 🎯 Key Accessibility Features

### 1. Keyboard Navigation

#### Global Shortcuts
All keyboard shortcuts work system-wide and are context-aware:

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl/Cmd + N` | New Task | Create a new task from anywhere |
| `Ctrl/Cmd + K` or `/` | Focus Search | Jump to search (when implemented) |
| `?` | Show Help | Display keyboard shortcuts modal |
| `1-9` | Switch Tabs | Quick tab navigation (1=Dashboard, 2=Platform, etc.) |
| `Esc` | Close Modal | Close any open modal or dropdown |
| `Tab` | Next Element | Move focus forward |
| `Shift + Tab` | Previous Element | Move focus backward |
| `Enter` | Activate | Activate buttons and links |
| `Space` | Toggle | Toggle checkboxes and buttons |

#### Implementation
```typescript
// hooks/useKeyboardShortcuts.ts
export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  // Automatically prevents shortcuts when user is typing in inputs
  // Handles modifier keys (Ctrl/Cmd) cross-platform
  // Cleans up listeners on unmount
};
```

### 2. Screen Reader Support

#### ARIA Labels
All interactive elements have descriptive labels:

```tsx
// Navigation
<button 
  onClick={() => setIsMenuOpen(true)} 
  aria-label="Open navigation menu" 
  aria-expanded={isMenuOpen}
>
  <MenuIcon />
</button>

// Status indicators
<div 
  role="status" 
  aria-label={`Daily Streak: ${streak} days`}
>
  🔥 {streak}
</div>

// Navigation items
<a 
  href="#" 
  aria-label="Navigate to Dashboard"
  aria-current={activeTab === Tab.Dashboard ? 'page' : undefined}
>
  Dashboard
</a>
```

#### Live Regions
Dynamic content uses ARIA live regions:

```tsx
// Toast notifications
<div 
  className="toast" 
  role="alert" 
  aria-live="assertive"
>
  {message}
</div>

// Loading states
<div 
  role="status" 
  aria-live="polite"
>
  <LoadingSpinner message="Loading workspace..." />
</div>
```

### 3. Focus Management

#### Modal Focus Trapping
Modals trap focus and restore it on close:

```typescript
// components/shared/Modal.tsx
useEffect(() => {
  if (isOpen) {
    const focusableElements = modalNode.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Tab wraps around within modal
    // Escape closes modal
    // Focus returns to trigger element on close
  }
}, [isOpen]);
```

#### Skip to Content
Skip navigation for keyboard users:

```tsx
<a 
  href="#main-content"
  className="sr-only focus:not-sr-only"
>
  Skip to main content
</a>

<main id="main-content" role="main">
  {/* Tab content */}
</main>
```

### 4. Visual Indicators

#### Focus Indicators
All interactive elements have visible focus states:

```css
/* Visible focus ring for keyboard navigation */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}
```

#### Color Contrast
All text meets WCAG AA contrast requirements:
- Normal text: minimum 4.5:1
- Large text (18pt+): minimum 3:1
- UI components: minimum 3:1

### 5. Semantic HTML

#### Proper Structure
```tsx
<header role="banner">
  {/* Site header with branding and user menu */}
</header>

<nav role="navigation" aria-label="Main navigation">
  {/* Primary navigation links */}
</nav>

<main role="main" id="main-content">
  {/* Primary content area */}
</main>

<section aria-labelledby="tasks-heading">
  <h2 id="tasks-heading">Open Tasks</h2>
  {/* Task list */}
</section>
```

---

## 🧪 Testing Guidelines

### Manual Testing

#### 1. Keyboard-Only Navigation
- [ ] Disconnect mouse
- [ ] Navigate through all features using only Tab, Shift+Tab, Enter, Space, Escape
- [ ] Ensure all interactive elements are reachable
- [ ] Verify focus indicators are clearly visible
- [ ] Test all keyboard shortcuts

#### 2. Screen Reader Testing
Test with multiple screen readers:
- **NVDA** (Windows - free): Most common, test priority
- **JAWS** (Windows - paid): Industry standard
- **VoiceOver** (macOS - built-in): Apple ecosystem
- **TalkBack** (Android - built-in): Mobile testing

#### Checklist:
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All buttons have descriptive labels
- [ ] Landmark regions are properly labeled
- [ ] Dynamic content announces changes
- [ ] Error messages are announced
- [ ] Success confirmations are announced

#### 3. Visual Testing
- [ ] Zoom to 200% - layout should remain functional
- [ ] Test with high contrast mode (Windows/macOS)
- [ ] Verify color is not the only indicator
- [ ] Check focus indicators are visible in all themes

### Automated Testing

#### Lighthouse Accessibility Audit
```bash
# Run Lighthouse in Chrome DevTools
# Target score: 95+

# Or use CLI
npm install -g lighthouse
lighthouse https://your-app.com --only-categories=accessibility
```

#### axe DevTools
```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore/.../axe-devtools
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/

# Run automated scan on every page
# Fix all violations and warnings
```

#### jest-axe for Unit Tests
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Modal has no accessibility violations', async () => {
  const { container } = render(<Modal isOpen={true} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 📚 Component Guidelines

### Adding New Components

When creating a new component, ensure:

1. **Semantic HTML**: Use appropriate HTML elements
   ```tsx
   ✅ <button onClick={...}>Submit</button>
   ❌ <div onClick={...}>Submit</div>
   ```

2. **ARIA Labels**: Add descriptive labels
   ```tsx
   ✅ <button aria-label="Delete task 'Launch product'">🗑️</button>
   ❌ <button>🗑️</button>
   ```

3. **Keyboard Support**: Handle Enter and Space
   ```tsx
   ✅ <button onClick={handleClick}>...</button>
   ❌ <div onClick={handleClick}>...</div> // No keyboard support
   ```

4. **Focus Management**: Ensure focus is visible and logical
   ```tsx
   ✅ <button className="focus:ring-2 focus:ring-blue-500">...</button>
   ❌ <button className="focus:outline-none">...</button> // Removes focus indicator
   ```

5. **Dynamic Content**: Announce changes
   ```tsx
   ✅ <div role="alert" aria-live="assertive">{error}</div>
   ❌ <div>{error}</div>
   ```

### Form Components

```tsx
// ✅ Accessible form input
<div>
  <label htmlFor="task-title" className="block mb-2">
    Task Title <span aria-label="required">*</span>
  </label>
  <input
    id="task-title"
    type="text"
    value={title}
    onChange={handleChange}
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "task-title-error" : undefined}
  />
  {hasError && (
    <div id="task-title-error" role="alert" className="text-red-600">
      Title is required
    </div>
  )}
</div>
```

### Modal Components

```tsx
// ✅ Accessible modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Delete Task</h2>
  <p id="modal-description">
    Are you sure you want to delete this task?
  </p>
  <button onClick={handleDelete}>Delete</button>
  <button onClick={handleCancel}>Cancel</button>
</div>
```

---

## 🐛 Common Accessibility Issues

### Issue: Focus Lost After Action
**Problem**: Focus disappears after deleting an item or closing a modal.
**Solution**: Explicitly manage focus.

```typescript
// Return focus to trigger element
const triggerRef = useRef<HTMLButtonElement>(null);

const handleDelete = () => {
  deleteItem();
  triggerRef.current?.focus(); // Return focus
};
```

### Issue: Dynamic Content Not Announced
**Problem**: Screen readers don't announce toast notifications or status changes.
**Solution**: Use aria-live regions.

```tsx
// ✅ Announced to screen readers
<div role="alert" aria-live="assertive">
  Task completed successfully!
</div>

// ❌ Not announced
<div>Task completed successfully!</div>
```

### Issue: Icons Without Labels
**Problem**: Icon-only buttons are meaningless to screen readers.
**Solution**: Add aria-label.

```tsx
// ✅ Descriptive
<button aria-label="Delete task">
  <TrashIcon />
</button>

// ❌ Meaningless
<button>
  <TrashIcon />
</button>
```

### Issue: Color-Only Indicators
**Problem**: Using only color to convey status fails for colorblind users.
**Solution**: Use text, icons, or patterns in addition to color.

```tsx
// ✅ Multiple indicators
<div className="status-indicator">
  <span className="icon">✓</span>
  <span className="text">Complete</span>
  <span className="bg-green-500 px-2 py-1">Success</span>
</div>

// ❌ Color only
<div className="bg-green-500 w-4 h-4"></div>
```

---

## 📖 Resources

### Official Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Testing Tools
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)

### React-Specific
- [React Accessibility Docs](https://react.dev/learn/accessibility)
- [React ARIA](https://react-spectrum.adobe.com/react-aria/)
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives

---

## ✅ Accessibility Checklist

Before shipping a feature, verify:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Color is not the only indicator of state
- [ ] Text meets contrast requirements (4.5:1 minimum)
- [ ] ARIA labels are present on icon buttons
- [ ] Modals trap focus and can be closed with Escape
- [ ] Dynamic content uses aria-live regions
- [ ] Page has proper heading hierarchy (h1 → h2 → h3)
- [ ] Landmark regions are properly labeled
- [ ] Tested with keyboard only
- [ ] Tested with screen reader
- [ ] Passed automated accessibility audit (Lighthouse/axe)
- [ ] Zoom to 200% works correctly

---

## 🚀 Future Improvements

### Planned Enhancements
1. **Voice Commands**: Integrate Web Speech API for voice navigation
2. **High Contrast Mode**: Dedicated high contrast theme
3. **Reduced Motion**: Respect `prefers-reduced-motion` system preference
4. **Custom Font Sizes**: User-controlled font scaling
5. **Screen Reader Announcements**: More granular progress updates
6. **Keyboard Shortcuts Customization**: Allow users to remap shortcuts

### Monitoring
- Set up automated a11y testing in CI/CD pipeline
- Regular manual testing with screen readers
- User feedback collection from assistive technology users
- Quarterly accessibility audits

---

## 📞 Support

If you encounter accessibility issues:
1. Create a GitHub issue with the `accessibility` label
2. Include steps to reproduce
3. Specify the assistive technology used (if applicable)
4. Priority: Critical (blocks usage) → High → Medium → Low

**Our commitment**: All critical accessibility issues will be addressed within 48 hours.
