# Arrays agent — Indexa

A voice-driven tutor that teaches arrays on a presentation canvas: the
teacher talks, Indexa runs a tool, the board animates, everyone watches the
same operation the teacher just named. This file is the map — start here
before opening any single file.

## The five layers

Each layer only knows about the one below it. Read them in this order the
first time; trace a real command through them afterward.

```
1. @unlockpi/blocks/array:                                  PURE LOGIC
   array-ops.ts, array-search.ts, array-sorting.ts,
   array-analysis.ts, array-combine.ts, array-code.ts
        │  (values, ...args) => { values, frames, summary }
        ▼
2. tools/array/*.ts, tools/blocks.ts, tools/presentation.ts   TOOLS
        │  AI SDK `tool({ description, inputSchema, execute })`,
        │  wrapping one pure function each
        ▼
3. lib/realtime-tools.ts, lib/agent-identity.ts               MODEL WIRING
        │  Zod schemas → OpenAI function-calling JSON Schema;
        │  the system prompt (buildArraysAgentInstructions)
        ▼
4. hooks/use-arrays-voice-agent.ts,                           ORCHESTRATION
   @unlockpi/blocks/array's use-array-player.ts
        │  runs the WebRTC session, executes tool calls, plays
        │  `frames` on a timer, tracks telemetry
        ▼
5. components/*.tsx, @unlockpi/blocks's ArrayView              RENDERING
      renders whatever ArrayFrame it's handed — no opinion on
      why a cell is active or why the caret is where it is
```

**Layer 1 moved out of this feature and into `@unlockpi/blocks/array`.**
It used to live in `lib/` here, on the theory that "what a voice agent calls
as tools" belonged near the agent. That didn't hold up — every one of these
files is a pure function with zero React, zero OpenAI, zero canvas, and
splitting "what arrays can do" from "how arrays render" across a feature
folder and a UI package just meant looking in two places to understand one
concept. Import from `@unlockpi/blocks/array` in new code; see that
package's `array/README.md` for the full file list.

**Layer 1 is the one thing worth understanding first.** Every operation —
insert, delete, sort, search — is a *pure* function:
`(currentValues, ...args) => ArrayOpResult`. `ArrayOpResult.frames` is a list
of `ArrayFrame` snapshots (`{ values, active, visited, settled, found?,
caret?, gap?, note }`) — the *entire* animation, as data. Nothing past this
layer needs to know HOW an operation works, only that it hands back frames to
play. That's what lets 35 tools and 5 sort algorithms all drive one
`<ArrayStrip>` with zero special-casing in the renderer.

The operation files (all in `@unlockpi/blocks/array` now) are split by
category, not dumped into one — each has a docstring saying what it owns:

| File | Owns |
|---|---|
| `array-ops.ts` | create, access, traverse, insert, delete |
| `array-search.ts` | linear/binary search, find-all |
| `array-sorting.ts` | the five sort algorithms |
| `array-analysis.ts` | frequency, duplicates, min/max, stats |
| `array-combine.ts` | concatenate, element-wise, merge-sorted |
| `array-code.ts` | rendering the array as a code declaration |
| `operation-code.ts` | the ONE line of code that performed the last op |

## Where things live

- **`lib/`** — what's left here is genuinely agent-specific, not array logic:
  `agent-state.ts` has `ArrayAgentState` (which canvas block, which frame,
  teaching mode — additionally true only because a voice session is driving
  a specific block; the array vocabulary itself — `ArrayFrame`,
  `ArrayOpResult`, `AnimationSpeed` — lives in `@unlockpi/blocks/array`
  instead). `agent-identity.ts` builds the system prompt and the realtime
  tool list. `agent-memory.ts` / `agent-activity.ts` are the bounded
  conversation log and the telemetry event log — two different things with
  similar names, don't conflate them.
- **`tools/`** — one file per capability group (`tools/array/insertion.ts`,
  `deletion.ts`, `sorting.ts`, …), each exporting a `createXTools(ctx)`
  factory. `tools/array/index.ts` spreads all of them into the one object the
  model sees. `tools/tool-context.ts` defines `ArrayToolContext` — the seam
  that keeps tools from ever touching React or the canvas directly, which is
  what lets the SAME tool set drive the voice agent, the `/temp` demo page,
  and a schema-only context used just to extract JSON Schema server-side.
- **`hooks/`** — `use-arrays-voice-agent.ts` is the big one: owns the WebRTC
  session (via the shared `OpenAIRealtimeClient`, see
  `src/lib/openai-realtime/`), executes tool calls, and holds the array
  agent's state. It uses `useArrayPlayer` from `@unlockpi/blocks/array` to
  turn a `frames` list into a timed animation — that hook moved out of this
  folder along with the operation files, same reasoning: it's a generic
  "step through frames on a timer" player with zero agent-specific code.
  `use-arrays-canvas-bridge.ts` reads/writes the array as it's actually
  authored on a canvas document (finding the right block, keeping a synced
  code block up to date) — this is canvas-document plumbing, not agent
  logic. `use-arrays-agent-on-canvas.ts` composes the voice agent + bridge
  together for the presenter.
- **`components/`** — `ArraysAgentBoard` renders one `ArrayFrame`.
  `ArraysAgentOverlays` renders the explanation/quiz/comparison cards.
  `ArraysAgentActivityPanel` is the telemetry side panel. The actual array
  strip UI lives OUTSIDE this feature, in `@unlockpi/blocks/array` — it's
  shared with the standalone array/stack/queue demo pages and knows nothing
  about the agent.

## Tracing a real command

Teacher says *"insert 12 at index 2"*:

1. Realtime API matches the utterance against tool descriptions (written as
   usage examples specifically so this matching works — see any file in
   `tools/array/`), calls `insert_at_index({ index: 2, value: "12" })`.
2. `tools/array/insertion.ts`'s `execute` reads current values off
   `ctx.state`, calls the pure `insertAtIndex()` from `@unlockpi/blocks/array`.
3. `commit()` (`tools/tool-context.ts`) calls `ctx.play(result)` — the hook
   writes the new values into its state ref and hands `frames` to the
   player — and returns `{ ok, summary, state }` to the model, which is what
   it actually speaks back.
4. The player steps through frames on a timer; the board re-renders each
   beat. One sound cue plays once the board settles, not per beat.
5. Once settled, `onCommit` writes the final values into the canvas
   document, and anything queued via `afterSettle()` (like an explanation
   card) appears — deliberately AFTER the animation, not racing it.

## What's deliberately NOT here

The realtime WebRTC connection itself (reconnect-with-backoff, cancel a
connection attempt mid-handshake, the mic-availability check) lives in
`src/lib/openai-realtime/` — it's shared by every voice feature in the app,
not specific to arrays. If you're debugging "it won't connect" rather than
"it connected but did the wrong thing," look there first.
