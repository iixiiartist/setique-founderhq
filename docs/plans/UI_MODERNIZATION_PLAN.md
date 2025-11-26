# UI Modernization & Consistency Plan

## Executive Summary
This document outlines the plan to modernize the application's UI architecture, enforcing the "Neo-Brutal" design system through configuration rather than ad-hoc CSS. The goal is to improve maintainability, consistency, and developer experience.

## 1. Configuration Updates (`tailwind.config.js`)
Move design tokens from `index.css` and manual inline styles into the Tailwind configuration.

### Key Changes:
- **Fonts**: Define `font-sans` (Inter) and `font-mono` (IBM Plex Mono).
- **Shadows**: Port `shadow-neo`, `shadow-neo-sm`, `shadow-neo-lg` to `theme.extend.boxShadow`.
- **Borders**: Set default border width and radius to enforce the sharp-edged aesthetic.
- **Colors**: Define semantic colors if necessary (though the design is largely monochrome).

## 2. Global CSS Refactoring (`index.css`)
Reduce the size and complexity of the global stylesheet.

### Key Changes:
- Remove custom utility classes (`.shadow-neo`, etc.) that are now handled by Tailwind config.
- Keep global resets and typography defaults.
- Keep complex component styles that are difficult to express with utilities (e.g., Tiptap editor overrides, though these could eventually move to CSS modules or Tailwind Typography).
- Ensure accessibility styles (focus rings) remain robust.

## 3. Component Standardization
Refactor core UI primitives to use the new configuration.

### Priority Components:
1.  **Button**: Ensure it uses the new `shadow-neo` utilities and handles interaction states (hover/active) consistently.
2.  **Input/Form Elements**: Standardize borders, padding, and focus states.
3.  **Cards/Containers**: Use the `shadow-neo` utilities for consistent depth.

## 4. Implementation Steps

### Phase 1: Foundation (Current Focus)
1.  [ ] Create this plan document.
2.  [ ] Update `tailwind.config.js` with fonts, shadows, and border defaults.
3.  [ ] Refactor `index.css` to remove redundant classes.

### Phase 2: Component Refactor (Next Steps)
1.  [ ] Audit `Button` component and update to use `cva` (Class Variance Authority) or standard Tailwind classes.
2.  [ ] Audit `DocEditor` and `ModuleAssistant` to replace custom CSS classes with Tailwind utilities.

### Phase 3: Cleanup
1.  [ ] Scan codebase for hardcoded styles (e.g., `style={{ border: '2px solid black' }}`) and replace with Tailwind classes.
2.  [ ] Verify accessibility (focus states, contrast) across the app.
