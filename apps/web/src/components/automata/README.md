# Automata block

Interactive finite-automata visualisation for the Canvas Editor. The block lets
authors create a deterministic finite automaton (DFA) or nondeterministic finite
automaton (NFA), show its state diagram and transition table, and step through an
input string. The DFA/NFA Realtime agent lives in
`src/features/automata-agent/` and controls this block through the domain
engine and Puck document bridge.

The public entry point is `@/components/automata`:

```ts
import { AutomatonBlock } from "@/components/automata";
import type { Automaton, AutomatonBlockProps } from "@/components/automata";
```

In production, the block is registered as `AutomatonBlock` in
`src/features/canvas/components/canvas-puck-config.tsx`. Puck supplies the
component instance `id`; consumers rendering it outside Puck must supply one as
well.

## What it supports

- DFA and NFA authoring.
- NFA epsilon transitions, written as `ε`, `eps`, or `epsilon` (normalised to
  `ε` in the rendered model). DFA epsilon transitions are rejected.
- One initial state, any number of accepting states, self-loops, and reciprocal
  transitions.
- Step-by-step execution with active and previously visited states/transitions.
- An optional transition table which follows the live execution state.
- Status overrides (`normal`, `visited`, or `highlighted`) for explanatory,
  non-execution visual emphasis.

## Folder map

| File | Responsibility |
| --- | --- |
| `index.ts` | Public exports for the block and portable domain types. |
| `automaton.tsx` | Block orchestration: converts authored props, validates them, owns execution state, and composes the UI. |
| `model.ts` | Renderer-independent automaton types, validation, epsilon handling, traces, and execution functions. |
| `authoring.ts` | Reconciles Puck array edits: ensures unique IDs and exactly one initial state. |
| `agent-view-context.tsx` | Supplies transient agent execution without persisting it into Puck. |
| `transition-diagram.tsx` | Self-contained SVG states, transitions, layout, pan/zoom, and Motion-based execution flow. |
| `transition-table.tsx` | Accessible transition-table view. |
| `input-string.tsx` | Displays the input and its current execution position. |
| `execution-panel.tsx` | Step and reset controls. |

## Data flow

```text
Puck authoring props
        │  reconcile IDs and the initial-state invariant
        ▼
AutomatonBlock ──► portable Automaton model ──► validation messages
        │                    │
        │                    ├──► separate execution state / stepAutomaton()
        │                    │
        │                    ├──► TransitionTable
        │                    │
        │                    └──► TransitionDiagram (SVG)
        ▼
InputString + ExecutionPanel
```

`model.ts` has no renderer dependency. Keep formal automaton behaviour there
so it stays easy to test and reuse.

## Authored block props

`AutomatonBlockProps` is the persisted, editor-friendly shape. Lists in string
fields are comma-separated.

| Prop | Type | Notes |
| --- | --- | --- |
| `type` | `"dfa" \| "nfa"` | Enables DFA validation or NFA epsilon semantics. |
| `alphabet` | `string` | Comma-separated symbols, for example `"0, 1"`. |
| `input` | `string` | Whitespace is removed before execution. Each remaining character is one input symbol. |
| `states` | `AutomatonBlockState[]` | States have an internal `id`, display `label`, `initial`, `accepting`, and optional visual `status`. |
| `transitions` | `AutomatonBlockTransition[]` | Each transition names `from`, `to`, comma-separated `symbols`, and optional visual `status`. |
| `showTransitionTable` | `boolean` | Toggles the table beneath the diagram. |

Example Puck-compatible props:

```ts
const evenOnesDfa: AutomatonBlockProps = {
  type: "dfa",
  alphabet: "0, 1",
  input: "101",
  states: [
    { id: "q0", label: "even", initial: true, accepting: true },
    { id: "q1", label: "odd", accepting: false },
  ],
  transitions: [
    { id: "t0", from: "q0", to: "q0", symbols: "0" },
    { id: "t1", from: "q0", to: "q1", symbols: "1" },
    { id: "t2", from: "q1", to: "q1", symbols: "0" },
    { id: "t3", from: "q1", to: "q0", symbols: "1" },
  ],
  showTransitionTable: true,
};
```

