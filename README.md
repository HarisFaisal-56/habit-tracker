# Habit Tracker

A personal, local-first habit tracker: a mobile-first PWA with no account, no backend and full
offline support. See [CLAUDE.md](CLAUDE.md) for the full spec.

## Getting started

Requires Node.js 22.13+ (or 24+) and npm.

```sh
npm install
npm run dev         # local dev server
npm run build       # type-check and production build
npm run preview     # preview the production build
npm run test        # run Vitest once
npm run test:watch  # run Vitest in watch mode
npm run lint        # ESLint
npm run format      # Prettier (write)
npm run icons       # regenerate the PWA icons in public/
```

## Offline and install

The service worker is only built for production. To try offline mode or installing:

```sh
npm run build
npm run preview     # http://localhost:4173
```
