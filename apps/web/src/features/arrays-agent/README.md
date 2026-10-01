# Arrays agent

The arrays agent connects a live OpenAI Realtime session to an array block on the teaching canvas. It turns a teacher request into a constrained tool call, plays the resulting animation, and commits the settled state back to the canvas.

## Start here

`useArraysAgentOnCanvas()` is the integration point for the presenter. Give it the current document, active frame, and a way to apply document changes. It combines the voice session with the canvas bridge.

```tsx
const arrays = useArraysAgentOnCanvas({
  canvasId,
  getDocument: () => document,
  getActiveFrameId: () => activeFrameId,
  applyDocument: setDocument,
  activeFrameId,
  enabled: true,
});
```

Spread `arrays.viewProviderProps` around the canvas renderer so the active array can show live animation frames.

## How it works

```text
Teacher speech
  -> OpenAI Realtime session
  -> array tool in tools/array
  -> pure operation from @unlockpi/blocks/array
  -> ArrayFrame[] played by useArrayPlayer
  -> canvas bridge writes settled values to the document
```

The array package owns operations and animation vocabulary. This feature owns the model instructions, tool schemas, session state, telemetry, and canvas integration.

## Important files

- `hooks/use-arrays-voice-agent.ts` - session lifecycle, tool execution, player, and UI state.
- `hooks/use-arrays-canvas-bridge.ts` - finds, creates, and commits canvas array blocks.
- `lib/agent-identity.ts` - realtime tools and constrained agent instructions.
- `tools/array/` - tool definitions grouped by array capability.
- `tools/tool-context.ts` - the controlled surface tools use to affect the session and canvas.

## Rules for changes

- Add array behavior to `@unlockpi/blocks/array` first, then expose it through a feature tool.
- Tools should use `ArrayToolContext`; they must not reach into React state or mutate the canvas document directly.
- Keep the agent scoped to arrays and current-canvas actions. Its latest live context is the source of truth during a session.
- Live edits are presentation state until the canvas bridge commits the settled result.
