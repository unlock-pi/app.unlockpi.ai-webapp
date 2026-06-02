# UnlockPi Webapp — Code Walkthrough

A Next.js 16 + React 19 web application for AI-powered classroom tutoring sessions. Teachers plan lessons, manage projects, and conduct live voice sessions with an AI tutor via LiveKit.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Authentication Flow](#authentication-flow)
4. [Projects & Sessions](#projects--sessions)
5. [Voice AI Interface (Talk)](#voice-ai-interface-talk)
6. [Classroom Feature](#classroom-feature)
7. [Courses Feature](#courses-feature)
8. [Board System](#board-system)
9. [Real-time RPC Communication](#real-time-rpc-communication)
10. [Visual Payloads](#visual-payloads)
11. [API Routes](#api-routes)
12. [Component Library](#component-library)
13. [Data Flow Patterns](#data-flow-patterns)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Styling | Tailwind CSS 4, Base UI + Radix UI |
| Auth & DB | Supabase (SSR) |
| Voice & RPC | LiveKit (`livekit-client`, `livekit-server-sdk`) |
| Content | MDX, Streamdown, Mermaid, KaTeX |
| Visualizations | D3, Recharts, ReactFlow, Cytoscape |
| Forms | Zod |
| Package Manager | Bun |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages & API routes
│   ├── layout.tsx              # Root layout: fonts, TooltipProvider
│   ├── page.tsx                # Redirects / → /dashboard
│   ├── globals.css             # Global styles
│   ├── api/token/route.ts      # LiveKit token + agent dispatch
│   ├── auth/                   # Auth pages (login, sign-up, etc.)
│   └── dashboard/              # Protected app pages
│       ├── layout.tsx          # Auth guard + AppSidebar shell
│       ├── page.tsx            # Dashboard home
│       ├── talk/               # Voice AI session page
│       ├── classroom/          # Interactive classroom page
│       ├── courses/            # Course catalog + lessons
│       ├── projects/           # Project list
│       ├── project/[id]/       # Individual project workspace
│       └── session/new/        # New session creation
├── features/                   # Feature-scoped logic
│   ├── auth/                   # Auth forms + logout
│   ├── talk/                   # Voice UI components + hooks
│   ├── classroom/              # Classroom real-time state + RPC
│   ├── courses/                # Course data + lesson components
│   ├── project/                # Project CRUD + workspace
│   └── session/                # Session CRUD + draft management
├── components/
│   ├── app-sidebar.tsx         # Main nav sidebar
│   ├── ui/                     # 60+ Radix/shadcn-style components
│   └── unlumen-ui/             # Custom animated UI primitives
├── lib/
│   ├── server.ts               # Supabase server client (Next.js SSR)
│   ├── client.ts               # Supabase browser client
│   ├── supabase-middleware.ts  # Auth cookie sync + redirect logic
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
├── types/
│   └── visual.ts               # VisualPayload type definitions
└── proxy.ts                    # Next.js middleware entry point
```

---

## Authentication Flow

### Middleware (`src/proxy.ts` + `src/lib/supabase-middleware.ts`)

Every request (except static assets and images) passes through Next.js middleware. The middleware:

1. Creates a Supabase server client using request/response cookies
2. Calls `supabase.auth.getClaims()` to validate the session
3. If the user is not authenticated and not already on an `/auth` path, redirects to `/auth/login`
4. Syncs auth cookies bidirectionally between request and response

### Dashboard Auth Guard (`src/app/dashboard/layout.tsx`)

A second check lives in the dashboard layout as a server component. It re-validates auth claims and wraps the entire dashboard in `SidebarProvider` + `AppSidebar`.

### Auth Pages (`src/app/auth/`)

| Route | Component | Purpose |
|---|---|---|
| `/auth/login` | `app/auth/login/page.tsx` | Inline AuthUI with typewriter animation, sign-in/sign-up toggle |
| `/auth/sign-up` | `features/auth/components/sign-up-form.tsx` | Email + password registration |
| `/auth/forgot-password` | `features/auth/components/forgot-password-form.tsx` | Password reset email |
| `/auth/update-password` | `features/auth/components/update-password-form.tsx` | Set new password after reset |
| `/auth/confirm` | `app/auth/confirm/route.ts` | Supabase email confirmation callback |

The login page (`app/auth/login/page.tsx`) is the most feature-rich auth component — it contains an inline custom UI with a side image carousel, animated typewriter, and both sign-in and sign-up flows in a single component.

### Supabase Client Split

- **Server** (`lib/server.ts`): Created fresh per-request using `next/headers`. Used in server components and route handlers.
- **Browser** (`lib/client.ts`): Singleton browser client. Used in client components for real-time mutations.

---

## Projects & Sessions

### Data Model

```
teaching_projects
  id, owner_id, name, description, created_at, updated_at

teaching_sessions
  id, owner_id, project_id, title, topic, learning_goals,
  lesson_structure, content_outline, status, is_live,
  created_at, updated_at
```

### Pages

**`/dashboard/projects`** — Server component. Fetches all projects + session counts in parallel. Renders a 3-column grid of project cards with `CreateProjectDialog` for new projects.

**`/dashboard/project/[project_id]`** — Server component. Fetches the project and its sessions. Renders `ProjectWorkspace` with the project header.

**`ProjectWorkspace`** (`features/project/components/project-workspace.tsx`) — Client component. Left panel lists sessions compactly; right panel shows a selected session's detail and edit form. Selection syncs to URL search params.

**`/dashboard/session/new`** — Server component. Fetches projects and passes them to `NewSessionPageClient` along with optional `projectId` and `template` query params.

### Session Templates (`features/session/lib/session-lib.ts`)

Four preset templates are available:
- `revision` — Recap and reinforce previous topics
- `diagnostic` — Identify gaps in student knowledge
- `masterclass` — Deep-dive expert lesson
- `discussion` — Facilitated group discussion

---

## Voice AI Interface (Talk)

The `/dashboard/talk` page is the core product — a real-time voice conversation with the AI tutor, with a live board and transcript.

### Connection Flow

```
/talk page loads
  ↓
useLiveKitRoomConnection() called
  ↓
connect() → GET /api/token?room=classroom-101&username=teacher-interface
  ↓
API generates JWT + dispatches agent to LiveKit room
  ↓
LiveKitRoom component connects with token
  ↓
Voice pipeline active (STT → LLM → TTS)
```

### Component Tree

```
TalkPage (app/dashboard/talk/page.tsx)
└── LiveKitRoom
    └── TalkRoomContent (features/talk/components/talk-room-content.tsx)
        ├── TalkBackground         — State-aware animated backdrop
        ├── TalkVisualizer         — Main visual stage with audio analyzer
        │   ├── TalkMatrix         — Frequency bar visualization
        │   ├── TalkBrand          — Logo + current state label# UnlockPi Webapp — Code Walkthrough

A Next.js 16 + React 19 web application for AI-powered classroom tutoring sessions. Teachers plan lessons, manage projects, and conduct live voice sessions with an AI tutor via LiveKit.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Authentication Flow](#authentication-flow)
4. [Projects & Sessions](#projects--sessions)
5. [Voice AI Interface (Talk)](#voice-ai-interface-talk)
6. [Classroom Feature](#classroom-feature)
7. [Courses Feature](#courses-feature)
8. [Board System](#board-system)
9. [Real-time RPC Communication](#real-time-rpc-communication)
10. [Visual Payloads](#visual-payloads)
11. [API Routes](#api-routes)
12. [Component Library](#component-library)
13. [Data Flow Patterns](#data-flow-patterns)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Styling | Tailwind CSS 4, Base UI + Radix UI |
| Auth & DB | Supabase (SSR) |
| Voice & RPC | LiveKit (`livekit-client`, `livekit-server-sdk`) |
| Content | MDX, Streamdown, Mermaid, KaTeX |
| Visualizations | D3, Recharts, ReactFlow, Cytoscape |
| Forms | Zod |
| Package Manager | Bun |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages & API routes
│   ├── layout.tsx              # Root layout: fonts, TooltipProvider
│   ├── page.tsx                # Redirects / → /dashboard
│   ├── globals.css             # Global styles
│   ├── api/token/route.ts      # LiveKit token + agent dispatch
│   ├── auth/                   # Auth pages (login, sign-up, etc.)
│   └── dashboard/              # Protected app pages
│       ├── layout.tsx          # Auth guard + AppSidebar shell
│       ├── page.tsx            # Dashboard home
│       ├── talk/               # Voice AI session page
│       ├── classroom/          # Interactive classroom page
│       ├── courses/            # Course catalog + lessons
│       ├── projects/           # Project list
│       ├── project/[id]/       # Individual project workspace
│       └── session/new/        # New session creation
├── features/                   # Feature-scoped logic
│   ├── auth/                   # Auth forms + logout
│   ├── talk/                   # Voice UI components + hooks
│   ├── classroom/              # Classroom real-time state + RPC
│   ├── courses/                # Course data + lesson components
│   ├── project/                # Project CRUD + workspace
│   └── session/                # Session CRUD + draft management
├── components/
│   ├── app-sidebar.tsx         # Main nav sidebar
│   ├── ui/                     # 60+ Radix/shadcn-style components
│   └── unlumen-ui/             # Custom animated UI primitives
├── lib/
│   ├── server.ts               # Supabase server client (Next.js SSR)
│   ├── client.ts               # Supabase browser client
│   ├── supabase-middleware.ts  # Auth cookie sync + redirect logic
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
├── types/
│   └── visual.ts               # VisualPayload type definitions
└── proxy.ts                    # Next.js middleware entry point
```

---

## Authentication Flow

### Middleware (`src/proxy.ts` + `src/lib/supabase-middleware.ts`)

Every request (except static assets and images) passes through Next.js middleware. The middleware:

1. Creates a Supabase server client using request/response cookies
2. Calls `supabase.auth.getClaims()` to validate the session
3. If the user is not authenticated and not already on an `/auth` path, redirects to `/auth/login`
4. Syncs auth cookies bidirectionally between request and response

### Dashboard Auth Guard (`src/app/dashboard/layout.tsx`)

A second check lives in the dashboard layout as a server component. It re-validates auth claims and wraps the entire dashboard in `SidebarProvider` + `AppSidebar`.

### Auth Pages (`src/app/auth/`)

| Route | Component | Purpose |
|---|---|---|
| `/auth/login` | `app/auth/login/page.tsx` | Inline AuthUI with typewriter animation, sign-in/sign-up toggle |
| `/auth/sign-up` | `features/auth/components/sign-up-form.tsx` | Email + password registration |
| `/auth/forgot-password` | `features/auth/components/forgot-password-form.tsx` | Password reset email |
| `/auth/update-password` | `features/auth/components/update-password-form.tsx` | Set new password after reset |
| `/auth/confirm` | `app/auth/confirm/route.ts` | Supabase email confirmation callback |

The login page (`app/auth/login/page.tsx`) is the most feature-rich auth component — it contains an inline custom UI with a side image carousel, animated typewriter, and both sign-in and sign-up flows in a single component.

### Supabase Client Split

- **Server** (`lib/server.ts`): Created fresh per-request using `next/headers`. Used in server components and route handlers.
- **Browser** (`lib/client.ts`): Singleton browser client. Used in client components for real-time mutations.

---

## Projects & Sessions

### Data Model

```
teaching_projects
  id, owner_id, name, description, created_at, updated_at

teaching_sessions
  id, owner_id, project_id, title, topic, learning_goals,
  lesson_structure, content_outline, status, is_live,
  created_at, updated_at
```

### Pages

**`/dashboard/projects`** — Server component. Fetches all projects + session counts in parallel. Renders a 3-column grid of project cards with `CreateProjectDialog` for new projects.

**`/dashboard/project/[project_id]`** — Server component. Fetches the project and its sessions. Renders `ProjectWorkspace` with the project header.

**`ProjectWorkspace`** (`features/project/components/project-workspace.tsx`) — Client component. Left panel lists sessions compactly; right panel shows a selected session's detail and edit form. Selection syncs to URL search params.

**`/dashboard/session/new`** — Server component. Fetches projects and passes them to `NewSessionPageClient` along with optional `projectId` and `template` query params.

### Session Templates (`features/session/lib/session-lib.ts`)

Four preset templates are available:
- `revision` — Recap and reinforce previous topics
- `diagnostic` — Identify gaps in student knowledge
- `masterclass` — Deep-dive expert lesson
- `discussion` — Facilitated group discussion

---

## Voice AI Interface (Talk)

The `/dashboard/talk` page is the core product — a real-time voice conversation with the AI tutor, with a live board and transcript.

### Connection Flow

```
/talk page loads
  ↓
useLiveKitRoomConnection() called
  ↓
connect() → GET /api/token?room=classroom-101&username=teacher-interface
  ↓
API generates JWT + dispatches agent to LiveKit room
  ↓
LiveKitRoom component connects with token
  ↓
Voice pipeline active (STT → LLM → TTS)
```

### Component Tree

```
TalkPage (app/dashboard/talk/page.tsx)
└── LiveKitRoom
    └── TalkRoomContent (features/talk/components/talk-room-content.tsx)
        ├── TalkBackground         — State-aware animated backdrop
        ├── TalkVisualizer         — Main visual stage with audio analyzer
        │   ├── TalkMatrix         — Frequency bar visualization
        │   ├── TalkBrand          — Logo + current state label
        │   └── TalkVisualStage    — Board / visual content area
        │       ├── TalkBoardStage — Structured board renderer
        │       └── BoardDocumentPanel — Document view of board
        ├── TalkTranscript         — Scrollable conversation log
        └── ConnectionScreen       — Pre-connection UI
```

### Key Hooks

**`use-livekit-room-connection.ts`** — Manages token fetch + connection state. Returns `{ token, isConnecting, error, connect, disconnect }`.

**`use-board-rpc.ts`** — Combines classroom realtime state + registers `render_visual` RPC handler. Returns board state + `visualPayload`.

**`use-transcript.ts`** — Combines agent transcription + user mic transcription tracks. Returns `transcriptLog`, `liveAgentText`, `liveUserText`.

**`use-audio-analyzer.ts`** — Extracts real-time frequency bins from a LiveKit audio track via Web Audio API. Used to animate the visualizer.

**`use-thinking-ambience.ts`** — Generates ambient sound (oscillators + LFO) when the agent is processing. Ramps in/out smoothly.

---

## Classroom Feature

The classroom feature (`features/classroom/`) handles real-time interactive board updates sent by the Python agent via RPC.

### State Management (`lib/classroom-state.ts`)

A Redux-style reducer manages all classroom state:

```typescript
{
  boardText: string,            // Markdown text mode
  boardHighlights: Highlight[], // Word-level highlights
  boardDocument: BoardDocument, // Structured block mode
  focusedStudent: string | null,// Spotlight a student (5s auto-clear)
  transcript: TranscriptLine[], // Conversation log
  viewMode: "content" | "cognitive_test",
  cognitiveQuestion: string,
  cognitiveAnswers: Answer[],
  teamScores: Record<string, number>
}
```

### RPC Handlers (`hooks/use-classroom-realtime.ts`)

Nine RPC methods are registered:

| RPC Method | Action |
|---|---|
| `board_operation` | Apply a structured board operation |
| `set_board` | Replace the entire board document |
| `update_content` | Set board to Markdown text |
| `highlight_text` | Highlight specific words |
| `clear_board` | Reset board to empty |
| `show_student_focus` | Spotlight a student for 5 seconds |
| `start_cognitive_test` | Show a Family Feud-style question |
| `reveal_answer` | Reveal a cognitive test answer + play sound |
| `update_scores` | Update team score dictionary |
| `show_error_buzzer` | Play buzzer sound effect |
| `update_transcript` | Append a transcript line |

---

## Courses Feature

### Arrays Course (`features/courses/arrays/lib/arrays-course.ts`)

A fully structured course definition with 5 lessons:

1. **What is an array** — Row of boxes; positions carry meaning
2. **Indexing** — Jump directly to position
3. **Updating** — Change value, not position
4. **Insert / Delete** — Shifting consequences
5. **Traversal** — Walking the array sequentially

Each lesson includes:
- `voiceSeedPrompt` — Seed text for the AI agent to guide the lesson narrative
- `cells` — Array state visualization (value, tag, detail, tone per cell)
- `activeIndex` — Which cell is highlighted
- `checkpoint` — Optional multiple-choice question with explanation
- `learningFocus` — Array of key learning goals

Helper functions: `getArrayLesson(segment)`, `getArrayLessonIndex(segment)`, `getAdjacentArrayLessons(segment)`.

---

## Board System

The board is a shared document that the Python agent writes to and the frontend renders. It supports two modes:

### Text Mode (Markdown)
The agent calls `update_content` with a Markdown string. Supports tables, formulas (`$...$`), checklists, code blocks, and Mermaid diagrams.

### Structured Mode (Block Document)
The agent builds a structured `BoardDocument` via `write_to_board` and incremental operations.

### BoardDocument Schema (`features/talk/lib/board.ts`)

```typescript
BoardDocument {
  id: string
  version: number        // Incremented on every operation
  blocks: Block[]        // Ordered array of blocks
}

Block = ParagraphBlock | FormulaBlock | DiagramBlock

ParagraphBlock { id, type: "paragraph", lines: Line[] }
FormulaBlock   { id, type: "formula",   formula: string }   // LaTeX
DiagramBlock   { id, type: "diagram",   diagramType: "mermaid", content: string }

Line { id, text, highlight?: HighlightType }
HighlightType = "important" | "definition" | "warning" | "exam" | "focus" | "note"
```

### Board Operations

Operations are dispatched via RPC and applied via `board-engine.ts` (pure functions, mirrors the Python board engine):

| Operation | Effect |
|---|---|
| `updateLine` | Change text of a specific line |
| `insertLineAfter` | Insert new line after target |
| `deleteLine` | Remove a line |
| `addBlock` | Add new block (optionally after a target block) |
| `deleteBlock` | Remove a block |
| `highlightLine` | Set highlight type on a line |
| `setBoard` | Replace entire board document |

Every operation bumps the `version` counter. The Python agent is the source of truth; the frontend is purely a view layer.

---

## Real-time RPC Communication

### How It Works

1. The Python agent calls a tool (e.g., `write_to_board`)
2. The tool serializes the payload to JSON
3. The tool calls `room.local_participant.perform_rpc(method, payload, destination_identity)`
4. LiveKit delivers the RPC to the frontend participant
5. The frontend's `useRpcHandler` hook receives it, parses JSON, dispatches to state

### RPC Handler (`features/talk/hooks/use-rpc-handler.ts`)

```
registerRpcMethod(method, handler) on local participant
  ↓
Incoming RPC: parse JSON payload (fallback to string)
  ↓
Call registered handler function
  ↓
Return JSON-stringified response to agent
```

Handlers are stored in refs to avoid re-registration on every render. Set `NEXT_PUBLIC_DEBUG_RPC=1` to enable debug logging.

---

## Visual Payloads

The agent can render rich visualizations by calling `render_visual` with a typed payload. The frontend parses and renders these in `TalkVisualStage`.

### Supported Visual Types (`src/types/visual.ts`)

| Type | Data | Animation |
|---|---|---|
| `map` | locations (lat/lng), connections | route with speed |
| `chart` | labels, values, chartType (bar/line/pie) | grow with duration |
| `flow` | nodes (id/label), edges (from/to) | step with delay |
| `graph` | nodes (id/label), edges (source/target) | force layout expand |

`parseVisualPayload()` validates and normalizes incoming RPC data with full type guards.

---

## API Routes

### `GET /api/token` (`src/app/api/token/route.ts`)

**Query params:** `room`, `username`, `session_id` (optional)

**Flow:**
1. Creates LiveKit `AccessToken` with `VideoGrants` (full room permissions)
2. Creates `AgentDispatchClient` and dispatches the UnlockPi agent to the room
3. Returns `{ accessToken: jwt }`

**Runtime:** `nodejs` (required by livekit-server-sdk)

**Env vars required:**
```
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## Component Library

Located in `src/components/ui/` — 60+ components following shadcn/Radix UI patterns.

All components use `cn()` from `lib/utils.ts` for conditional Tailwind class merging. Trigger/composition patterns use `render={<Link/>}` rather than `asChild` to match the Base UI API.

Key components used throughout the app:

| Component | Usage |
|---|---|
| `Button` | CVA-based; variants: default, outline, ghost, destructive |
| `Card` | Container for project/session/course items |
| `Dialog` | Create project, confirm delete |
| `Sidebar` | App navigation shell |
| `Tooltip` | Contextual hints (wrapped at root via TooltipProvider) |
| `Sheet` | Mobile-responsive overlays |
| `Tabs` | Course lesson navigation |
| `Select` | Project/template selectors |

Custom UI primitives in `components/unlumen-ui/`:
- `TiltCard` — 3D perspective tilt on hover
- `ClippedCircle` — CSS clip-path circle shape

---

## Data Flow Patterns

### Server → Client (Read)

```
Server Component fetches from Supabase
  ↓ props
Client Component manages local edit state
  ↓ Supabase client call on save
Navigate / revalidate
```

### Agent → Frontend (Real-time Write)

```
LLM decides to call tool
  ↓
Python tool applies mutation to SessionData
  ↓
Python tool calls send_rpc(method, payload)
  ↓
LiveKit delivers RPC to teacher-interface participant
  ↓
useRpcHandler dispatches to classroom state reducer
  ↓
React re-renders visualizer / board / transcript
```

### Voice Turn Cycle

```
User speaks
  ↓ LiveKit audio track
STT transcription (AssemblyAI → fallbacks)
  ↓
LLM processes text + optional tool calls
  ↓ tool calls
RPC updates board / visuals / transcript
  ↓
TTS generates speech (Inworld → fallbacks)
  ↓ LiveKit audio track
User hears response
```

### Environment Variables

```
LIVEKIT_URL                       LiveKit server WebSocket URL
LIVEKIT_API_KEY                   LiveKit API key
LIVEKIT_API_SECRET                LiveKit API secret
NEXT_PUBLIC_SUPABASE_URL          Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  Supabase publishable key (public)
SUPABASE_URL                      Supabase project URL (server)
SUPABASE_SERVICE_ROLE_KEY         Supabase service role key (server-only)
NEXT_PUBLIC_DEBUG_RPC             Set to "1" to log all RPC calls
```

        │   └── TalkVisualStage    — Board / visual content area
        │       ├── TalkBoardStage — Structured board renderer
        │       └── BoardDocumentPanel — Document view of board
        ├── TalkTranscript         — Scrollable conversation log
        └── ConnectionScreen       — Pre-connection UI
```

### Key Hooks

**`use-livekit-room-connection.ts`** — Manages token fetch + connection state. Returns `{ token, isConnecting, error, connect, disconnect }`.

**`use-board-rpc.ts`** — Combines classroom realtime state + registers `render_visual` RPC handler. Returns board state + `visualPayload`.

**`use-transcript.ts`** — Combines agent transcription + user mic transcription tracks. Returns `transcriptLog`, `liveAgentText`, `liveUserText`.

**`use-audio-analyzer.ts`** — Extracts real-time frequency bins from a LiveKit audio track via Web Audio API. Used to animate the visualizer.

**`use-thinking-ambience.ts`** — Generates ambient sound (oscillators + LFO) when the agent is processing. Ramps in/out smoothly.

---

## Classroom Feature

The classroom feature (`features/classroom/`) handles real-time interactive board updates sent by the Python agent via RPC.

### State Management (`lib/classroom-state.ts`)

A Redux-style reducer manages all classroom state:

```typescript
{
  boardText: string,            // Markdown text mode
  boardHighlights: Highlight[], // Word-level highlights
  boardDocument: BoardDocument, // Structured block mode
  focusedStudent: string | null,// Spotlight a student (5s auto-clear)
  transcript: TranscriptLine[], // Conversation log
  viewMode: "content" | "cognitive_test",
  cognitiveQuestion: string,
  cognitiveAnswers: Answer[],
  teamScores: Record<string, number>
}
```

### RPC Handlers (`hooks/use-classroom-realtime.ts`)

Nine RPC methods are registered:

| RPC Method | Action |
|---|---|
| `board_operation` | Apply a structured board operation |
| `set_board` | Replace the entire board document |
| `update_content` | Set board to Markdown text |
| `highlight_text` | Highlight specific words |
| `clear_board` | Reset board to empty |
| `show_student_focus` | Spotlight a student for 5 seconds |
| `start_cognitive_test` | Show a Family Feud-style question |
| `reveal_answer` | Reveal a cognitive test answer + play sound |
| `update_scores` | Update team score dictionary |
| `show_error_buzzer` | Play buzzer sound effect |
| `update_transcript` | Append a transcript line |

---

## Courses Feature

### Arrays Course (`features/courses/arrays/lib/arrays-course.ts`)

A fully structured course definition with 5 lessons:

1. **What is an array** — Row of boxes; positions carry meaning
2. **Indexing** — Jump directly to position
3. **Updating** — Change value, not position
4. **Insert / Delete** — Shifting consequences
5. **Traversal** — Walking the array sequentially

Each lesson includes:
- `voiceSeedPrompt` — Seed text for the AI agent to guide the lesson narrative
- `cells` — Array state visualization (value, tag, detail, tone per cell)
- `activeIndex` — Which cell is highlighted
- `checkpoint` — Optional multiple-choice question with explanation
- `learningFocus` — Array of key learning goals

Helper functions: `getArrayLesson(segment)`, `getArrayLessonIndex(segment)`, `getAdjacentArrayLessons(segment)`.

---

## Board System

The board is a shared document that the Python agent writes to and the frontend renders. It supports two modes:

### Text Mode (Markdown)
The agent calls `update_content` with a Markdown string. Supports tables, formulas (`$...$`), checklists, code blocks, and Mermaid diagrams.

### Structured Mode (Block Document)
The agent builds a structured `BoardDocument` via `write_to_board` and incremental operations.

### BoardDocument Schema (`features/talk/lib/board.ts`)

```typescript
BoardDocument {
  id: string
  version: number        // Incremented on every operation
  blocks: Block[]        // Ordered array of blocks
}

Block = ParagraphBlock | FormulaBlock | DiagramBlock

ParagraphBlock { id, type: "paragraph", lines: Line[] }
FormulaBlock   { id, type: "formula",   formula: string }   // LaTeX
DiagramBlock   { id, type: "diagram",   diagramType: "mermaid", content: string }

Line { id, text, highlight?: HighlightType }
HighlightType = "important" | "definition" | "warning" | "exam" | "focus" | "note"
```

### Board Operations

Operations are dispatched via RPC and applied via `board-engine.ts` (pure functions, mirrors the Python board engine):

| Operation | Effect |
|---|---|
| `updateLine` | Change text of a specific line |
| `insertLineAfter` | Insert new line after target |
| `deleteLine` | Remove a line |
| `addBlock` | Add new block (optionally after a target block) |
| `deleteBlock` | Remove a block |
| `highlightLine` | Set highlight type on a line |
| `setBoard` | Replace entire board document |

Every operation bumps the `version` counter. The Python agent is the source of truth; the frontend is purely a view layer.

---

## Real-time RPC Communication

### How It Works

1. The Python agent calls a tool (e.g., `write_to_board`)
2. The tool serializes the payload to JSON
3. The tool calls `room.local_participant.perform_rpc(method, payload, destination_identity)`
4. LiveKit delivers the RPC to the frontend participant
5. The frontend's `useRpcHandler` hook receives it, parses JSON, dispatches to state

### RPC Handler (`features/talk/hooks/use-rpc-handler.ts`)

```
registerRpcMethod(method, handler) on local participant
  ↓
Incoming RPC: parse JSON payload (fallback to string)
  ↓
Call registered handler function
  ↓
Return JSON-stringified response to agent
```

Handlers are stored in refs to avoid re-registration on every render. Set `NEXT_PUBLIC_DEBUG_RPC=1` to enable debug logging.

---

## Visual Payloads

The agent can render rich visualizations by calling `render_visual` with a typed payload. The frontend parses and renders these in `TalkVisualStage`.

### Supported Visual Types (`src/types/visual.ts`)

| Type | Data | Animation |
|---|---|---|
| `map` | locations (lat/lng), connections | route with speed |
| `chart` | labels, values, chartType (bar/line/pie) | grow with duration |
| `flow` | nodes (id/label), edges (from/to) | step with delay |
| `graph` | nodes (id/label), edges (source/target) | force layout expand |

`parseVisualPayload()` validates and normalizes incoming RPC data with full type guards.

---

## API Routes

### `GET /api/token` (`src/app/api/token/route.ts`)

**Query params:** `room`, `username`, `session_id` (optional)

**Flow:**
1. Creates LiveKit `AccessToken` with `VideoGrants` (full room permissions)
2. Creates `AgentDispatchClient` and dispatches the UnlockPi agent to the room
3. Returns `{ accessToken: jwt }`

**Runtime:** `nodejs` (required by livekit-server-sdk)

**Env vars required:**
```
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## Component Library

Located in `src/components/ui/` — 60+ components following shadcn/Radix UI patterns.

All components use `cn()` from `lib/utils.ts` for conditional Tailwind class merging. Trigger/composition patterns use `render={<Link/>}` rather than `asChild` to match the Base UI API.

Key components used throughout the app:

| Component | Usage |
|---|---|
| `Button` | CVA-based; variants: default, outline, ghost, destructive |
| `Card` | Container for project/session/course items |
| `Dialog` | Create project, confirm delete |
| `Sidebar` | App navigation shell |
| `Tooltip` | Contextual hints (wrapped at root via TooltipProvider) |
| `Sheet` | Mobile-responsive overlays |
| `Tabs` | Course lesson navigation |
| `Select` | Project/template selectors |

Custom UI primitives in `components/unlumen-ui/`:
- `TiltCard` — 3D perspective tilt on hover
- `ClippedCircle` — CSS clip-path circle shape

---

## Data Flow Patterns

### Server → Client (Read)

```
Server Component fetches from Supabase
  ↓ props
Client Component manages local edit state
  ↓ Supabase client call on save
Navigate / revalidate
```

### Agent → Frontend (Real-time Write)

```
LLM decides to call tool
  ↓
Python tool applies mutation to SessionData
  ↓
Python tool calls send_rpc(method, payload)
  ↓
LiveKit delivers RPC to teacher-interface participant
  ↓
useRpcHandler dispatches to classroom state reducer
  ↓
React re-renders visualizer / board / transcript
```

### Voice Turn Cycle

```
User speaks
  ↓ LiveKit audio track
STT transcription (AssemblyAI → fallbacks)
  ↓
LLM processes text + optional tool calls
  ↓ tool calls
RPC updates board / visuals / transcript
  ↓
TTS generates speech (Inworld → fallbacks)
  ↓ LiveKit audio track
User hears response
```

### Environment Variables

```
LIVEKIT_URL                       LiveKit server WebSocket URL
LIVEKIT_API_KEY                   LiveKit API key
LIVEKIT_API_SECRET                LiveKit API secret
NEXT_PUBLIC_SUPABASE_URL          Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  Supabase publishable key (public)
SUPABASE_URL                      Supabase project URL (server)
SUPABASE_SERVICE_ROLE_KEY         Supabase service role key (server-only)
NEXT_PUBLIC_DEBUG_RPC             Set to "1" to log all RPC calls
```
