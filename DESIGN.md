---
name: MyTuums
description: A focused social platform for gamers that uses the shipped ShadCN Radix Nova preset as its full visual system.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  popover: "oklch(1 0 0)"
  primary: "oklch(0.525 0.223 3.958)"
  primary-foreground: "oklch(0.971 0.014 343.198)"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
typography:
  display:
    fontFamily: "Raleway Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4286
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  alert-destructive:
    backgroundColor: "{colors.card}"
    textColor: "{colors.destructive}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
---

# Design System: MyTuums

## Overview

**Creative North Star: "The social media for gamers"**

MyTuums uses the shipped ShadCN Radix Nova preset as its design system, not as raw material for a custom visual rewrite. The product can feel sharp, welcoming, and focused only if agents stop trying to out-design the preset. The correct move is to compose screens from the existing tokens and primitives already present in the repo.

This system separates MyTuums from Twitter/X through structure, not through decorative styling. Feeds are card-based, identity is framed, posting is presented as a clear action surface, and navigation lives in contained bars, menus, and sheets instead of collapsing into a flat text stream. Differentiation comes from composition and product behavior, not from custom palettes, altered radii, or new type systems.

**Key Characteristics:**
- ShadCN components and theme are the source of truth.
- Preset tokens remain untouched: colors, fonts, radii, and spacing logic.
- Surfaces are crisp, confident, and noticeably lifted.
- Social features live in contained cards and panels, not divider-only timeline rows.
- Visual consistency matters more than custom flair.

## Colors

The palette is the shipped ShadCN theme. Use its semantic tokens exactly as they are defined in the repo.

### Primary
- **Theme Primary** (`oklch(0.525 0.223 3.958)`): Use through the preset `primary` token for primary buttons, selected state, key icons, notification dots, links that need explicit emphasis, and avatar fallback accents. It is the one strong accent already supplied by the theme.

### Secondary
- **Theme Secondary** (`oklch(0.967 0.001 286.375)`): Use through `secondary` for quiet actions and soft supporting surfaces that need more presence than `muted` but less contrast than `primary`.

### Neutral
- **Theme Background** (`oklch(1 0 0)`): The page canvas and the baseline reading surface.
- **Theme Card** (`oklch(1 0 0)`): The default container surface for cards, auth shells, and elevated content blocks.
- **Theme Foreground** (`oklch(0.145 0 0)`): The primary text and icon color.
- **Theme Muted** (`oklch(0.97 0 0)`): Secondary fills, footer bands, chips, and quiet state containers.
- **Theme Muted Foreground** (`oklch(0.556 0 0)`): Metadata, helper text, and secondary copy.
- **Theme Border / Input / Ring** (`oklch(0.922 0 0)`, `oklch(0.922 0 0)`, `oklch(0.708 0 0)`): The preset structural edge, field line, and focus ring vocabulary. These are functional tokens, not styling opportunities.

**The Preset Token Rule.** All color comes from the active ShadCN theme tokens. No custom hex values, no feed-specific accent experiments, no hand-painted brand ramps.

**The One Accent Rule.** The preset `primary` token is the only strong accent. If a screen needs more drama, solve it with layout and component hierarchy, not new colors.

## Typography

**Display Font:** Raleway Variable (with sans-serif fallback)
**Body Font:** Inter Variable (with sans-serif fallback)
**Label/Mono Font:** Inter Variable (with sans-serif fallback)

**Character:** Typography stays with the preset. Inter carries nearly all product UI and post content, while Raleway appears only where the repo already wires `font-heading`. Do not introduce new font families, swap the preset pairing, or add decorative display type to force personality.

### Hierarchy
- **Display** (600, `1rem`, `1.25`, `-0.025em`): Reserved for the wordmark and the few heading touchpoints already mapped to `font-heading`.
- **Headline** (600, `1.5rem`, `1.333`): Route-level auth titles and page-entry headings.
- **Title** (500, `1rem`, `1.375`): Card titles, composer headings, sheet titles, and compact structure markers.
- **Body** (400, `0.875rem` to `1rem`, `1.5`): Post text, helper copy, explanatory text, and form content.
- **Label** (500, `0.875rem`, `1.4286`, normal case): Buttons, nav items, dropdown items, chips, and control labels. Uppercase is reserved for small section labels only.

**The No Font Drift Rule.** Use the preset font families exactly as shipped. No custom brand font swaps, no extra display face, no mono detours.

**The Heading Restraint Rule.** `font-heading` is scarce. It marks structure, not spectacle.

