# Offline policy

Mi Día remains online-first until a deliberate sync implementation is added.

## Current behavior

The service worker caches only the install shell (`offline.html`, localized offline fallback pages, icons, the manifest, and same-origin `/_next/static/` assets). It does not cache HTML navigations, React Server Component payloads, Supabase requests, or authenticated page data.

When the network is unavailable:

- A navigation shows a localized offline fallback page.
- Existing tasks, areas, progress, reviews, profiles, and habits are not available offline.
- Creating, editing, completing, postponing, deleting, or reordering a task is unavailable.
- Authentication, magic links, profile changes, reminders, and sign-out require a network connection.
- No mutation is queued or retried automatically, so offline actions cannot be duplicated when connectivity returns.

The browser may retain Supabase session cookies according to the SSR client behavior, but those cookies are not an offline data store and must not be used to render private data without a successful server request.

## Future sync contract

Before enabling offline mutations, implement all of the following together:

1. Store only an explicit, user-scoped read model in IndexedDB. Never put tokens, secrets, or another user's records in the offline store.
2. Add a durable outbox with client mutation IDs, operation type, payload, creation time, and retry state.
3. Make every mutation idempotent on the server. Completion needs a durable `mutation_id` or request ledger in addition to its task/date uniqueness, because a delayed retry can cross a local-date boundary; other mutations need equivalent request IDs before offline writes are enabled.
4. Define conflict rules per operation. Server validation remains authoritative; stale edits must surface a conflict instead of silently overwriting newer data.
5. Reconcile the outbox only after authentication is restored, with bounded retries and visible failure states.
6. Clear user-scoped cached data and pending mutations on sign-out or account change.
7. Add browser tests for offline reads, reconnects, duplicate delivery, expired sessions, sign-out, and two-device conflicts.

The current service worker must not be expanded to cache personalized navigations as a shortcut for this work.
