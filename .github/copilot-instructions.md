# Copilot Instructions

## Architecture Overview
This is an **Astro 5 portfolio site** with React components for interactive 3D elements. Key architectural patterns:

- **Astro components** (`.astro`) for static/server-rendered UI
- **React components** (`.tsx`) only for interactive features requiring client-side JS (e.g., `Lanyard.tsx` uses React Three Fiber for 3D physics)
- **Bento grid layout** pattern for modular card-based UI (`src/components/ui/bento/`)
- **Path alias**: Use `@/` for imports from `src/` (e.g., `import { mergeClassNames } from "@/lib/Utils"`)

## Tech Stack
- **Astro 5** with React integration (`@astrojs/react`)
- **Tailwind CSS 4** via Vite plugin (not PostCSS)
- **React Three Fiber** + Rapier physics for 3D components
- **shadcn/ui** configured with `new-york` style (see `components.json`)
- **Biome** for linting/formatting (not ESLint/Prettier)

## Component Patterns

### Astro Components
- Use `class:list` for conditional classes in Astro templates
- Slot pattern for composable cards (see `BentoCardBase.astro` with `slot="background"`)

### React Islands
- Use `client:load` directive for React components that need immediate hydration
- Global events via `GlobalEvents.ts` namespace for cross-component communication:
  ```ts
  window.dispatchEvent(GlobalEvents.LanyardLoaded);
  ```

### Icons
- SVG icons defined in `src/components/shared/IconPaths.ts` as path strings
- Use `<Icon icon="icon-name" />` component, supports gradients

### Styling
- Use `mergeClassNames()` from `@/lib/Utils` for Tailwind class merging (wrapper around clsx + tailwind-merge)
- CSS variables defined in `src/styles/global.css` for theming (gray scale, accent colors, gradients)
- GLSL shaders supported via `vite-plugin-glsl` (see `holographic.frag`)

## Commands
```bash
pnpm dev          # Dev server with hot reload at localhost:4321
pnpm build        # Production build to ./dist/
pnpm check:ci     # Biome lint/format check (CI mode, no auto-fix)
pnpm check        # Biome check with auto-fix
```

## CI Pipeline
Pull requests to `main` run Biome checks and build verification (`.github/workflows/ci.yaml`).

## File Organization
```
src/
├── components/
│   ├── layout/      # Header, Footer, MainHead
│   ├── sections/    # Page sections
│   ├── shared/      # Reusable (Icon, SocialLinks)
│   └── ui/          # UI primitives (bento cards, buttons, badges)
├── events/          # Global browser events
├── layouts/         # Page layouts (BaseLayout wraps all pages)
├── lib/             # Utilities (mergeClassNames, assertNotNullish)
└── pages/           # Astro page routes
```
