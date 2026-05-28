# Ocean Light Design System Upgrade

## Core Palette
- **Background:** `#F7FBFF`
- **Secondary Surface:** `#EAF4FF`
- **Card Surface:** `#FFFFFF`
- **Border:** `#D6E6F5`
- **Primary:** `#2F80ED`
- **Cyan Accent:** `#00C2FF`
- **Mint Accent:** `#2EE6C5`
- **Text Primary:** `#102C4F`
- **Text Muted:** `#5C7A9B`
- **Text Dim:** `#7A92AD`

## Radius & Shadow
- **Radius:** `1.25rem` to `1.75rem`
- **Shadow:** `0 8px 24px rgba(47, 128, 237, 0.08)`
- **Glass Surface:** `backdrop-filter: blur(16px)` with soft white translucency

## Key Structural Changes
- `src/index.css` now defines a light, oceanic root theme with accessible hue variables.
- `tailwind.config.ts` was updated to expose `bg-primary`, `bg-secondary`, `bg-tertiary`, `brand`, `brand-cyan`, and `brand-mint` colors.
- `AppShell`, `AppSidebar`, and `TopNav` were restyled for a bright, premium interface.

## Component Enhancements
- `src/components/editor/SectionNavigator.tsx`
  - Added perspective context and floating glass panel styling.
  - Active section now visually lifts with a soft ocean shadow.
- `src/components/dashboard/StatCard.tsx`
  - Cards now use white surfaces, softer borders, and premium floating shadows.
- `src/pages/ProjectEditor.tsx`
  - Main editor canvas now uses a white glass surface and perspective container for spatial depth.
- `src/components/projects/NewProjectWizard/index.tsx`
  - Wizard dialog now uses a layered light panel system with premium borders and glass overlays.

## Visual Intent
- Clean Apple-style clarity with oceanic subtlety.
- Functional 3D depth through shadows, perspective and layered glass panels.
- High contrast for text and data, with soft blue depth for interactive surfaces.

## Notes
- No dark mode was introduced.
- The palette is intentionally light and premium to support the new Ocean Light branding.
