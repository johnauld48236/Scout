# SCOUT Brand Specification
## Sales Execution Intelligence Platform

---

## BRAND IDENTITY

**Name:** Scout
**Domain:** askscout.com (pending registration)
**Tagline:** Read the terrain. Make the move.

**Brand Personality:**
- Old soul, stoic, continuous
- Trusted guide who's been there before
- Quiet confidence, not flashy
- Action-oriented intelligence
- The scout who goes ahead and reports back

---

## COLOR SYSTEM

### Primary Palette: "Open Range"

```css
:root {
  /* Primary */
  --scout-saddle-brown: #8b4513;
  --scout-sky-blue: #4a90a4;
  
  /* Backgrounds */
  --scout-parchment: #faf8f0;
  --scout-white: #ffffff;
  
  /* Text */
  --scout-dark-earth: #3d3027;
  --scout-text-secondary: #6b5d52;
  
  /* Status Colors */
  --scout-sunset-orange: #d2691e;  /* Warning, attention needed */
  --scout-trail-green: #5d7a5d;    /* Success, positive, on track */
  --scout-clay-red: #a94442;       /* Danger, at risk, negative */
  
  /* Utility */
  --scout-border: #e5e0d8;
  --scout-border-dark: #d4cdc3;
  --scout-shadow: rgba(61, 48, 39, 0.1);
  --scout-shadow-heavy: rgba(61, 48, 39, 0.15);
}
```

### Color Usage Guide

| Element | Color | Variable |
|---------|-------|----------|
| App header background | Saddle Brown | `--scout-saddle-brown` |
| Primary buttons | Saddle Brown | `--scout-saddle-brown` |
| Links & interactive | Sky Blue | `--scout-sky-blue` |
| Page background | Parchment | `--scout-parchment` |
| Card background | White | `--scout-white` |
| Body text | Dark Earth | `--scout-dark-earth` |
| Secondary text | Text Secondary | `--scout-text-secondary` |
| Warnings/Due dates | Sunset Orange | `--scout-sunset-orange` |
| Success/On track | Trail Green | `--scout-trail-green` |
| Danger/At risk | Clay Red | `--scout-clay-red` |
| Borders | Border | `--scout-border` |

### Status Indicator System

```css
/* Status badges and indicators */
.status-on-track { 
  background: rgba(93, 122, 93, 0.15); 
  color: var(--scout-trail-green); 
}

.status-needs-attention { 
  background: rgba(210, 105, 30, 0.15); 
  color: var(--scout-sunset-orange); 
}

.status-at-risk { 
  background: rgba(169, 68, 66, 0.15); 
  color: var(--scout-clay-red); 
}

.status-neutral { 
  background: rgba(74, 144, 164, 0.15); 
  color: var(--scout-sky-blue); 
}
```

---

## TYPOGRAPHY

### Font Stack

**Primary Font:** Inter (or system sans-serif fallback)
- Used for: Body text, labels, UI elements
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Display/Logo Font:** Bitter
- Used for: Logo wordmark, major headings (optional)
- Weights: 600, 700

```css
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Bitter', Georgia, serif;
}
```

### Type Scale

```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### Typography Classes

```css
.heading-1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--scout-saddle-brown);
  letter-spacing: -0.02em;
}

.heading-2 {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--scout-saddle-brown);
}

.heading-3 {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--scout-dark-earth);
}

.body-text {
  font-size: var(--text-base);
  color: var(--scout-dark-earth);
  line-height: 1.6;
}

.label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--scout-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--scout-saddle-brown);
}
```

---

## LOGO

### Primary Logo: Terrain Line + Wordmark

The Scout logo consists of two elements:
1. **Terrain Line** - A topographic/elevation line representing "read the terrain"
2. **Wordmark** - "SCOUT" in Bitter Bold, letter-spacing 0.15em

### SVG Assets

**Terrain Line (standalone mark):**
```svg
<svg viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg">
  <path 
    d="M0 25 L20 15 L35 20 L50 8 L70 18 L90 5 L110 15 L130 10 L150 18 L170 12 L200 20" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

**Terrain Line (compact for favicon/icon):**
```svg
<svg viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg">
  <path 
    d="M0 18 L8 10 L15 14 L22 5 L30 12 L40 8" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

### Logo Usage

**Full Lockup (header):**
- Terrain line (white) + "SCOUT" wordmark (white) on Saddle Brown background
- Terrain line width: ~32-40px
- Wordmark: Bitter Bold, 20-24px, letter-spacing 0.15em

**Icon Only (favicon, app icon):**
- Terrain line on Saddle Brown square background
- Border radius: 20% for app icons, 0 for favicon

**Logo Colors by Context:**
| Background | Terrain Line | Wordmark |
|------------|--------------|----------|
| Saddle Brown | White | White |
| Dark Earth | Parchment | Parchment |
| Parchment/White | Saddle Brown | Saddle Brown |

---

## COMPONENT STYLING

### Spacing Scale

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px var(--scout-shadow);
  --shadow-md: 0 4px 12px var(--scout-shadow);
  --shadow-lg: 0 8px 24px var(--scout-shadow-heavy);
}
```

### Cards

```css
.card {
  background: var(--scout-white);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
}

.card-header {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--scout-saddle-brown);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--scout-border);
}
```

### Buttons

```css
.btn-primary {
  background: var(--scout-saddle-brown);
  color: white;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-sm);
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #7a3c11;
}

.btn-secondary {
  background: transparent;
  color: var(--scout-saddle-brown);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-sm);
  border: 2px solid var(--scout-saddle-brown);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--scout-saddle-brown);
  color: white;
}

.btn-link {
  background: none;
  border: none;
  color: var(--scout-sky-blue);
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}
```

