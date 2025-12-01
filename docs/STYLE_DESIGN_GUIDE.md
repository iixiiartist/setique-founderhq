# FounderHQ Style & Design Guide

This guide documents the exact styles to use when updating UI components throughout the application. **Strict black, white, and gray palette only.**

---

## Design Style: Neo-Brutalist

**Core Characteristics:**

- Hard black borders (`border-2 border-black`)
- Offset black shadows (`shadow-neo` = `4px 4px 0px #000`)
- No border radius (sharp corners everywhere)
- Monospace font for headings, buttons, labels
- **Black and white only** - no colors
- ALL CAPS text for headings, buttons, nav
- Press-in hover effect (translate + remove shadow)

---

## Colors

### Allowed Colors Only

| Use | Class |
|-----|-------|
| Page background | `bg-white` |
| Cards | `bg-white` or `bg-gray-50` |
| Dark sections | `bg-black` |
| Dark cards | `bg-gray-900` |
| Borders | `border-black` or `border-gray-700` (dark mode) |

### Text Colors

| Use | Class |
|-----|-------|
| Primary text | `text-black` |
| Secondary/body | `text-gray-700` |
| Muted | `text-gray-500`, `text-gray-400` |
| On dark bg | `text-white` |
| On dark bg secondary | `text-gray-300` |
| On dark bg muted | `text-gray-400`, `text-gray-500` |

### Accent (Use Sparingly)

| Use | Class |
|-----|-------|
| Links hover | `hover:text-gray-600` |
| Focus ring | `focus:ring-gray-500` |
| Success indicator | `text-black` with ✓ symbol |

**NO colored backgrounds, NO colored text, NO colored borders.**

---

## Typography

### Fonts

```
Body: font-sans (Inter)
Headings/Labels/Buttons: font-mono (IBM Plex Mono)
```

### Text Sizes

| Element | Classes |
|---------|---------|
| Hero H1 | `text-5xl sm:text-6xl lg:text-7xl font-bold font-mono` |
| Section H2 | `text-4xl font-bold font-mono` |
| Card title | `text-lg font-bold font-mono` or `text-2xl font-bold font-mono` |
| Body text | `text-xl` or `text-base` |
| Small text | `text-sm` |
| Extra small | `text-xs` |

### Text Conventions

- Headings: ALL CAPS
- Button labels: ALL CAPS
- Nav links: ALL CAPS
- Badges: ALL CAPS
- Body/descriptions: Sentence case

---

## Shadows

### Shadow Classes (defined in tailwind.config.js)

```
shadow-neo: 4px 4px 0px #000      → Cards, badges
shadow-neo-sm: 2px 2px 0px #000   → Small elements
shadow-neo-lg: 6px 6px 0px #000   → Hero preview, large cards
shadow-neo-btn: 3px 3px 0px #000  → Buttons
```

---

## Borders

Every interactive element has: `border-2 border-black`

| Element | Border |
|---------|--------|
| Cards | `border-2 border-black` |
| Buttons | `border-2 border-black` |
| Inputs | `border-2 border-black` |
| Badges | `border-2 border-black` |
| Section dividers | `border-t-2 border-black` |
| List dividers | `border-b-2 border-black` |
| Dark mode borders | `border-2 border-gray-700` or `border-2 border-white` |

**No border radius** - all corners are sharp (square).

---

## Components

### Primary Button (Dark)

```jsx
<button className="px-8 py-4 bg-black border-2 border-black text-white font-mono font-bold text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
  BUTTON TEXT
</button>
```

### Secondary Button (Light)

```jsx
<button className="px-8 py-4 bg-white border-2 border-black text-black font-mono font-bold text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
  BUTTON TEXT
</button>
```

### Small Button

```jsx
<button className="px-4 py-2 bg-black border-2 border-black text-white font-mono font-bold text-sm shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
  BUTTON TEXT
</button>
```

### Card

```jsx
<div className="bg-white border-2 border-black shadow-neo p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
  <div className="w-12 h-12 bg-black flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-white" />
  </div>
  <h3 className="text-lg font-bold font-mono text-black mb-2">Card Title</h3>
  <p className="text-gray-700 text-sm leading-relaxed">Card description text.</p>
</div>
```

### Badge / Tag

```jsx
<span className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo font-mono font-bold text-sm">
  <Icon className="w-4 h-4" />
  BADGE TEXT
</span>
```

### Icon Container

```jsx
// Standard (card icon)
<div className="w-12 h-12 bg-black flex items-center justify-center">
  <Icon className="w-6 h-6 text-white" />
</div>

// Small (nav logo)
<div className="w-8 h-8 bg-black flex items-center justify-center">
  <Icon className="w-5 h-5 text-white" />
</div>
```

### Input Field

```jsx
<input 
  type="text"
  className="w-full px-4 py-3 bg-white border-2 border-black font-mono text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
  placeholder="Placeholder text"
/>
```

### List Item with Checkmark

```jsx
<li className="flex items-start gap-2 text-sm text-black">
  <span className="text-black font-bold flex-shrink-0 mt-0.5">✓</span>
  <span className="font-mono">Feature item text</span>
</li>
```

### Accordion / FAQ Item

