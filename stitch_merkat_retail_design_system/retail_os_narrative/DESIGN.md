---
name: Retail OS Narrative
colors:
  surface: '#f4fbf4'
  surface-dim: '#d4dcd5'
  surface-bright: '#f4fbf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef6ee'
  surface-container: '#e8f0e9'
  surface-container-high: '#e3eae3'
  surface-container-highest: '#dde4dd'
  on-surface: '#161d19'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#2b322d'
  inverse-on-surface: '#ebf3eb'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#5f5e61'
  on-secondary: '#ffffff'
  secondary-container: '#e4e1e6'
  on-secondary-container: '#656467'
  tertiary: '#a43a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e4e1e6'
  secondary-fixed-dim: '#c8c5ca'
  on-secondary-fixed: '#1b1b1e'
  on-secondary-fixed-variant: '#47464a'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#f4fbf4'
  on-background: '#161d19'
  surface-variant: '#dde4dd'
typography:
  page-title:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  section-header:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  meta:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  data-tabular:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar_width: 260px
  header_height: 64px
  container_gutter: 24px
---

## Brand & Style

The design system is built for high-stakes retail operations, emphasizing **data confidence, calmness, and utility**. It positions itself as an "invisible" operating system—a neutral chrome that recedes to prioritize user data and tenant branding.

The style is **Modern Corporate**, leaning into a "Technical Minimalist" aesthetic. It avoids decorative flourishes in favor of precision, high legibility, and functional density. The emotional response should be one of control and reliability, ensuring operators can manage complex inventory and logistics without cognitive overwhelm.

Key pillars:
- **Operator-Grade:** Every pixel serves a functional purpose.
- **Data-Confident:** Numerical data is presented with absolute clarity using tabular lining.
- **Calmness:** A restricted, neutral palette prevents visual fatigue during long shifts.

## Colors

The palette is anchored by a neutral grayscale to ensure maximum compatibility with various product categories. **Emerald (#10B981)** is used sparingly as the primary action color, signifying growth and "go" states.

- **Canvas vs. Surface:** Use the Canvas color for the global background and the Surface color for cards, modals, and raised containers to create subtle hierarchical separation.
- **Semantic Clarity:** Amber and Red are reserved strictly for system alerts, stock warnings, and destructive actions.
- **Adaptability:** The interface should transition seamlessly between light and dark modes, maintaining the same contrast ratios for accessibility.

## Typography

The system utilizes a dual-font approach: **Geist** for UI headings and numerical data to provide a technical, modern edge, and **Inter** for body copy to ensure maximum readability.

**Critical Numerical Rule:** All currency, stock counts, and timestamps must use `font-variant-numeric: tabular-nums` and `lining-nums`. This ensures that columns of numbers align perfectly in tables, allowing for instant scanning and comparison.

Typography scales are kept tight and functional. Large display sizes are avoided to maintain a high information density suitable for professional dashboard environments.

## Layout & Spacing

This design system follows a **Fixed-Fluid hybrid grid**. The sidebar is a fixed 260px width, while the main content area fluidly expands.

- **Sidebar:** Left-aligned navigation containing the primary module switcher.
- **Top Bar:** A global utility bar (64px height) housing search, AI-assistant trigger, and account settings.
- **Density:** We utilize a "Comfortable Professional" density. Data tables should use 8px vertical padding for rows to allow for high visibility without feeling cramped.
- **Breakpoints:**
  - **Mobile (<768px):** Sidebar collapses into a bottom navigation or "hamburger" menu. Margins reduce to 16px.
  - **Desktop (>1024px):** Standard 24px margins with a 12-column internal grid for dashboard widgets.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layering** and **Thin Outlines** rather than heavy shadows.

- **Level 0 (Canvas):** The base background layer.
- **Level 1 (Cards/Surface):** 1px border (#E4E4E7) with no shadow. This is the default state for content containers.
- **Level 2 (Floating/Modals):** Elements that sit above the UI (dropdowns, popovers, modals) use a soft, diffused shadow: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`.
- **Interaction:** On hover, interactive cards may increase their border contrast slightly, but they do not "lift" off the page.

## Shapes

The shape language balances approachability with professional structure. 

- **Cards:** Use a 12px (`rounded-lg`) radius to frame major content sections softly.
- **Interactive Elements:** Buttons, input fields, and chips use a more disciplined 8px (`rounded-md`) radius.
- **Consistency:** All borders are a consistent 1px thin line. Avoid "heavy" or "bold" borders to keep the UI light and airy despite high data density.

## Components

- **Buttons:** Primary buttons use the Emerald background with white text. Secondary buttons are ghost-style with a 1px border. Focus states must always be clearly visible with a 2px offset ring.
- **Inputs:** Use the 8px radius. Active/Focus state uses a 1px Emerald border. Placeholders must be clearly distinguished from entered text using the Muted Text color.
- **Data Tables:** The core of the OS. Headers are in `meta` style (uppercase, 12px, bold). Rows use alternating subtle fills or 1px bottom borders. Cells containing numbers must use the `data-tabular` type style.
- **Chips/Badges:** Small, 4px rounded radius. Use low-opacity tints of the semantic colors (e.g., light green background for a "Success" state) with high-contrast text.
- **Sidebar Nav:** High-contrast active states. Use icons with a 20px bounding box, paired with `body-sm` weight typography.
- **AI Interface:** A dedicated "Command Bar" style input in the top bar, utilizing a subtle gradient border to distinguish it from standard search.