### Form Inputs

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--scout-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--scout-dark-earth);
  background: var(--scout-white);
  transition: border-color 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--scout-sky-blue);
  box-shadow: 0 0 0 3px rgba(74, 144, 164, 0.15);
}

.input::placeholder {
  color: var(--scout-text-secondary);
}
```

### Tables

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--scout-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--scout-border);
}

.table td {
  padding: var(--space-4);
  border-bottom: 1px solid var(--scout-border);
  color: var(--scout-dark-earth);
}

.table tr:hover {
  background: rgba(250, 248, 240, 0.5);
}
```

---

## APP LAYOUT

### Header

```css
.app-header {
  background: var(--scout-saddle-brown);
  padding: var(--space-3) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: white;
}

.app-logo-mark {
  width: 36px;
  height: 18px;
}

.app-logo-text {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: 0.15em;
}

.app-search {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  color: white;
  width: 280px;
  font-size: var(--text-sm);
}

.app-search::placeholder {
  color: rgba(255, 255, 255, 0.6);
}
```

### Sidebar Navigation

```css
.sidebar {
  width: 240px;
  background: var(--scout-white);
  border-right: 1px solid var(--scout-border);
  height: calc(100vh - 56px);
  position: sticky;
  top: 56px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  color: var(--scout-dark-earth);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.15s ease;
}

.nav-item:hover {
  background: var(--scout-parchment);
}

.nav-item.active {
  background: rgba(139, 69, 19, 0.1);
  color: var(--scout-saddle-brown);
  border-right: 3px solid var(--scout-saddle-brown);
}
```

### Main Content Area

```css
.main-content {
  flex: 1;
  background: var(--scout-parchment);
  padding: var(--space-6);
  min-height: calc(100vh - 56px);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--scout-saddle-brown);
  margin-bottom: var(--space-2);
}

.page-subtitle {
  color: var(--scout-text-secondary);
  font-size: var(--text-lg);
}
```

---

## METRIC CARDS

### Dashboard Metric Card

```css
.metric-card {
  background: var(--scout-white);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}

.metric-label {
  font-size: var(--text-sm);
  color: var(--scout-text-secondary);
  margin-bottom: var(--space-2);
}

.metric-value {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--scout-saddle-brown);
}

.metric-change {
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}

.metric-change.positive {
  color: var(--scout-trail-green);
}

.metric-change.negative {
  color: var(--scout-clay-red);
}
```

### BANT Score Display

```css
.bant-score {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.bant-bar {
  flex: 1;
  height: 8px;
  background: var(--scout-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bant-fill {
  height: 100%;
  background: var(--scout-saddle-brown);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.bant-fill.high { background: var(--scout-trail-green); }
.bant-fill.medium { background: var(--scout-sunset-orange); }
.bant-fill.low { background: var(--scout-clay-red); }

.bant-value {
  font-weight: 600;
  min-width: 48px;
  text-align: right;
}
```

---

## TAILWIND CONFIGURATION

If using Tailwind CSS, add this to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        scout: {
          'saddle-brown': '#8b4513',
          'sky-blue': '#4a90a4',
          'parchment': '#faf8f0',
          'dark-earth': '#3d3027',
          'text-secondary': '#6b5d52',
          'sunset-orange': '#d2691e',
          'trail-green': '#5d7a5d',
          'clay-red': '#a94442',
          'border': '#e5e0d8',
        }
      },
      fontFamily: {
        'display': ['Bitter', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

---

## IMPLEMENTATION CHECKLIST

When applying Scout branding to the app:

### Phase 1: Foundation
- [ ] Add CSS variables to global stylesheet
- [ ] Import fonts (Inter from Google Fonts, Bitter for logo)
- [ ] Set base background color to Parchment
- [ ] Set base text color to Dark Earth

### Phase 2: Header
- [ ] Update header background to Saddle Brown
- [ ] Add terrain line SVG logo
- [ ] Add "SCOUT" wordmark in Bitter Bold
- [ ] Style search input with white/transparent treatment

### Phase 3: Navigation
- [ ] Update sidebar to white background with border
- [ ] Style nav items with Saddle Brown active state
- [ ] Add hover states

### Phase 4: Content
- [ ] Update cards to white with Parchment page background
- [ ] Apply heading colors (Saddle Brown for H1/H2)
- [ ] Update buttons to Saddle Brown primary
- [ ] Update links to Sky Blue

### Phase 5: Status Indicators
- [ ] Update success states to Trail Green
- [ ] Update warning states to Sunset Orange  
- [ ] Update danger states to Clay Red
- [ ] Apply status badge styling

### Phase 6: Polish
- [ ] Add favicon (terrain line on brown square)
- [ ] Update page title
- [ ] Add shadow and border-radius treatments
- [ ] Review all interactive states

---

## BRAND ASSETS FILES

After branding is applied, create these files in `/public/brand/`:

```
/public/brand/
├── logo-terrain-line.svg      # Standalone terrain mark
├── logo-full-light.svg        # Full logo for dark backgrounds
├── logo-full-dark.svg         # Full logo for light backgrounds
├── favicon.ico                # 32x32 favicon
├── favicon-16.png             # 16x16 favicon
├── favicon-32.png             # 32x32 favicon
├── apple-touch-icon.png       # 180x180 iOS icon
└── og-image.png               # 1200x630 social share image
```

---

*Scout Brand Specification v1.0*
*Read the terrain. Make the move.*
