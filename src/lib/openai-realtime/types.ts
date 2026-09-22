/**
 * Shared types for the OpenAI Realtime WebRTC client.
 *
 * This module is intentionally framework-agnostic: nothing here imports
 * React. That's what makes `OpenAIRealtimeClient` (in realtime-client.ts)
 * portable — it only needs a browser with WebRTC, not this app.
 */

/**
 * `reconnecting`: the connection dropped mid-session and the client is
 * automatically retrying with backoff. Distinct from `connecting` (the
 * teacher pressed start) so the UI can say which one is happening — a
 * teacher mid-class doesn't need to know it's "connecting", they need to
 * know their previous session is trying to come back.
 */
export type RealtimeStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

/** A tool call the model made, already unpacked from the wire event. */
export type RealtimeToolCall = {
  callId: string;
  name: string;
  /** Raw arguments the model sent — always a JSON string per the Realtime API. */
  argumentsJson: string;
};

export type OpenAIRealtimeClientOptions = {
  /**
   * Your own server route that mints an ephemeral OpenAI client secret and
   * returns `{ value: string }` (or `{ client_secret: { value } }`). Keep
   * your OPENAI_API_KEY there — never call OpenAI directly with a real key
   * from the browser.
   */
  tokenEndpoint: string;
  /** Extra JSON body sent to tokenEndpoint, e.g. context for building instructions server-side. */
  tokenBody?: Record<string, unknown>;
  /**
   * Called whenever the model invokes a tool. Return the string to send back
   * as the tool's result (e.g. `"ok"` or an error message), or a promise of
   * one. Keep it cheap either way — the model's turn waits on it.
   */
  onToolCall: (call: RealtimeToolCall) => string | Promise<string>;
  onStatusChange?: (status: RealtimeStatus) => void;
  onError?: (message: string) => void;
  /**
   * An automatic reconnect attempt is about to start, `attempt` seconds after
   * the connection dropped. Purely informational — the client retries on its
   * own either way — but lets the UI say "attempt 2 of 4" instead of just
   * spinning.
   */
  onReconnectAttempt?: (attempt: number, maxAttempts: number) => void;
  /** Streaming text/audio-transcript deltas, for live captions. */
  onTranscriptDelta?: (delta: string) => void;
  /** A response finished generating. Carries usage for cost tracking. */
  onResponseDone?: (response: unknown) => void;
  /** The model's audio track, for visualizers that react to the real voice. */
  onRemoteStream?: (stream: MediaStream | null) => void;
  /** The user started speaking — useful for interrupting a walkthrough. */
  onSpeechStarted?: () => void;
  /** The user stopped speaking. The clock for "did it understand me" starts here. */
  onSpeechStopped?: () => void;
  /** The model began generating a response. */
  onResponseCreated?: () => void;
  /**
   * What the model heard the user say, once transcription completes. The most
   * direct answer to "is it actually listening to me".
   */
  onUserTranscript?: (text: string) => void;
  /** A tool call is about to run, before the handler is invoked. */
  onToolCallStart?: (call: RealtimeToolCall) => void;
  /**
   * The response produced its first real output — a word, the start of a tool
   * call, or audio. Measured from here, latency means "it understood and is
   * acting", not merely "a response object was created".
   */
  onFirstOutput?: () => void;
  /** An `error` event from the server. Not fatal on its own; the session continues. */
  onServerError?: (message: string, code?: string) => void;
  /** True while the model's voice is actually playing out to the room. */
  onAudioPlaybackChange?: (active: boolean) => void;
};
