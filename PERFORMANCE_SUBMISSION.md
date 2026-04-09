# UnlockPi AI Web - Performance Submission

Date: 2026-04-09
Scope: Applied Vercel React/Next.js performance best practices to the active dashboard experience and root app shell.

## What I Audited

I reviewed the app with focus on:
- Waterfalls and auth flow
- Client bundle size on dashboard routes
- Unnecessary render-blocking resources
- Unused imports/config in client components

## Changes Implemented

### 1) Removed client-side auth waterfall in dashboard layout
- File: src/app/dashboard/layout.tsx
- Before: Client component checked auth in useEffect, showed loading state, then redirected.
- After: Server component checks Supabase auth with createClient() and supabase.auth.getClaims(); redirects on server if unauthenticated.

Performance impact:
- Removes client-side auth round trip after hydration.
- Avoids loading-spinner-only paint while auth is checked.
- Improves time-to-meaningful-content for authenticated users.

### 2) Eliminated duplicated dashboard shell rendering
- Files:
  - src/app/dashboard/layout.tsx
  - src/app/dashboard/page.tsx
- Before: Sidebar provider/header/sidebar were mounted in both layout and page.
- After: Layout is now the only dashboard shell; page renders content only.

Performance impact:
- Reduces duplicated React tree work.
- Reduces unnecessary component mount/hydration work.
- Simplifies route architecture and avoids repeated UI wrappers.

### 3) Code-split heavy dashboard widgets
- File: src/app/dashboard/page.tsx
- Before: Chart and data table were statically imported and loaded immediately.
- After: ChartAreaInteractive and DataTable are dynamically imported with client-side loading placeholders.

Performance impact:
- Reduces initial JS payload for dashboard route.
- Defers heavy interactive bundles until needed.
- Improves initial responsiveness during route load.

### 4) Removed render-blocking external icon stylesheet
- File: src/app/layout.tsx
- Before: Global head included boxicons CDN stylesheet.
- After: Removed the external stylesheet (no usage found in codebase).

Performance impact:
- Removes external CSS request from critical path.
- Reduces first render blocking dependency.

### 5) Reduced sidebar client bundle overhead
- File: src/components/app-sidebar.tsx
- Changes:
  - Removed unused imports and dead icon payload.
  - Removed unused nav data branches that were not rendered.
  - Updated collapsible/sub-button usage to local render API (type-safe, cleaner).

Performance impact:
- Smaller client component module.
- Less parse/execute overhead in sidebar chunk.

## Validation

- Checked diagnostics after changes for edited files.
- Status: No errors in:
  - src/app/dashboard/layout.tsx
  - src/app/dashboard/page.tsx
  - src/app/layout.tsx
  - src/components/app-sidebar.tsx

Note: Workspace still has unrelated pre-existing style/lint warnings in other files not part of this performance pass.

## Best Practices To Follow Next Time

Use this as your coding checklist:

1. Do auth and redirects on the server whenever possible (layout/page/route handlers), not in client useEffect.
2. Keep one shell per route segment (avoid duplicating providers, headers, and sidebars in both layout and page).
3. Dynamically import heavy client widgets (charts, editors, large tables, markdown engines).
4. Avoid adding render-blocking external CSS/JS in root layout unless absolutely required.
5. Remove unused icon/component imports aggressively in client components.
6. Keep route-critical components lean; defer non-critical UI behind loading boundaries.
7. Prefer Supabase server client in server components for protected routes.
8. Watch for repeated wrappers and repeated expensive components in nested layouts.
9. Add lightweight skeletons for deferred widgets so perceived performance stays smooth.
10. Run diagnostics after each refactor and fix type mismatches immediately.

## Recommended Next Optimizations (Not Yet Applied)

1. Lazy-load streamdown + markdown plugins in src/components/ai-elements/message.tsx.
2. Optimize Mermaid rendering path in src/components/mdx/mermaid.tsx (preload/memoized render pipeline).
3. Tighten next/image remotePatterns and migrate remote img tags to next/image where applicable.
4. Continue cleaning Tailwind utility warnings (mostly style-shorthand warnings) across remaining files.
