import type {
  OpenAIRealtimeClientOptions,
  RealtimeStatus,
  RealtimeToolCall,
} from "@/lib/openai-realtime/types";

/**
 * A minimal client for OpenAI's Realtime API over WebRTC.
 *
 * This is the whole connection lifecycle in one place, with no framework
 * dependency, no LiveKit, no server-side agent process — just:
 *
 *   1. Ask your own server for a short-lived ("ephemeral") client secret.
 *   2. Open a WebRTC PeerConnection and attach the user's microphone.
 *   3. Open a data channel for JSON events (the model's text/tool-call stream).
 *   4. Exchange an SDP offer/answer directly with OpenAI, authenticated by
 *      the ephemeral secret from step 1.
 *
 * That's the entire mechanism the Realtime API is built around. If you want
 * to lift this into its own package later, this file plus types.ts is the
 * whole "SDK" — everything else in this app just calls it.
 *
 * It also owns its own resilience: a WebRTC `connectionState` of
 * "disconnected" is often a few seconds of bad wifi that clears up on its
 * own, not a dead session, so that state gets a grace period rather than an
 * instant teardown. If the connection really is gone — grace period expires,
 * or the state is "failed" — it retries `connect()` itself with capped
 * exponential backoff, and gives up (reporting `onError`) only after
 * `MAX_RECONNECT_ATTEMPTS`. `navigator.onLine`/`offline` feed the same path:
 * `offline` is a faster signal than waiting out an ICE timeout, and `online`
 * short-circuits whatever backoff delay was queued for "probably still
 * offline".
 */

/** How many automatic reconnect attempts before giving up and surfacing an error. */
const MAX_RECONNECT_ATTEMPTS = 4;
/** Backoff schedule: 1s, 2s, 4s, 8s (capped), each with a little jitter. */
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15_000;
const RECONNECT_JITTER_MS = 300;
/**
 * How long a WebRTC `connectionState` of "disconnected" is given to recover
 * on its own before it's treated as a real loss. ICE reports "disconnected"
 * on ordinary packet loss blips; tearing the session down on every one of
 * those would end class over nothing.
 */
const DISCONNECT_GRACE_MS = 4_000;

