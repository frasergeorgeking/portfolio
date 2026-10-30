# Repository Instructions

## Architecture and conventions

This is an Astro portfolio with React islands for interactive features. Use Astro components for static UI and React for client-side interactions, including React Three Fiber scenes and Rapier physics. Read `package.json` for current dependency versions and scripts.

- Use `@/` for imports from `src/`; preserve path casing (for example, `@/lib/utils`).
- Use `class:list` for conditional classes in Astro templates and `mergeClassNames()` from `@/lib/utils` when Tailwind conflict resolution is needed.
- Reuse the bento card pattern in `src/components/ui/bento/`; `BentoCardBase.astro` provides a default content slot and a named `background` slot.
- Use `src/components/shared/Icon.astro` for icons, with keys from `src/components/shared/iconPaths.ts`. It supports gradients.
- Keep theme variables in `src/styles/global.css`. Tailwind is integrated through Vite in `astro.config.mjs`, alongside `vite-plugin-glsl` for shaders.
- For generated UI components, follow the aliases and style configured in `components.json`.

## React islands and 3D scenes

- Match hydration to when the component is needed: the lanyard and dot-pattern background use `client:load`, while game cases use `client:visible`.
- When adding or changing 3D scene loading, follow `src/components/ui/loading/LazyScene.astro`, `sceneLifecycle.ts`, `useSceneReady.ts`, and `SceneErrorBoundary.tsx` in that directory. Match the canvas `boundaryId` to its wrapper's ID so loading and error states update the correct scene.
- Call `useSceneReady(boundaryId)` inside the model that suspends while loading assets; it reports readiness after the loaded model's first render.

## Content and layout

- Page routes live in `src/pages/`; the shared page shell is `src/layouts/base/BaseLayout.astro`, with header, footer, and head components alongside it.
- For game-jam content changes, read the collection schema in `src/content.config.ts` and the existing entries in `src/data/game-jams/`. Contributor IDs resolve through `contributors.ts` in that directory.

## Development and validation

Use pnpm; its version is pinned in the `packageManager` field of `package.json`. CI uses Node.js 22.

Run commands from the repository root:

```bash
pnpm install --frozen-lockfile # Install dependencies from the lockfile
pnpm dev                       # Dev server at localhost:4321, exposed via --host
pnpm check:ci                  # Biome checks without auto-fix, then Astro diagnostics
pnpm check                     # Biome checks with auto-fix, then Astro diagnostics
pnpm build                     # Production build to dist/
```

For code changes, run `pnpm check:ci` and `pnpm build`. Biome excludes `.astro` files; preserve their local formatting and use Astro diagnostics and the build for validation. There is currently no dedicated test script in `package.json`.

## CI and commits

- Pull requests to `main` run commitlint, Biome and Astro checks, and a production build via `.github/workflows/pr-checks.yaml`. That workflow also calls `.github/workflows/performance-test.yaml` for sitespeed.io performance budgets, configured in `.github/sitespeed/sitespeed-budget.json`.
- Use Conventional Commits as configured in `commitlint.config.cjs`; the commit-message hook and PR checks enforce them. Pushes to `main` trigger semantic-release through `.github/workflows/release.yaml`.
