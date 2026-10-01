# Synchronized TOC teaching timelines

`TeachingTimeline<Action>` is a pure sequencing engine. Domain adapters supply
semantic actions; renderers and the existing voice client acknowledge lifecycle
events using a per-attempt token. There are no narration-duration timers.

1. Prepare a step's isolated narration response.
2. `output_audio_buffer.started` starts the corresponding visual action.
3. Motion's completion callback acknowledges the visual action. For NFA execution,
   all participating grouped edges must finish.
4. `output_audio_buffer.stopped` acknowledges drained audio, not just completed
   response generation.
5. Advance only after both acknowledgements match the active token.

Pausing cancels narration and rolls back the unfinished visual action. Resuming
restarts that same action with a new token; stale callbacks cannot advance it.
Undo affects the last completed action. Reset preserves an optional prepared
prefix, allowing an execution walkthrough to reset without deleting its graph.

## Automata integration

`features/automata-agent/construction` adapts the existing automaton model and
registers four intent-level tools: `start_construction`, `control_construction`,
`narrate_step`, and `animate_execution`. Individual state/edge/marking/highlighting
actions are typed entries in the timeline, not DOM tools. A construction plan is
validated before the authored block is committed. Its final mathematical graph
is persistent; progressive visibility and narration are transient.

The existing transition diagram computes layout from the complete graph, keeping
positions stable while objects appear. Traversal uses its existing water-flow
renderer. Execution traces come from the existing DFA/NFA engine. Optional
per-step narration strings allow the agent to explain in the requested language.

Thompson and subset trace adapters reuse existing algorithms and emit the same
timeline contract. They are available to later RE orchestration; they do not
replace or alter the current RE tools. Other domains can supply their own action
type and rendering adapter without changing this sequencing engine.

## Verification boundary

Unit tests cover lifecycle ordering, cancellation, stale callbacks, single-step
playback, reset/undo, graph visibility, and construction trace adapters. Realtime
tests inject protocol events; they do not make live API calls. A connected browser
voice session is still required to verify end-to-end WebRTC playback and visual
timing on the deployment.
