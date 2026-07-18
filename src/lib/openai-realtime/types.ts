/**
 * Shared types for the OpenAI Realtime WebRTC client.
 *
 * This module is intentionally framework-agnostic: nothing here imports
 * React. That's what makes `OpenAIRealtimeClient` (in realtime-client.ts)
 * portable — it only needs a browser with WebRTC, not this app.
 */

export type RealtimeStatus = "idle" | "connecting" | "connected" | "error";

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
   * Called whenever the model invokes a tool. Return the string you want
   * sent back to the model as the tool's result (e.g. `"ok"` or an error
   * message). Keep it synchronous and cheap — this blocks the model's turn.
   */
  onToolCall: (call: RealtimeToolCall) => string;
  onStatusChange?: (status: RealtimeStatus) => void;
  onError?: (message: string) => void;
};
