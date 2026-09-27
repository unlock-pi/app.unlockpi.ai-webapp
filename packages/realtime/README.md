# `@unlockpi/realtime` — scaffolded, not yet extracted

**This package is currently empty on purpose.** It exists so the workspace
member is real — it shows up in `bun install`, in `turbo run typecheck`, in
CODEOWNERS — before any code actually moves into it. Read this whole file
before adding to it; it's short.

## Why this package, and why this name over "agents"

The name "agents" is already doing double duty in this codebase (arrays-agent,
"AI agents" generally) and in the tooling around it (Claude Code's own
subagents). `realtime` names the actual thing this package is for precisely:
the plumbing around a live OpenAI Realtime voice session — not the teaching
content, not any one concept's tools.

## What belongs here (once extracted)

Only the pieces that are genuinely identical regardless of which concept
(arrays, circuits, amplitude modulation, pn-junction, ...) is being taught:

- **Connection lifecycle** — establishing and tearing down a Realtime
  session, mic capture, audio playback, reconnect/mute handling.
- **Tool wiring** — turning a plain JS function + description into whatever
  shape OpenAI Realtime's `tools` array wants, and routing an incoming
  function-call event to the right handler and posting the result back.
  Something like `defineTool(name, description, schema, handler)`.
- **System-prompt scaffolding**, if a real, repeated shape emerges across
  more than one concept's agent (not before — see below).

None of that is domain-shaped. It's shaped by OpenAI's API, not by whether
the lesson is about arrays or PN junctions, which is what makes it safe to
share across every future voice-agent concept without needing to guess a
concept's shape in advance.

## What does NOT belong here — ever

- `*-ops.ts` (`array-ops.ts`, `circuit-ops.ts`, `am-ops.ts`, `pn-ops.ts`) —
  concept-specific tools. These are what `defineTool` wraps, not part of this
  package. They stay in `apps/web/src/features/*/lib/`.
- Per-concept system-prompt CONTENT (the actual teaching instructions).
- The React hook binding agent state to one specific block
  (`use-arrays-agent-view` and whatever its future siblings are called).

## Why this is scaffolded now but not filled in now

There is exactly one working voice agent in this codebase today
(`arrays-agent`). Extracting a shared package from a single real
implementation, before a second one exists to prove the shape is actually
reusable and not just "how arrays-agent happens to work," is the same
premature-generalization mistake `packages/blocks/README.md` and
`waveform-frame.ts`'s own README warn against for domain types. Connection
and tool-wiring code is lower-risk to extract early than a domain type would
be — it's shaped by OpenAI's API, not by guesswork about a second concept —
but "lower risk" isn't "zero risk," and `arrays-agent` is a working feature,
not a sandbox. Moving its connection code without first reading it carefully
and verifying nothing breaks is not something to do as a side effect of a
larger packages migration.

**The actual next step**, whenever it happens: read `arrays-agent`'s current
connection/session code in full, lift the concept-agnostic pieces into
`src/index.ts` here, leave the concept-specific pieces where they are, and
verify `arrays-agent` still works exactly as before, importing from this
package instead of its own local copy. Do that BEFORE wiring up a second
concept's voice agent (circuits, PN junction, or AM) — if this package's
shape doesn't hold up the moment a second concept actually uses it, that's
real signal to revise it while it's still cheap to revise.