export class OpenAIRealtimeClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private handledCallIds = new Set<string>();
  private status: RealtimeStatus = "idle";

  // ── Reconnection ─────────────────────────────────────────────────────
  /** Set only by the public `disconnect()` — distinguishes "the teacher left" from "the network dropped". */
  private intentionalDisconnect = false;
  /** True from the first automatic retry until it succeeds or gives up. */
  private autoReconnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private networkListenersBound = false;
  /**
   * Bumped on every `connect()` call; a run checks its own number against
   * this after each `await` to notice it's been superseded — by a cancel, or
   * by a newer `connect()` starting before it finished. That's what lets a
   * teacher click "cancel" mid-handshake: the in-flight attempt doesn't get
   * torn down forcibly, it notices on its own next step and stops itself
   * rather than going on to open a connection nobody asked for anymore.
   */
  private connectGeneration = 0;
  /** Aborts the connect attempt's own fetches — the fast half of cancelling; the slow half is the generation check. */
  private connectAbort: AbortController | null = null;

  // ── Turn bookkeeping ─────────────────────────────────────────────────
  // The API rejects `response.create` while a response is still running
  // ("conversation_already_has_active_response"). Tool calls are dispatched
  // mid-response and our tools resolve in about a millisecond, so asking for
  // the follow-up immediately was always rejected — silently — and the model
  // stalled after "let me check". The follow-up is now requested once, after
  // the response is done AND every tool result from it has been sent.
  private responseActive = false;
  private pendingCallIds = new Set<string>();
  private followUpNeeded = false;
  private userSpeaking = false;
  private awaitingFirstOutput = false;
  /** Item ids of replaceable context messages, keyed by slot name. */
  private contextItemIds = new Map<string, string>();
  private contextItemCounter = 0;

  constructor(private readonly options: OpenAIRealtimeClientOptions) {}

  getStatus(): RealtimeStatus {
    return this.status;
  }

  /** Push new instructions to an already-connected session (e.g. "here is the next question"). */
  updateInstructions(instructions: string): void {
    // `type` is required on session.update for GA Realtime sessions.
    this.sendEvent({ type: "session.update", session: { type: "realtime", instructions } });
  }

  sendEvent(event: Record<string, unknown>): void {
    if (this.dataChannel?.readyState !== "open") {
      return;
    }
    this.dataChannel.send(JSON.stringify({ event_id: crypto.randomUUID(), ...event }));
  }

  async connect(): Promise<void> {
    if (this.status === "connecting" || this.status === "connected") {
      return;
    }

    // A fresh call to `connect()` — whether the teacher pressed start or this
    // is a retry the class itself scheduled — means we're no longer walking
    // away from the session on purpose.
    this.intentionalDisconnect = false;
    this.clearDisconnectGrace();
    this.bindNetworkListeners();
    // Preserve "reconnecting" through a retry attempt itself; only a
    // teacher-initiated connect (autoReconnecting false) shows "connecting".
    this.setStatus(this.autoReconnecting ? "reconnecting" : "connecting");

    const generation = ++this.connectGeneration;
    const abort = new AbortController();
    this.connectAbort = abort;
    /** True once this run has been cancelled or overtaken by a newer `connect()`. */
    const isStale = () => generation !== this.connectGeneration;

    try {
      // Step 0: `navigator.mediaDevices` is only defined in a secure context
      // (https, or literally the hostname "localhost") and can be withheld
      // entirely by an embedding page's Permissions-Policy. Both leave it
      // `undefined` rather than throwing, so the previous code's first sign
      // of trouble was a bare "Cannot read properties of undefined (reading
      // 'getUserMedia')" — accurate, but useless to a teacher. Check for it
      // before touching the network at all, and say what to actually do.
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "This browser isn't allowing microphone access here — the page needs to be loaded over https:// (or http://localhost) with microphone permission allowed, not opened inside an embedded preview.",
        );
      }

      // Step 1: get a short-lived secret from our own server. This is the
      // only network call that needs a real API key, and it never leaves
      // our server.
      const tokenResponse = await fetch(this.options.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.options.tokenBody ?? {}),
        signal: abort.signal,
      });
      if (isStale()) return;
      const tokenData = await tokenResponse.json();
      if (isStale()) return;
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error ?? "Unable to start the realtime session.");
      }
      const ephemeralKey: string | undefined =
        tokenData.value ?? tokenData.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("Realtime client secret was missing from the server response.");
      }
      this.options.onUsageSessionCreated?.(
        typeof tokenData.usage_session_id === "string"
          ? tokenData.usage_session_id
          : null,
      );

      // Step 2: set up the peer connection and attach the mic.
      const peerConnection = new RTCPeerConnection();
      this.peerConnection = peerConnection;
      peerConnection.addEventListener("connectionstatechange", () => {
        const state = peerConnection.connectionState;
        if (state === "connected") {
          // Recovered on its own — cancel any grace timer still counting down.
          this.clearDisconnectGrace();
          return;
        }
        if (state === "failed") {
          this.handleConnectionLoss();
          return;
        }
        if (state === "disconnected") {
          this.scheduleDisconnectGrace();
        }
      });

      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.hidden = true;
      document.body.append(audioElement);
      peerConnection.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
        this.options.onRemoteStream?.(event.streams[0] ?? null);
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (isStale()) {
        // Cancelled while the mic permission prompt was up. `disconnect()`
        // had nothing of this run's to tear down yet — release the mic now.
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.localStream = mediaStream;
      mediaStream.getAudioTracks().forEach((track) => peerConnection.addTrack(track, mediaStream));

      // Step 3: the data channel carries every non-audio event — transcripts,
      // tool calls, session updates. Its name ("oai-events") is arbitrary;
      // OpenAI doesn't care what you call it.
      const dataChannel = peerConnection.createDataChannel("oai-events");
      this.dataChannel = dataChannel;
      dataChannel.addEventListener("message", (event) => {
        try {
          this.handleServerEvent(JSON.parse(event.data));
        } catch {
          // Ignore malformed/unrecognized events rather than crashing the session.
        }
      });
      dataChannel.addEventListener("open", () => {
        // A live data channel is the actual "it's working" signal — reset the
        // retry count so the NEXT drop gets the full set of attempts again,
        // rather than inheriting a count left over from this recovery.
        this.reconnectAttempts = 0;
        this.autoReconnecting = false;
        this.setStatus("connected");
      });

      // Step 4: classic WebRTC offer/answer, just sent over plain HTTPS
      // instead of a signaling server — OpenAI's endpoint *is* the signaling
      // server here.
      const offer = await peerConnection.createOffer();
      if (isStale()) return;
      await peerConnection.setLocalDescription(offer);
      if (isStale()) return;
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        signal: abort.signal,
      });
      if (isStale()) return;
      if (!sdpResponse.ok) {
        // Read the body. This used to throw a generic "OpenAI rejected the
        // realtime connection", which looks identical whether the account is
        // out of credits, the key is wrong, or the model name is — three very
        // different fixes, and no way to tell them apart from the UI.
        const detail = await sdpResponse.text().catch(() => "");
        throw new Error(describeApiFailure(sdpResponse.status, detail));
      }
      const answerSdp = await sdpResponse.text();
      if (isStale()) return;
      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (error) {
      // A cancelled `fetch` rejects with an AbortError — that's `isStale()`
      // by another name (the abort IS the cancellation), not a real failure.
      // Nothing to report: `disconnect()` already put the status back to
      // "idle" and cleaned up whatever this run had built so far.
      if (isStale() || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }

      this.teardownConnection();
      const message =
        error instanceof Error ? error.message : "The realtime session could not connect.";

      // This attempt failed WHILE auto-retrying (the token fetch or SDP
      // exchange hit the same bad network that dropped the last one) — that
      // is exactly what the backoff loop exists for. Queue the next attempt
      // instead of surfacing an error after one failed retry out of four.
      if (this.autoReconnecting && !this.intentionalDisconnect) {
        this.attemptReconnect();
        return;
      }

      this.setStatus("error");
      this.options.onError?.(message);
    }
  }

  /**
   * Everything about the CURRENT connection — peer connection, data channel,
   * mic tracks, per-session bookkeeping. Does not touch `status` or the
   * retry counters, because it's used by both the intentional `disconnect()`
   * (which then resets those) and an automatic reconnect (which needs them
   * to survive into the next attempt).
   */
  private teardownConnection(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
    this.peerConnection?.getSenders().forEach((sender) => sender.track?.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.handledCallIds.clear();
    this.pendingCallIds.clear();
    this.contextItemIds.clear();
    this.responseActive = false;
    this.followUpNeeded = false;
    this.userSpeaking = false;
    this.awaitingFirstOutput = false;
    this.options.onRemoteStream?.(null);
  }

  /**
   * Stop everything: a live session, a connection attempt still in the
   * middle of its handshake, or a pending automatic retry. All three are
   * "there is a session someone would have to want" — the teacher deciding
   * mid-click that they don't is the same action regardless of which one it
   * was, so this is the one method for it, not `disconnect()` plus a
   * separate `cancelConnect()`.
   */
  disconnect(): void {
    // The one place this is set true: everything else on this page treats a
    // dropped connection as something to fix, so this is what tells that
    // machinery "no, actually stop."
    this.intentionalDisconnect = true;
    this.autoReconnecting = false;
    this.reconnectAttempts = 0;
    this.clearDisconnectGrace();
    this.clearReconnectTimer();
    this.unbindNetworkListeners();
    // Invalidates any `connect()` mid-flight: its own `isStale()` checks
    // start returning true, and its fetch is cut instead of left to finish
    // pointlessly in the background. It notices and unwinds itself — see the
    // comment on `connectGeneration`.
    this.connectGeneration++;
    this.connectAbort?.abort();
    this.connectAbort = null;
    this.teardownConnection();
    this.setStatus("idle");
  }

  // ── Reconnection machinery ───────────────────────────────────────────

  /** The connection is confirmed gone (ICE failed, or "disconnected" outlasted its grace period). */
  private handleConnectionLoss(): void {
    if (this.intentionalDisconnect || this.status === "reconnecting") return;
    this.clearDisconnectGrace();
    this.teardownConnection();
    this.attemptReconnect();
  }

  private scheduleDisconnectGrace(): void {
    if (this.disconnectGraceTimer) return;
    this.disconnectGraceTimer = setTimeout(() => {
      this.disconnectGraceTimer = null;
      if (this.peerConnection?.connectionState !== "connected") {
        this.handleConnectionLoss();
      }
    }, DISCONNECT_GRACE_MS);
  }

  private clearDisconnectGrace(): void {
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Queue the next retry, or give up once `MAX_RECONNECT_ATTEMPTS` is spent. */
  private attemptReconnect(): void {
    if (this.intentionalDisconnect) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.autoReconnecting = false;
      this.reconnectAttempts = 0;
      this.setStatus("error");
      this.options.onError?.(
        "The realtime connection was lost and could not be restored. Check your connection and start again.",
      );
      return;
    }

    this.autoReconnecting = true;
    this.reconnectAttempts++;
    this.setStatus("reconnecting");
    this.options.onReconnectAttempt?.(this.reconnectAttempts, MAX_RECONNECT_ATTEMPTS);

    const delay =
      Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempts - 1),
        RECONNECT_MAX_DELAY_MS,
      ) + Math.random() * RECONNECT_JITTER_MS;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  // ── Browser network signal ───────────────────────────────────────────
  // Faster and cheaper than waiting on WebRTC to notice: `offline` fires the
  // instant the OS reports no network, and `online` cuts short whatever
  // backoff delay was queued on the assumption we were still offline.

  private readonly handleOffline = () => {
    if (this.status !== "connected" && this.status !== "reconnecting") return;
    this.handleConnectionLoss();
  };

  private readonly handleOnline = () => {
    if (this.status === "reconnecting" && this.reconnectTimer) {
      this.clearReconnectTimer();
      void this.connect();
    }
  };

  private bindNetworkListeners(): void {
    if (this.networkListenersBound) return;
    this.networkListenersBound = true;
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("online", this.handleOnline);
  }

  private unbindNetworkListeners(): void {
    if (!this.networkListenersBound) return;
    this.networkListenersBound = false;
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("online", this.handleOnline);
  }

  /**
   * Adds a message to the model's context WITHOUT asking it to respond.
   * This is how the app keeps the model's picture of the board fresh: state
   * changes update what it knows, but only the teacher's voice makes it talk.
   */
  syncContext(text: string): void {
    this.sendEvent({
      type: "conversation.item.create",
      item: { type: "message", role: "system", content: [{ type: "input_text", text }] },
    });
  }

  /**
   * Like `syncContext`, but keeps exactly ONE copy per slot: the previous
   * message for the slot is deleted before the new one is added.
   *
   * Appending a fresh board description on every change filled the model's
   * context window with stale copies, which pushed out the actual conversation
   * — the reason it "forgot" what it had just done. Replacing keeps the latest
   * state at the end of the conversation, where it is both fresh and the last
   * thing to be trimmed.
   */
  replaceContext(slot: string, text: string): void {
    if (this.dataChannel?.readyState !== "open") return;

    const previous = this.contextItemIds.get(slot);
    if (previous) {
      this.sendEvent({ type: "conversation.item.delete", item_id: previous });
    }

    // Item ids are client-chosen and capped at 32 characters.
    const id = `ctx_${slot.slice(0, 8)}_${(this.contextItemCounter++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.contextItemIds.set(slot, id);
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        id,
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  /** Mute or unmute the microphone without dropping the session. */
  setMicrophoneEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  isMicrophoneEnabled(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    return track ? track.enabled : false;
  }

  /**
   * Ask the model to speak now — a greeting, a recap. Returns false when a
   * response is already running or the teacher is mid-sentence, because the
   * API would reject it and the agent would talk over them.
   */
  requestResponse(instructions?: string): boolean {
    if (this.responseActive || this.userSpeaking) return false;
    this.sendEvent({
      type: "response.create",
      ...(instructions ? { response: { instructions } } : {}),
    });
    return true;
  }

  private setStatus(status: RealtimeStatus) {
    // Each retry re-announces "reconnecting" (attemptReconnect, then connect()
    // itself) — skip the no-op so onStatusChange fires once per real change.
    if (status === this.status) return;
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  /** Sends a tool's result back, then asks for the follow-up once it is safe. */
  private sendToolOutput(callId: string, output: string) {
    this.sendEvent({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output },
    });
    this.pendingCallIds.delete(callId);
    this.followUpNeeded = true;
    this.requestFollowUpIfReady();
  }

  /**
   * Ask the model to continue after its tool calls — but only when nothing
   * would make the API reject it or make it talk over the teacher.
   */
  private requestFollowUpIfReady() {
    if (
      !this.followUpNeeded ||
      this.responseActive ||
      this.pendingCallIds.size > 0 ||
      this.userSpeaking
    ) {
      return;
    }
    this.followUpNeeded = false;
    this.sendEvent({ type: "response.create" });
  }

  private markFirstOutput() {
    if (!this.awaitingFirstOutput) return;
    this.awaitingFirstOutput = false;
    this.options.onFirstOutput?.();
  }

  private dispatchToolCall(call: RealtimeToolCall) {
    // The model can resend the same function-call-arguments event while
    // streaming; only act on each call_id once.
    if (this.handledCallIds.has(call.callId)) {
      return;
    }
    this.handledCallIds.add(call.callId);
    this.pendingCallIds.add(call.callId);
    this.options.onToolCallStart?.(call);

    let output: string | Promise<string>;
    try {
      output = this.options.onToolCall(call);
    } catch (error) {
      // A throwing handler must still close the turn, or the model waits
      // forever for a result that is never coming.
      this.sendToolOutput(
        call.callId,
        JSON.stringify({ ok: false, error: describeError(error) }),
      );
      return;
    }

    if (typeof output === "string") {
      this.sendToolOutput(call.callId, output);
      return;
    }

    output
      .then((resolved) => this.sendToolOutput(call.callId, resolved))
      .catch((error: unknown) =>
        this.sendToolOutput(
          call.callId,
          JSON.stringify({ ok: false, error: describeError(error) }),
        ),
      );
  }

  private handleServerEvent(event: Record<string, unknown>) {
    // Realtime sends the same tool call info through a couple of different
    // event shapes depending on timing; normalize them here so the rest of
    // the client only deals with one RealtimeToolCall shape.
    const type = event.type as string | undefined;

    // Server errors used to fall through unhandled, which is how a rejected
    // follow-up could stall the agent with no trace anywhere.
    if (type === "error") {
      const error = event.error as { message?: string; code?: string } | undefined;
      this.options.onServerError?.(
        error?.message ?? "The realtime API reported an error.",
        error?.code,
      );
      return;
    }

    // Text deltas and audio-transcript deltas are named differently across
    // Realtime API versions, so match on the suffix rather than the full name.
    if (
      typeof event.delta === "string" &&
      (type?.endsWith("text.delta") || type?.endsWith("transcript.delta"))
    ) {
      this.markFirstOutput();
      this.options.onTranscriptDelta?.(event.delta);
      return;
    }

    if (type === "response.function_call_arguments.delta") {
      this.markFirstOutput();
      return;
    }

    if (type === "response.done") {
      // Mark the response finished BEFORE dispatching any calls it carries, so
      // their follow-up is not held back waiting on a response that is over.
      this.responseActive = false;
      this.awaitingFirstOutput = false;
      this.options.onResponseDone?.(event.response);
      // `response.output` carries function calls when the model emitted them
      // as part of a completed response rather than streaming them.
      const output = (event.response as { output?: unknown[] } | undefined)?.output;
      output?.forEach((item) => {
        const call = item as { type?: string; call_id?: string; name?: string; arguments?: string };
        if (call.type === "function_call" && call.call_id && call.name && call.arguments) {
          this.dispatchToolCall({
            callId: call.call_id,
            name: call.name,
            argumentsJson: call.arguments,
          });
        }
      });
      this.requestFollowUpIfReady();
      return;
    }

    if (type === "input_audio_buffer.speech_started") {
      this.userSpeaking = true;
      // The teacher has started a new turn. Their turn produces its own
      // response, which will already see every tool result — a separate
      // follow-up now would only talk over them.
      this.followUpNeeded = false;
      this.options.onSpeechStarted?.();
      return;
    }

    if (type === "input_audio_buffer.speech_stopped") {
      this.userSpeaking = false;
      this.options.onSpeechStopped?.();
      return;
    }

    if (type === "response.created") {
      this.responseActive = true;
      this.awaitingFirstOutput = true;
      this.options.onResponseCreated?.();
      return;
    }

    // The name of this event has moved around across API versions; matching on
    // the suffix keeps the "what did it hear" signal working across all of them.
    if (type?.endsWith("input_audio_transcription.completed")) {
      const transcript = event.transcript;
      if (typeof transcript === "string" && transcript.trim()) {
        this.options.onUserTranscript?.(transcript.trim());
      }
      return;
    }

    if (type === "output_audio_buffer.started") {
      this.markFirstOutput();
      this.options.onAudioPlaybackChange?.(true);
      return;
    }

    if (type === "output_audio_buffer.stopped") {
      this.options.onAudioPlaybackChange?.(false);
      return;
    }

    if (type === "response.function_call_arguments.done") {
      const callId = event.call_id as string | undefined;
      const name = event.name as string | undefined;
      const argumentsJson = event.arguments as string | undefined;
      if (callId && name && argumentsJson) {
        this.dispatchToolCall({ callId, name, argumentsJson });
      }
      return;
    }

    if (type === "response.output_item.done") {
      const item = event.item as
        | { type?: string; call_id?: string; name?: string; arguments?: string }
        | undefined;
      if (item?.type === "function_call" && item.call_id && item.name && item.arguments) {
        this.dispatchToolCall({
          callId: item.call_id,
          name: item.name,
          argumentsJson: item.arguments,
        });
      }
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "The tool failed to run.";
}

/**
 * Turn an OpenAI error response into something a teacher can act on.
 *
 * The common failures are not code problems — no credits, a bad key, a model
 * the account cannot use — so the message has to say which one it is rather
 * than "rejected".
 */
export function describeApiFailure(status: number, body: string): string {
  let message = "";
  let code = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: string } };
    message = parsed.error?.message ?? "";
    code = parsed.error?.code ?? "";
  } catch {
    message = body.slice(0, 200);
  }

  if (code === "credit_balance_exhausted" || code === "insufficient_quota") {
    return "Your OpenAI account has no credits left, so the session cannot start. Add credits in the OpenAI billing settings and try again.";
  }
  if (status === 401 || status === 403) {
    return `OpenAI refused the key (HTTP ${status}). Check OPENAI_API_KEY and that the project may use the Realtime API.${message ? ` ${message}` : ""}`;
  }
  if (status === 429) {
    return `OpenAI is rate-limiting this account (HTTP 429).${message ? ` ${message}` : ""}`;
  }
  return `OpenAI rejected the connection (HTTP ${status}).${message ? ` ${message}` : ""}`;
}
