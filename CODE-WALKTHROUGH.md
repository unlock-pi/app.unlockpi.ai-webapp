# UnlockPi Webapp — Deep Code Walkthrough

This document explains how the **app.unlockpi.ai webapp** works end to end: routing, auth/session flow, dashboard data flow, voice real-time pages, and the most important functions/components.

---

## 1) High-level architecture

- Framework: **Next.js App Router** (`next@16`, React 19)
- UI system: custom components built on **@base-ui/react** + utility styling
- Auth/data: **Supabase SSR** (`@supabase/ssr`)
- Realtime voice/classroom: **LiveKit/OpenAI realtime**
- Table UX: **TanStack Table** + `@dnd-kit` for drag sorting
- Mastra AI
- Puck Editor

### Core layers

1. **Routing + layout layer** (`src/app/**`)
2. **Guard/session layer** (`src/proxy.ts`, `src/lib/supabase-middleware.ts`, `src/lib/server.ts`, `src/lib/client.ts`)
3. **Feature UI layer** (`src/components/**`)
4. **Realtime integration layer** (`src/app/dashboard/talk/**`, `/classroom`, `src/hooks/use-rpc-handler.ts`)
5. **Token backend route** (`src/app/api/token/route.ts`)

---

## 2) Application bootstrap and route flow

## 2.1 Root bootstrap

- `src/app/layout.tsx`
  - Defines fonts, global CSS, Streamdown styles.
  - Wraps all children with `TooltipProvider`.
- `src/app/page.tsx`
  - Hard redirects `/` to `/dashboard/`.

### Practical effect

Users never stay on the root route; the dashboard is the real app entry.

---

## 2.2 Protected routing behavior

Two independent auth protection paths exist:

1. **Middleware-level guard**
   - `src/proxy.ts` delegates to `updateSession()`.
   - `src/lib/supabase-middleware.ts`:
     - Creates Supabase server client with cookie sync.
     - Calls `supabase.auth.getClaims()`.
     - Redirects unauthenticated users to `/auth/login`.

2. **Layout-level guard**
   - `src/app/dashboard/layout.tsx`
   - `src/app/dashboard/session/layout.tsx`
   - Both call `createClient()` from `src/lib/server.ts` and `getClaims()`.
   - If invalid session, both call `redirect('/auth/login')`.

### Why both exist

- Middleware catches unauthenticated requests early.
- Layout guards are a server-component safety net for protected shells.

---

## 2.3 Supabase client split

- Browser client: `src/lib/client.ts`
  - `createBrowserClient(...)`
  - used by client-side forms and fetch actions.
- Server client: `src/lib/server.ts`
  - `createServerClient(...)` with `next/headers` cookies.
  - used in server components/layouts.

---

## 3) Auth screens and sign-in path

Auth pages live under `src/app/auth/**`.

### Important implementation detail

There are two patterns in repo:

- A very large custom `src/app/auth/login/page.tsx` (includes internal UI primitives in file).
- Reusable component-based forms:
  - `src/components/login-form.tsx`
  - `src/components/sign-up-form.tsx`

### Canonical reusable flow (`login-form.tsx`)

1. User submits email/password.
2. `createClient()` creates browser Supabase client.
3. Calls `supabase.auth.signInWithPassword(...)`.
4. On success: `router.push('/dashboard')`.
5. On error: surface message in UI state.

### Sign-up flow (`sign-up-form.tsx`)

1. Validates password + repeat password match.
2. Calls `supabase.auth.signUp(...)` with redirect option.
3. Navigates to `/auth/sign-up-success` on success.

---

## 4) Dashboard shell and workspace navigation

## 4.1 Dashboard shell

- `src/app/dashboard/layout.tsx`
  - Wraps content in `SidebarProvider` + `AppSidebar` + `SidebarInset`.

## 4.2 Sidebar orchestration (`src/components/app-sidebar.tsx`)

This is a key orchestrator component.

### What it manages

- Main navigation links (Discover, Home chat, etc.)
- Teaching workspace entities:
  - `teaching_projects`
  - `teaching_sessions`
- Collapsible per-project session lists.
- New project creation dialog state.
- Quick actions via URL params (`quickAction=new-project`).

### Most important functions/state

- `loadWorkspace()`
  - Reads auth user from Supabase.
  - Fetches projects + sessions in parallel.
  - Handles missing schema (`42P01`) with clear error message.
- `sessionsByProject` (`useMemo`)
  - groups sessions for rendering under each project.
- project creation state + submit handlers.

### Why it matters

The sidebar is not just navigation; it is the **workspace indexer** for the teacher’s project/session hierarchy.

---

## 5) Main dashboard page composition

- `src/app/dashboard/page.tsx`
  - Uses dynamic imports for:
    - `ChartAreaInteractive`
    - `DataTable`
  - Loads data from `src/app/dashboard/data.json`.

### Runtime behavior

- Server renders shell + skeleton loading placeholders.
- Hydrates interactive chart and table client-side.
- Table receives initial dataset prop.

---

## 6) Data table internals and state flow

Main file: `src/components/data-table.tsx`

### Core responsibilities

- Column definitions (`getColumns()`)
- Row selection/filter/sort/pagination (TanStack)
- Drag-and-drop row reordering (`dnd-kit`)
- Drawer-based row detail editor (`TableCellViewer`)

### Key flow

1. Initialize states: `data`, `rowSelection`, `sorting`, filters, pagination.
2. Build `columns` and `useReactTable({...})` instance.
3. Render table header/body with `flexRender`.
4. Wrap body in `DndContext` + `SortableContext` for row ordering.
5. `handleDragEnd()` mutates table data with `arrayMove(...)`.

