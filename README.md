# gcfialho.github.io

Personal site of Guilherme Fialho, Machine Learning Engineer (GenAI/LLMs) and Data Engineer.
Live at **https://gcfialho.github.io**.

- **Stack:** Tailwind CSS v4 (compiled at build time) and [Motion](https://motion.dev)
  (bundled with esbuild). IBM Plex Sans is self-hosted, so the site makes no third-party
  requests and has no trackers.
- **Motion language:** a single blue pencil that strikes the wrong number, ticks each
  measured result and draws a margin rule as you scroll. `prefers-reduced-motion` is
  respected, and the page is complete without JavaScript.
- **Build:** `npm install && npm run build` writes the site to `dist/`. `npm run preview`
  takes screenshots and records the load sequence. GitHub Actions builds, previews and
  deploys to GitHub Pages on every push to `main`.

The font is IBM Plex Sans, © IBM Corp., used under the SIL Open Font License 1.1.
