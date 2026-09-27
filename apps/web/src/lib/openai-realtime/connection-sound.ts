import { play } from "cuelume";

/**
 * Sound cues for the realtime connection lifecycle.
 *
 * A teacher running a class is looking at the board, not the dock — these
 * are the psychological cues that let them track "is it listening yet",
 * "did it drop", "is it trying to come back" by ear, without breaking eye
 * contact with the class. Each state gets a DISTINCT sound rather than one
 * click at different volumes, because a distinct sound is what becomes
 * recognizable without conscious attention; a volume difference isn't.
 *
 * - `connecting`: a rising, unresolved lift — work has started, nothing is
 *   ready yet.
 * - `connected`: a clear lock-on tone — the one moment worth an unmissable
 *   confirmation, so unlike every other cue here it plays at full volume
 *   regardless of the app's ambient sound level.
 * - `reconnecting`: a quick three-step locator, like something searching —
 *   the connection dropped and it's trying to find its way back on its own.
 * - `error`: a calm, muted two-note fall — trouble, but not a crash; nothing
 *   the teacher did wrong.
 * - `idle`: a single soft downward note — the session ended.
 */
export type ConnectionCueStatus = "connecting" | "connected" | "reconnecting" | "error" | "idle";

export function playConnectionCue(status: ConnectionCueStatus): void {
  switch (status) {
    case "connecting":
      play("loading");
      return;
    case "connected":
      play("ready", { volume: 1 });
      return;
    case "reconnecting":
      play("scan");
      return;
    case "error":
      play("error");
      return;
    case "idle":
      play("droplet");
      return;
  }
}

/**
 * The microphone toggle — `press`/`release` are cuelume's own two halves of
 * one physical gesture (a key going down, then springing back up), which is
 * exactly what muting and unmuting are: the same control, two positions.
 */
export function playMicCue(enabled: boolean): void {
  play(enabled ? "release" : "press");
}
