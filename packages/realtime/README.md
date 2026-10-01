# `@unlockpi/realtime`

This package is intentionally empty. It reserves a shared home for realtime infrastructure once more than one feature needs the same code.

## What belongs here

- Reusable connection lifecycle code.
- Generic Realtime tool registration and event routing.
- Shared, API-shaped types that do not know about a teaching concept.

## What stays elsewhere

- Array, circuit, waveform, and PN-junction operations stay in `@unlockpi/blocks`.
- Concept instructions, tool sets, and canvas bindings stay with their feature in `apps/web`.

The array agent is the current reference implementation. Extract code here only after a second realtime feature demonstrates that the same interface is useful.
