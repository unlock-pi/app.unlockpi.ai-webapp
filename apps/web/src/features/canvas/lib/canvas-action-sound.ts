import { play, type SoundName } from "cuelume";

import type { CanvasAiAction } from "@/features/canvas/types/canvas-types";

/**
 * Maps a canvas action to the cue that should accompany it.
 *
 * Deliberately keyed on the ACTION rather than on a component re-render: an
 * array or stack is often on screen several times at once (the editor
 * canvas, the frame thumbnails in the left panel, the start-class preview),
 * so playing from the render path would fire the same cue three or four
 * times for one push. One action, one sound.
 *
 * Returning undefined means "stay silent" — most structural/frame actions
 * aren't array or stack interactions and shouldn't make noise.
 */
export function soundForCanvasAction(
  action: CanvasAiAction,
): SoundName | undefined {
  switch (action.action) {
    // Something appeared / the structure grew — `open` is the palette's
    // reveal-and-expand cue.
    case "append_array_value":
    case "push_stack_value":
    case "add_array_block":
    case "add_stack_block":
    case "duplicate_array_block":
      return "open";

    // Something was taken away — `close` is the dismiss/collapse cue.
    case "pop_array_value":
    case "pop_stack_value":
      return "close";

    // The contents changed shape without growing or shrinking.
    case "set_array_values":
    case "resize_array":
      return "select";

    // Moving the spotlight across cells — the same crisp select cue used for
    // stepping through a traversal, so highlighting reads as navigation.
    case "highlight_array_index":
      return "select";

    default:
      return undefined;
  }
}

/** Plays the cue for an action, if that action has one. */
export function playCanvasActionSound(action: CanvasAiAction) {
  const sound = soundForCanvasAction(action);
  if (sound) play(sound);
}