```jsx
<div className="border-b-2 border-black">
  <button className="w-full py-4 flex items-center justify-between text-left group">
    <span className="font-bold font-mono text-black group-hover:text-gray-600 transition-colors">
      Question text?
    </span>
    <ChevronDown className="w-5 h-5 text-black transition-transform duration-300" />
  </button>
  <div className="overflow-hidden transition-all duration-300 max-h-0">
    <p className="text-gray-700 leading-relaxed pb-4">Answer text</p>
  </div>
</div>
```

### Featured Badge (floating)

```jsx
<div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
  <span className="bg-black border-2 border-black text-white text-xs font-bold font-mono px-3 py-1">
    BEST VALUE
  </span>
</div>
```

---

## Layout

### Container

```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Section

```jsx
<section className="py-24 bg-white border-t-2 border-black">
```

### Section Header Pattern

```jsx
<div className="text-center max-w-3xl mx-auto mb-16">
  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo font-mono font-bold text-sm mb-6">
    SECTION LABEL
  </span>
  <h2 className="text-4xl font-bold font-mono text-black mb-4">
    SECTION HEADLINE
  </h2>
  <p className="text-xl text-gray-700">
    Section description text goes here.
  </p>
</div>
```

### Grid Layouts

```jsx
// 4-column feature grid
<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

// 2-column pricing grid
<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

// 2-column with image
<div className="grid lg:grid-cols-2 gap-16 items-center">

// Footer grid
<div className="grid md:grid-cols-4 gap-8">
```

---

## Navigation

### Fixed Nav Bar

```jsx
<nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-black">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <a className="flex items-center gap-2">
        <div className="w-8 h-8 bg-black flex items-center justify-center">
          <Command className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl font-mono text-black">FOUNDERHQ</span>
      </a>
      
      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        <a className="text-black hover:text-gray-600 transition-colors text-sm font-mono font-bold">FEATURES</a>
      </div>
      
      {/* CTA */}
      <button className="px-4 py-2 bg-black border-2 border-black text-white font-mono font-bold text-sm shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
        GET STARTED FREE
      </button>
    </div>
  </div>
</nav>
```

---

## Dark Section Pattern

When section has `bg-black`:

```jsx
<section className="py-24 bg-black text-white">
  {/* Badge with white border */}
  <span className="bg-white border-2 border-white text-black font-mono font-bold text-sm">

  {/* Cards use gray-900 bg with gray-700 borders */}
  <div className="bg-gray-900 border-2 border-gray-700 hover:border-white transition-colors">
  
  {/* Text colors */}
  <h2 className="text-white font-bold font-mono">
  <p className="text-gray-300">  {/* secondary */}
  <p className="text-gray-400">  {/* muted */}
```

---

## Hover Effects

### Standard Press Effect

```
hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all
```

### Link Hover

```
hover:text-gray-600 transition-colors
```

### Border Hover (dark sections)

```
hover:border-white transition-colors
```

### Arrow Animation

```jsx
<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
```

---

## Spacing Reference

| Element | Spacing |
|---------|---------|
| Section padding | `py-24` |
| Hero padding | `pt-32 pb-20` |
| Card padding | `p-6` |
| Button padding (lg) | `px-8 py-4` |
| Button padding (sm) | `px-4 py-2` |
| Badge padding | `px-4 py-2` or `px-3 py-1` |
| Gap in flex/grid | `gap-4`, `gap-6`, `gap-8` |
| Icon margin bottom | `mb-4` |
| Heading margin bottom | `mb-4` or `mb-6` |
| Section header margin | `mb-16` |

---

## Footer

```jsx
<footer className="bg-black text-white py-16 border-t-2 border-black">
  {/* Logo in footer */}
  <div className="w-8 h-8 bg-white flex items-center justify-center">
    <Command className="w-5 h-5 text-black" />
  </div>
  
  {/* Links */}
  <a className="text-gray-400 hover:text-white transition-colors text-sm font-mono">
  
  {/* Section title */}
  <h4 className="font-bold font-mono mb-4">PRODUCT</h4>
  
  {/* Divider */}
  <div className="border-t-2 border-gray-800 pt-8">
  
  {/* Copyright */}
  <p className="text-gray-400 text-sm font-mono">© 2025 FOUNDERHQ. ALL RIGHTS RESERVED.</p>
</footer>
```

---

## Quick Copy-Paste Classes

**Card:**
`bg-white border-2 border-black shadow-neo p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all`

**Primary Button:**
`px-8 py-4 bg-black border-2 border-black text-white font-mono font-bold shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all`

**Secondary Button:**
`px-8 py-4 bg-white border-2 border-black text-black font-mono font-bold shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all`

**Badge:**
`inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo font-mono font-bold text-sm`

**Icon Box:**
`w-12 h-12 bg-black flex items-center justify-center`

**Section:**
`py-24 bg-white border-t-2 border-black`

**Heading:**
`text-4xl font-bold font-mono text-black`

**Body Text:**
`text-gray-700 leading-relaxed`

**Nav Link:**
`text-black hover:text-gray-600 transition-colors text-sm font-mono font-bold`

**Input:**
`w-full px-4 py-3 bg-white border-2 border-black font-mono text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black`
