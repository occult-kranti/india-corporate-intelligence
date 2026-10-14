---
name: ICIP Public Record Atlas
description: A geographic workspace for source-led research into India's institutions and public money.
colors:
  ocean: "#071c24"
  elevated: "#102a34"
  surface: "#17343e"
  surface-hover: "#20444e"
  land: "#123642"
  boundary: "#739f9e"
  selection: "#a9d6c1"
  action: "#b0d8c4"
  paper: "#e8e4d8"
  paper-ink: "#182c32"
  text: "#f1eee4"
  text-secondary: "#bdcdce"
  text-muted: "#9eb5b9"
  focus: "#e7bd76"
typography:
  page-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(29px, 3vw, 44px)"
    fontWeight: 550
    lineHeight: 1.14
    letterSpacing: "-0.035em"
  case-title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(20px, 1.8vw, 25px)"
    fontWeight: 500
    lineHeight: 1.38
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.7
  measurement:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    lineHeight: 1.6
rounded:
  control: "6px"
  record: "9px"
spacing:
  compact: "8px"
  control: "12px"
  panel: "24px"
  section: "40px"
components:
  navigation-selected:
    backgroundColor: "#b3d5c4"
    textColor: "#132b32"
    rounded: "{rounded.control}"
    padding: "10px 9px"
  source-expanded:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.record}"
    padding: "23px"
---

# Design System: ICIP Public Record Atlas

## Overview

**Creative North Star: “The Public Record Atlas”**

The map is the principal working surface. A committed petrol palette keeps cartographic layers continuous across the application; jade marks selection, and warm paper gives opened evidence a distinct reading plane. The user explicitly rejected the preceding uniform, compressed map-and-card interface and authorized the replacement world across all routes.

This is an operating product. Familiar links, selects, range controls, tables and buttons carry the interaction. Spatial depth, readable source material and a clear distinction between sectors supply character; invented instruments or decorative statistics do not. Product truth remains in `PRODUCT.md`, and route-specific strategy lives in `.design/atlas-brief.md`.

## Colors

The token frontmatter and CSS are the source of truth. `src/index.css` provides global Tailwind-compatible colors; `src/components/investigation/shell.css` exposes the `--atlas-*` tokens to shared map, network and reading components.

Petrol is the spatial canvas and navigation material. Jade identifies an active place, selected control or available action. Paper and its own dark ink support close reading. The warm focus ring remains clearly visible on either material. Existing evidence-tier colors retain their declared meanings; selection color never implies guilt, reliability or severity.

## Typography

Locally hosted Inter is the operational voice: controls, page titles and navigation. Locally hosted Playfair Display distinguishes case/source titles from the surrounding controls. IBM Plex Mono is reserved for dates, coordinates, stable IDs and numerical comparisons. Body copy normally measures 65–78 characters; long URLs and source titles must wrap.

Titles use an explicit 22–44px hierarchy rather than one uniformly small label. Small controls and citation metadata are denser, but mobile text inputs remain at least 16px. Repeated ornamental eyebrows are avoided; meaningful evidence type, record date and source labels remain visible.

## Layout

At 1280px and above, a 168px labeled sector rail frames the work surface. At 1024–1279px the rail is 80px. Below 1024px a horizontally scrolling 47px sector bar replaces it, and the active route is brought into view. The masthead is 64px, reducing to 60px below 640px. `--atlas-shell-height` includes both masthead and the mobile sector bar.

Main remains the page scroll container. The national and sector map views place a large map beside a source/case dock, with time controls attached to the geographic workspace. Narrow screens place the map and evidence in a continuous vertical flow. Legacy dossiers remain deliberate reading views within the same shell; comparison tables may scroll locally.

## Elevation & Depth

Depth distinguishes work planes. Shared elevated material uses `0 18px 48px -20px #000c, 0 5px 12px -5px #0006`; compact controls use `0 3px 8px #0003`. The navigation casts a directional shadow into the work surface. The cartographic surface may use actual geometry and a restrained measuring grid; paper and navigation do not receive decorative grain or repeated stripes.

3D height, node position, shadows, camera position and relative visual size are not evidential quantities unless an explicit data encoding and legend say so. Flat views and accessible records remain available.

## Shapes

Controls use restrained 5–6px rounding. Expanded source material uses a 9px reading surface. Source registers favor continuous rows and fine rules over equal card grids. Icons use the existing Lucide stroke family; geography is sourced geometry rather than an illustrative approximation.

## Components

The navigation library is a native modal dialog with filtered groups, a named close control, Escape support and focus restoration. The atlas rail, all-register library and mobile sector bar expose the same route system. The skip link targets the main content region.

All hover, selected and focus states use visible tonal or outline changes. Selection remains legible without color alone through `aria-current` or `aria-pressed`. Browser text selection, caret, scrollbars, tabular figures and underline offsets belong to the same palette.

The signature transition belongs to spatial navigation and evidence opening. The library has one short 280ms movement using `cubic-bezier(.16,1,.3,1)`. Reduced-motion preferences disable animation, transitions and smooth scrolling throughout the shell.

## Do's and Don'ts

- Keep the actual source, date, stage, geographic basis and response close to the claim.
- Preserve saved research, URL context, legacy dossiers and keyboard paths.
- Label national context, unknown location and approximate location honestly.
- Do not use connectivity or map prominence as an allegation ranking.
- Do not turn absence of retained evidence into an absence-of-activity claim.
- Do not claim participant research or cross-browser/accessibility certification from AI review or Chromium checks. Verification evidence belongs in `.design/atlas-report.md`.