## Authoring rules and validation

`reconcileAutomatonProps` runs when Puck edits the block. It trims endpoints,
creates missing or duplicate state/transition IDs (`q0`, `q1`, … and `t0`,
`t1`, …), and preserves exactly one initial state when states exist. Use it
whenever authored props are changed outside the standard Puck configuration.

Before execution, `AutomatonBlock` reports these authoring problems and disables
the Step control:

- A transition endpoint does not identify an existing state.
- A transition has no symbol.
- A non-epsilon transition symbol is missing from the alphabet.
- A DFA contains an epsilon transition.
- More than one destination is defined for a DFA state/symbol pair.

The DFA check detects ambiguity; it does not require a total transition function.
State IDs are the graph identity, while labels are presentation only. Update
transition endpoints if an ID changes.

## Agent tools

The Realtime session exposes exactly these ten tools:
`create_automaton`, `select_automaton`, `inspect_automaton`,
`modify_automaton`, `validate_automaton`, `simulate_automaton`,
`step_execution`, `reset_execution`, `satisfy_automaton_goal`, and
`analyze_automaton`. Small state and transition helpers remain internal.

Definitions change transactionally: clone, apply the full batch, validate, then
commit. Execution is a separate object and drives the graph, table, and input
views through `AutomataAgentViewProvider`.

## Execution semantics

The execution API in `model.ts` is reusable independently of the UI:

```ts
import {
  createAutomatonExecution,
  stepAutomaton,
  type Automaton,
} from "@/components/automata/model";

let execution = createAutomatonExecution(automaton);
execution = stepAutomaton(automaton, [..."101"], execution);
```

- Execution begins in the start state. For an NFA, its epsilon closure is active
  immediately.
- A step consumes one input character, follows every matching outgoing
  transition, and then applies the NFA epsilon closure to all targets.
- A run accepts only when all input is consumed and at least one active state is
  accepting. It rejects early when no active target remains.
- Press **Step** once for an empty input to evaluate it; **Reset** restores the
  initial closure and clears traversal history.
- Input is tokenised character-by-character, so execution currently expects
  single-character symbols. Multi-character comma-separated values can be
  authored but will not match a single execution step.

## Rendering and styling

`TransitionDiagram` renders SVG from the portable model. It never owns formal
model or execution data. Its Motion animation moves the signal along the active edge
without redrawing the whole graph each frame.

- A deterministic left-to-right layout places states; the model stores no coordinates.
- Parallel transitions between the same endpoints share one labelled arrow.
- Reciprocal transitions are curved into separate label lanes; self-loops are
  placed on the outside of the graph.
- Accepting states use double circles and the start arrow is drawn in SVG.
- State and edge colours follow active, highlighted, visited, then normal
  precedence.
- Active focus uses the same sky-blue colour as the array components.

Drag to pan, scroll to zoom, and double-click or use Reset view to fit again.

## Extending the block

1. Add persisted/editor fields and defaults to the `AutomatonBlock` definition
   in `canvas-puck-config.tsx`.
2. Update `AutomatonBlockProps` and its `toAutomaton` conversion when the
   persisted shape changes.
3. Put formal semantics in `model.ts`; do not add them to the renderer.
4. Extend `authoring.ts` if the new data needs a cross-field invariant.
5. Update both `TransitionTable` and `transition-diagram.tsx` when the change
   affects how transitions or states are presented.
6. Export any intentional consumer-facing API from `index.ts` and add tests for
   model and reconciliation behaviour.

## Verification

From `app.unlockpi.ai-webapp`, run:

```bash
npm run lint
npm run build
```

When changing execution logic, cover DFA acceptance/rejection, NFA branching,
epsilon closure (including the initial closure), empty input, dead ends, and
reset behaviour. When changing the renderer, also manually check self-loops,
reciprocal edges, parallel-symbol labels, narrow containers, and light/dark
themes.
