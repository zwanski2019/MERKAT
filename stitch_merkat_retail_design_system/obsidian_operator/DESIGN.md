---
name: Obsidian Operator
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#c4c7c9'
  on-tertiary: '#2d3133'
  tertiary-container: '#a0a3a5'
  on-tertiary-container: '#36393b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
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
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.08em
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
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is an "operator-grade" interface designed for high-stakes retail environments. It prioritizes information density, rapid scanning, and visual endurance. The brand personality is precise, authoritative, and technical, catering to retail managers and inventory specialists who require a tool that feels like a professional console.

The style is **High-Contrast / Modern**, utilizing a deep slate foundation to reduce eye strain during long shifts while employing high-energy emerald accents to highlight critical actions and status changes. It leans into a systematic, utility-first aesthetic where every pixel serves a functional purpose.

## Colors
The palette is anchored in a high-contrast dark environment. The primary emerald (#10b981) is used sparingly for call-to-actions, successful states, and "active" indicators. 

- **Background:** A deep slate (#0f172a) ensures high text contrast.
- **Surfaces:** Use tiered slate values to create hierarchy without relying on shadows.
- **Accents:** Emerald is the only chromatic driver for interaction; other colors are reserved for semantic status (Warning/Error).
- **Text:** Primary text should be near-white (#f8fafc) for maximum legibility, with muted slate (#94a3b8) for secondary metadata.

## Typography
The typography system balances modern sans-serifs for readability with monospaced accents for technical data.

- **Headlines:** Use Hanken Grotesk for its sharp, contemporary geometry and excellent legibility at large scales.
- **Body:** Inter is the workhorse for all UI text, providing a neutral and highly functional reading experience.
- **Labels/Data:** JetBrains Mono is utilized for SKU numbers, price points, timestamps, and table headers to reinforce the "operator" aesthetic and ensure character alignment in dense data views.

## Layout & Spacing
This design system utilizes a strict **4px baseline grid** to maintain high information density. 

- **Layout Model:** A 12-column fluid grid for desktop and tablet, collapsing to a single column on mobile. 
- **Density:** Padding is intentionally compact (8px–16px) to maximize the "above the fold" data visibility. 
- **Alignment:** All elements must snap to the 4px increments. Internal component spacing (e.g., icon to text) should consistently use the `sm` (8px) token.

## Elevation & Depth
In this high-contrast dark mode, depth is communicated through **Tonal Layering** and **Strong Outlines** rather than soft shadows.

- **Z-Index Strategy:** The background is the darkest layer (#0f172a). As elements move "closer" to the user, they become lighter (#1e293b, then #334155).
- **Outlines:** Use 1px solid borders (#1e293b) to define component boundaries. For active or focused states, transition the border to the primary Emerald or a Strong Slate (#475569).
- **Zero Shadows:** Avoid drop shadows to keep the interface feeling flat, fast, and digital. Depth is perceived via color value shifts.

## Shapes
The shape language is "Soft" (0.25rem), providing a professional, engineered feel that avoids the playfulness of fully rounded corners.

- **Components:** Buttons and input fields use a 4px radius.
- **Containers:** Cards and modals use an 8px (rounded-lg) radius to slightly soften the structure of the layout.
- **Interactive States:** Focus rings should follow the component's corner radius with a 2px offset.

## Components
- **Buttons:** Primary buttons are solid Emerald (#10b981) with black text for maximum contrast. Secondary buttons are outlined in Slate-600.
- **Inputs:** Dark backgrounds (#0f172a) with subtle slate borders. On focus, the border glows Emerald.
- **Chips:** Monospaced text (JetBrains Mono) inside small, low-contrast slate containers. Used for status tags like "In Stock" or "Pending."
- **Data Tables:** High-density rows with 1px slate dividers. Alternate row striping is discouraged; use hover states to highlight rows instead.
- **Cards:** No shadows. Defined by a 1px border (#1e293b) and a slightly lighter surface than the background.
- **Status Indicators:** Use small, high-chroma dots (8px) next to labels to indicate real-time system status.