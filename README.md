# School management system

Staff app, API and background worker for a private basic school in Ghana. Read `CLAUDE.md` first.

## Get started

Needs Node 24 (see `.nvmrc`) and pnpm 12.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
pnpm dev
```

- API: http://localhost:3000/health
- Staff app: http://localhost:5173

## Commands

| Command          | What it does                                   |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Runs web, api and worker in watch mode         |
| `pnpm build`     | Builds all apps                                |
| `pnpm typecheck` | Type-checks every package                      |
| `pnpm lint`      | ESLint                                         |
| `pnpm format`    | Prettier (write); `pnpm format:check` to check |
| `pnpm test`      | Vitest across the workspace                    |

Deploying: see `docs/runbooks/deploy.md`.
