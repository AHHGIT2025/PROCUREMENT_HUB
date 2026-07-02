---
name: Executive Flux
colors:
  surface: '#FFFFFF'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4e5e81'
  primary: '#031635'
  on-primary: '#ffffff'
  primary-container: '#1a2b4b'
  on-primary-container: '#8293b8'
  inverse-primary: '#b6c6ef'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#231400'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e2700'
  on-tertiary-container: '#b08d5b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#b6c6ef'
  on-primary-fixed: '#081b3a'
  on-primary-fixed-variant: '#364768'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffddb1'
  tertiary-fixed-dim: '#e8c08a'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#5d4217'
  background: '#F8FAFC'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  border: '#E2E8F0'
  success: '#10B981'
  warning: '#F59E0B'
  danger: '#E11D48'
  info: '#3B82F6'
  success-soft: '#ECFDF5'
  warning-soft: '#FFFBEB'
  danger-soft: '#FFF1F2'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1440px
---

## Brand & Style

The design system is engineered for high-stakes enterprise resource planning and procurement workflows. It targets procurement officers, department heads, and financial controllers who require a high-density, low-friction interface that prioritizes speed of decision-making and data integrity.

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. It emphasizes structural clarity over decorative flair, utilizing generous white space to reduce cognitive load during complex requisition tasks. The aesthetic draws from the precision of modern SaaS (ServiceNow) while maintaining the authoritative stability of legacy ERPs (SAP Fiori), resulting in a "Trustworthy-Intelligent" interface.

**Design Principles:**
- **Clarity over Visual Noise:** Every pixel must serve a functional purpose in the procurement lifecycle.
- **Data Density:** Information is packed efficiently using a strict baseline grid, ensuring dashboards are comprehensive without feeling cluttered.
- **Workflow Continuity:** Visual cues such as timelines and status indicators use consistent color logic to guide the user through approval stages.

## Colors

The palette is anchored by **Deep Navy (#1A2B4B)** to project authority and stability. **Professional Blue (#2563EB)** is utilized for primary actions and interactive states (hover, focus), creating a clear distinction between static branding and functional elements.

The background system uses a tiered approach:
- **Background (#F8FAFC):** Used for the main application canvas to provide a soft, low-strain environment.
- **Surface (#FFFFFF):** Used for cards, tables, and modal containers to create a "lifted" feel.
- **Semantic Colors:** Status colors (Success, Warning, Danger) are paired with "soft" variants for background tints in chips and alerts, ensuring high readability without overwhelming the user with saturated hues.

## Typography

This design system uses a dual-sans approach to balance modern aesthetics with utilitarian function. 

- **Headlines (Hanken Grotesk):** A sharp, contemporary grotesque that provides a "tech-forward" executive feel.
- **Body & Interface (Inter):** Chosen for its exceptional legibility in data-heavy environments and its neutral, systematic tone.
- **Data/Monospace (JetBrains Mono):** Reserved for SKU numbers, transaction IDs, and currency values to ensure character distinctness and alignment in vertical lists.

**Hierarchy Rules:**
- Use `headline-sm` for card titles.
- Use `body-sm` for the majority of table data to maximize information density.
- Labels for status chips must use `label-md` with a 0.05em letter spacing for clarity at small sizes.

## Layout & Spacing

The layout utilizes a **Fixed Grid** on desktop, centered within a 1440px container, and a **Fluid Grid** on mobile and tablet devices. 

**Desktop Model:**
- **Navigation:** A fixed 240px left-hand sidebar for primary modules (Requests, Inventory, Approvals).
- **Grid:** 12-column system with 20px gutters.
- **Density:** High density is achieved through a 4px baseline. Padding within table cells and input fields should strictly follow the `sm` (8px) or `md` (16px) units.

**Responsive Behavior:**
- **Tablet (768px - 1024px):** Sidebar collapses into a 64px icon-only bar. Gutters reduce to 16px.
- **Mobile (< 768px):** Single column flow. Top-level navigation moves to a bottom bar or hamburger menu. Horizontal scrolling is permitted only for complex data tables.

## Elevation & Depth

This design system avoids heavy skuemorphism, instead using **Tonal Layers** and **Ambient Shadows** to define hierarchy.

- **Level 0 (Background):** Base layer (#F8FAFC).
- **Level 1 (Surface):** Cards and main content areas. Use a subtle 1px border (#E2E8F0) and no shadow.
- **Level 2 (Interactive/Floating):** Use for active states or hover transitions on cards. Apply a soft, diffused shadow: `0 4px 12px rgba(26, 43, 75, 0.05)`.
- **Level 3 (Overlay):** Modals and dropdown menus. These use a more pronounced shadow: `0 12px 32px rgba(26, 43, 75, 0.12)` to separate the interaction from the data behind it.

**Depth through Color:**
Workflow timelines use a "stepper" line in `#E2E8F0`, with active nodes utilizing the Primary Blue for a clear visual path through the approval process.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional, "tailored" appearance that is more modern than sharp corners but more serious than highly rounded "bubbly" consumer apps.

- **Buttons & Inputs:** 4px (0.25rem) radius.
- **Cards & Modals:** 8px (0.5rem) radius for a distinct container feel.
- **Status Chips:** 100px (Pill-shaped) to distinguish them clearly from interactive buttons.
- **Checkboxes:** 2px radius to maintain a crisp, clickable look.

## Components

### Buttons
- **Primary:** Deep Navy background, white text. High emphasis.
- **Secondary:** Professional Blue ghost style (border and text) or solid for secondary actions.
- **Tertiary:** Text-only with Professional Blue color, used for "Cancel" or "View Details" inside tables.

### Data Tables
- **Header:** Light gray (#F1F5F9) background with `label-md` typography.
- **Rows:** White background, 1px bottom border. Hover state should use a very subtle tint of Professional Blue at 5% opacity.
- **Density:** 8px vertical padding for standard density; 4px for "compact" mode.

### Status Chips
- **Approved:** `success-soft` background with `success` text.
- **Pending:** `warning-soft` background with `warning` text.
- **Rejected:** `danger-soft` background with `danger` text.
- All chips use `label-md` and are pill-shaped.

### Input Fields
- **Default:** White background, 1px `border` (#E2E8F0), `body-sm` text.
- **Focus:** 1px `secondary-color` border with a 2px outer glow at 10% opacity.
- **Validation:** Use `danger` color for border and helper text on error.

### Workflow Timelines
- Vertical or horizontal orientation depending on context.
- **Completed steps:** Primary Blue circle with white checkmark.
- **Active step:** Primary Blue ring with a pulsing center.
- **Future steps:** Light gray circle with thin border.