## Elevation

This system is noticeably lifted, but the lift is still preset-driven. Cards, popovers, dropdowns, sheets, and the sticky header use Tailwind and ShadCN rings plus standard shadow steps to separate layers from the canvas. Depth should feel clean and useful, not atmospheric or decorative.

### Shadow Vocabulary
- **Surface line** (`box-shadow: 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent)`): The default separation line on cards, popovers, menus, and sticky surfaces.
- **Light lift** (`box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`): Light elevation for cards and composer shells.
- **Menu lift** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`): Dropdown menus and active interactive overlays.
- **Overlay lift** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`): Sheets and the highest-surface overlays.

**The Noticeable Lift Rule.** Surfaces may feel lifted, but only with the preset ring and shadow stack. No custom glows, no glass cards, no decorative light fields.

**The Blur Is For Overlays Rule.** Backdrop blur belongs to sticky headers and overlay backdrops only.

## Components

Component philosophy: crisp and confident. Build from the shipped ShadCN primitives first, then compose product-specific layouts around them.

### Buttons
- **Shape:** Preset rounded corners (`0.625rem` by default, capped smaller on compact and icon sizes).
- **Primary:** Use the ShadCN `default` variant unchanged for primary actions, with the preset `primary` fill, medium label weight, `2rem` height, and compact horizontal padding.
- **Hover / Focus:** Keep the preset tone shift, `focus-visible` ring, and small active press translation.
- **Secondary / Ghost / Outline / Destructive:** Use the built-in variants only. Do not draw new button silhouettes or invent a custom CTA family.

### Cards / Containers
- **Corner Style:** Rounded extra-large containers (`0.875rem`) using the preset card shell.
- **Background:** `card` for the main surface, `muted/50` for footer bands and soft sectional separation.
- **Shadow Strategy:** `ring-1` is the default edge; `shadow-sm` and above are added only when the surface is intentionally lifted.
- **Border:** Prefer the preset ring and muted separators over heavy explicit borders.
- **Internal Padding:** `1rem` standard, `0.75rem` on compact cards.

### Inputs / Fields
- **Style:** Transparent or theme-backed field surface, `2rem` height on inputs, compact horizontal padding, and the same rounded preset corners used across controls.
- **Focus:** Always use the preset border and ring treatment. Never replace it with a custom glow.
- **Error / Disabled:** Use the existing destructive and disabled states. No bespoke validation palette.

### Navigation
- **Header:** Sticky, `4rem` high, max width `72rem`, bordered, and lightly blurred.
- **Desktop nav links:** Muted by default, foreground on hover, `bg-muted` when active.
- **Dropdowns and sheets:** Use popover surfaces, rounded corners, and the preset enter and exit motion.
- **Mobile nav:** Lives in a right sheet using the same typography and token vocabulary as desktop.

### Alerts
- **Default alert:** Card-toned surface with subdued explanatory copy.
- **Destructive alert:** Same card shell, but semantic destructive text. The component stays structurally consistent with the rest of the system.

### Feed Surfaces
- **Composer:** An elevated card shell with a primary icon, a large textarea (`min-height: 8rem`), a live count, and one primary action.
- **Post card:** Avatar and identity metadata at the top, readable post body, optional game chip, and a muted footer band for metrics.
- **Structure:** Use cards and contained sections for social content. Do not reduce feeds to a flat list of rows and dividers.

## Do's and Don'ts

### Do:
- **Do** use ShadCN components and theme as the default vocabulary.
- **Do** consume the existing tokens (`primary`, `background`, `card`, `border`, `ring`, `font-heading`, `font-sans`, `radius`) rather than redefining them.
- **Do** keep social surfaces card-based and structurally separated, so the feed does not collapse into a Twitter/X-like text wall.
- **Do** use the preset focus ring, shadow, and motion values exactly as they already exist.
- **Do** keep components crisp and confident: compact controls, medium labels, clear active states.

### Don't:
- **Don't** make the UI look too similar to Twitter/X.
- **Don't** recreate the familiar text-wall timeline look, divider-heavy feed sameness, or generic social-media scaffolding that reads like a Twitter/X reskin.
- **Don't** override ShadCN theme colors, border radius, fonts, spacing logic, or core component shapes.
- **Don't** replace ShadCN primitives with bespoke buttons, cards, inputs, menus, or sheets when the preset already provides the pattern.
- **Don't** introduce custom brand hexes, alternate radii, new font pairings, or decorative gradients and glassmorphism to force differentiation.