### Important warning in this file

- React compiler warning around `useReactTable(...)` is expected.
- It is a **compiler memoization bailout**, not runtime failure.
- File currently uses `"use no memo"` to explicitly opt out of unsafe memoization.

### Hydration safety fix applied recently

`DrawerTrigger` / `DrawerClose` now use `render={<Button .../>}` pattern instead of `asChild` in `TableCellViewer`, preventing nested `<button>` issues.

---

## 7) Session creation flow (`/dashboard/session/new`)

File: `src/app/dashboard/session/new/page.tsx`

### Functional sequence

1. Load user and projects from Supabase.
2. Optionally seed draft from `template` query params.
3. Validate required fields (`project/topic/title/goals/structure`).
4. Insert into `teaching_sessions` table.
5. Redirect to `/dashboard/project/<project_id>?session=<new_session_id>`.

### Notable implementation traits

- Handles empty project state (must create project first).
- Uses skeleton loading while fetching projects.
- Maintains `SessionDraft` as single source of form truth.

---

## 8) Real-time voice stack (Talk + Classroom)

The app has two realtime pages with similar LiveKit primitives:

- `src/app/dashboard/talk/page.tsx`
- `src/app/dashboard/classroom/page.tsx`

## 8.1 Token + room setup

- Both pages fetch `/api/token?room=...&username=...`.
- API route: `src/app/api/token/route.ts`
  - Generates LiveKit JWT with room grants.
  - Dispatches agent `UnlockPi` using `AgentDispatchClient`.

### Why dispatch happens in token route

It ensures frontend user and Python agent land in same room without manual agent launch step per session.

## 8.2 Talk page flow

- `useConnection()` controls connect/disconnect token state.
- `LiveKitRoom` mounts with `RoomAudioRenderer` and `StartAudio`.
- `TalkRoomContent` integrates:
  - voice assistant state (`useVoiceAssistant`)
  - local participant mic track
  - transcript hook + board RPC hook
  - visualizer and transcript overlays

## 8.3 Classroom page flow

- Initializes classroom UI states: content, highlights, transcript, focused student, cognitive game state.
- Registers RPC handlers via `useRpcHandler(...)` for methods:
  - `highlight_text`
  - `update_content`
  - `show_student_focus`
  - `start_cognitive_test`
  - `reveal_answer`
  - `update_scores`
  - `show_error_buzzer`
- Switches between normal content panel and cognitive board mode.

---

## 9) RPC integration pattern

Key hook: `src/hooks/use-rpc-handler.ts`

### How it works

1. Gets `room` from `useRoomContext()`.
2. Registers `localParticipant.registerRpcMethod(method, callback)` once.
3. Parses incoming payload JSON when possible.
4. Calls provided handler.
5. Returns serialized response JSON.
6. Unregisters on cleanup.

### Design value

- Centralizes RPC registration lifecycle.
- Avoids repeated boilerplate across features.
- Minimizes accidental re-registration loops via refs.

---

## 10) Component system and primitives

The component library in `src/components/ui/**` is based on Base UI wrappers.

### Important behavior for contributors

Some trigger primitives (`DialogTrigger`, `DrawerTrigger`, etc.) expect `render` composition patterns rather than Radix-style `asChild` assumptions. Mixing them incorrectly can produce nested interactive element/hydration errors.

---

## 11) Known complexity hotspots

1. `app-sidebar.tsx`
   - Multi-concern state (navigation + data loading + creation UI).
2. `data-table.tsx`
   - Heavy table + DnD + drawers + forms in one file.
3. Dual auth UI styles under `/auth`.
   - There is both componentized and inline-form approach in codebase.

---

## 12) End-to-end sequence examples

## 12.1 User login to dashboard

1. Open `/auth/login`.
2. Submit credentials (`signInWithPassword`).
3. Redirect `/dashboard`.
4. Middleware/layout validates claims.
5. Sidebar loads projects/sessions.
6. Dashboard renders charts/table.

## 12.2 Start voice tutoring session

1. Open `/dashboard/talk`.
2. Fetch token from `/api/token`.
3. API dispatches UnlockPi agent to room.
4. `LiveKitRoom` connects.
5. User speaks; agent replies with audio and optional RPC updates.

## 12.3 Agent updates classroom board

1. Agent sends RPC method (e.g. `update_content`).
2. Frontend handler updates local UI state.
3. Content panel re-renders with new text/highlights.

---

## 13) Fast orientation map (what to open first)

1. `src/app/layout.tsx`
2. `src/proxy.ts` + `src/lib/supabase-middleware.ts`
3. `src/app/dashboard/layout.tsx`
4. `src/components/app-sidebar.tsx`
5. `src/app/dashboard/page.tsx`
6. `src/components/data-table.tsx`
7. `src/app/api/token/route.ts`
8. `src/app/dashboard/talk/page.tsx`
9. `src/app/dashboard/classroom/page.tsx`
10. `src/hooks/use-rpc-handler.ts`

---

## 14) Recommended refactor backlog (optional)

1. Split `data-table.tsx` into table core + cell viewers + toolbar.
2. Consolidate auth UI into one reusable system (`components/*-form.tsx`).
3. Extract sidebar data-fetch/create flows into custom hooks (`useTeachingWorkspace`).
4. Add typed RPC contract layer shared with agent repo.

---

If you are onboarding new contributors, pair this walkthrough with `project-walkthrough.md` and run through one real flow (`/dashboard/talk`) while watching browser network + console events.