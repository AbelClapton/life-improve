# Developer Standards

This document defines the technical standards and patterns for the Life Organizer project to ensure efficiency, maintainability, and consistency across implementations.

## 1. Authentication & Authorization
- **Auth Injection**: Avoid repeated `await supabase.auth.getUser()` calls. Use the `withUser` Higher-Order Function (HOF) wrapper in `lib/auth-wrapper.ts` to inject the authenticated user and Supabase client directly into Server Action handlers.
- **Auth Flow**: Use Supabase SSR for server-side client management to maintain session consistency between Client and Server Components.

## 2. Server Actions Pattern
- **Result Pattern**: Never throw raw `Error` objects from Server Actions. Instead, return a result object:
  - Success: `{ success: true }`
  - Failure: `{ error: "Human readable error message" }`
  - This prevents generic Next.js crash screens and allows for graceful UI error handling.
- **Location**: Move all logic from inline `'use server'` functions in components to named functions in `app/actions.ts`.
- **Parameterization**: Actions should receive necessary context (e.g., `locale`, `taskId`) as arguments rather than relying on global state.

## 3. Cache & Revalidation
- **Batch Revalidation**: Use the `revalidatePaths(paths: string[])` utility in `lib/cache.ts` to update multiple routes in a single call after mutations.
- **Route Mapping**: When using locale-based routing, ensure revalidation paths include the `/[locale]` prefix.

## 4. Architecture & Tooling
- **Routing**: Prefer locale-prefixed routing (`/[locale]/...`) using `next-intl` for internationalization.
- **Module Resolution**: Use `@/*` path aliasing mapping to the project root (configured in `tsconfig.json`).
- **Standard Library First**: Follow the "Ponytail" principle: use native platform features and the standard library before adding new dependencies.

## 5. Code Style
- **Conciseness**: Prioritize the shortest working diff. Avoid unrequested abstractions (factories, interfaces with one implementation).
- **Documentation**: Mark deliberate simplifications with `// ponytail: <reason>` comments.
