# @serafort/nextjs

Next.js App Router, Server Components, Server Actions, and Edge Middleware SDK for Serafort B2B authentication and RBAC.

## Installation

```bash
npm install @serafort/nextjs @serafort/core
```

## Quickstart

### 1. Edge / Node Middleware (`middleware.ts`)

```typescript
// middleware.ts
import { serafortMiddleware } from '@serafort/nextjs/edge';

export default serafortMiddleware({
  publicRoutes: ['/login', '/register', '/api/public/*'],
  loginUrl: '/login',
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 2. Server Components & Server Actions

```typescript
// app/dashboard/page.tsx
import { auth, protect } from '@serafort/nextjs/server';

export default async function DashboardPage() {
  // Option A: Ensure user is authenticated with required permission (auto-redirects if not)
  const user = await protect({
    permissions: ['org:read'],
  });

  // Option B: Inspect session state optionally
  const session = await auth();

  return (
    <div>
      <h1>Welcome, {user.userId}</h1>
      <p>Tenant: {user.tenantId}</p>
    </div>
  );
}
```

## Contributing

Before committing, changes are checked with `pnpm run type-check`. This is
wired up two ways — pick whichever fits your setup:

- **Husky (npm-idiomatic, default for contributors who run `pnpm install`)**:
  the `prepare` script installs a Husky hook automatically, so once you've run
  `pnpm install` in a git checkout, `git commit` runs the check for you.
- **`.githooks/` (portable, no Husky/Node required to install)**: run
  `git config core.hooksPath .githooks` once to point git directly at the
  checked-in `.githooks/pre-commit` script, which runs the same check.

Both hooks run the same command, so pick one — you don't need both active at
once.

CI (`.github/workflows/ci.yml`) runs `type-check`, `test`, and `build` on
every push to `main` and on every pull request.

## License

MIT — see [LICENSE](LICENSE).
