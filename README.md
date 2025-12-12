# 🌟 Portfolio

A modern, custom-built portfolio site powered by Astro, featuring a bento grid layout, 3D interactive elements, and minimalistic design aesthetics.

The coolest part of the site is undoubtedly the [lanyard component](./src/components/ui/lanyard/Lanyard.tsx) on the landing page. This component is a modified version of that [provided by ReactBits](https://www.reactbits.dev/components/lanyard). The lighting, camera and physics have been tweaked as required, and the card has been completely re-textured in a PBR-workflow with Substance 3D Painter. A funky holographic shader is then deterministically applied based on the angle of card.

## 🚀 Tech Stack

The site is built with Astro primarily for it's server-first approach. The site is incredibly performant to load and streams in interactive React components, such as the lanyard and background, asynchronously.

- **[Astro](https://astro.build/)** - Static site generator
- **[React](https://react.dev/)** - Interactive components
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** + **[ReactBits](https://www.reactbits.dev/)** - Interactive lazy-loaded UI components
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)** - 3D graphics with physics
- **[Biome](https://biomejs.dev/)** - Linting and formatting

## 🔄 CI/CD
- **PR Checks** - Runs Biome linting/formatting checks, validates commit messages with commitlint, validates the project builds, and performs performance testing with sitespeed.io on all pull requests to `main`. Performance budgets gate merges if regressions are detected.
- **Production Performance** - Manual workflow to test live site performance with 4G throttling using sitespeed.io. Results are stored as artifacts indefinitely.
- **Release** - Automatically creates semantic releases on pushes to `main` branch

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                                      |
| :------------------------ | :---------------------------------------------------------- |
| `pnpm install`            | Install project dependencies                                |
| `pnpm dev`                | Start local dev server at `localhost:4321` (with host flag) |
| `pnpm build`              | Build production site to `./dist/`                          |
| `pnpm preview`            | Preview production build locally before deploying           |
| `pnpm astro ...`          | Run Astro CLI commands (e.g., `astro add`, `astro check`)  |
| `pnpm astro -- --help`    | Get help using the Astro CLI                                |
| `pnpm check`              | Run Biome linter and formatter with auto-fix                |
| `pnpm check:ci`           | Run Biome checks without auto-fix (for CI/CD)              |
| `pnpm lint`               | Run Biome linter with auto-fix                              |
| `pnpm format`             | Run Biome formatter with auto-fix                           |
| `pnpm release`            | Create automated release with semantic-release              |
