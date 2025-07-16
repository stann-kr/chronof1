# ChronoF1 Monorepo

This repository contains the **ChronoF1** project. It is organised as a monorepo using [pnpm](https://pnpm.io), [Turbo](https://turbo.build) and TypeScript.

## Packages

- **api** – NestJS based backend server
- **web** – React + Vite frontend
- **@repo/ui** – shared React component library
- **@repo/eslint-config** – shared ESLint configuration
- **@repo/typescript-config** – shared TypeScript configuration

## Getting started

Install dependencies and start development servers:

```bash
pnpm install
pnpm dev
```

To build all packages run:

```bash
pnpm build
```
