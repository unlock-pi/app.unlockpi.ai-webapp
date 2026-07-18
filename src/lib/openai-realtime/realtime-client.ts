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
 */
export class OpenAIRealtimeClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private handledCallIds = new Set<string>();
  private status: RealtimeStatus = "idle";

  constructor(private readonly options: OpenAIRealtimeClientOptions) {}

  getStatus(): RealtimeStatus {
    return this.status;
  }

  /** Push new instructions to an already-connected session (e.g. "here is the next question"). */
  updateInstructions(instructions: string): void {
    this.sendEvent({ type: "session.update", session: { instructions } });
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

    this.setStatus("connecting");

    try {
      // Step 1: get a short-lived secret from our own server. This is the
      // only network call that needs a real API key, and it never leaves
      // our server.
      const tokenResponse = await fetch(this.options.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.options.tokenBody ?? {}),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error ?? "Unable to start the realtime session.");
      }
      const ephemeralKey: string | undefined =
        tokenData.value ?? tokenData.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("Realtime client secret was missing from the server response.");
      }

      // Step 2: set up the peer connection and attach the mic.
      const peerConnection = new RTCPeerConnection();
      this.peerConnection = peerConnection;
      peerConnection.addEventListener("connectionstatechange", () => {
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          this.disconnect();
          this.setStatus("error");
          this.options.onError?.("The realtime connection was interrupted.");
        }
      });

      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.hidden = true;
      document.body.append(audioElement);
      peerConnection.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
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
      dataChannel.addEventListener("open", () => this.setStatus("connected"));

      // Step 4: classic WebRTC offer/answer, just sent over plain HTTPS
      // instead of a signaling server — OpenAI's endpoint *is* the signaling
      // server here.
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpResponse.ok) {
        throw new Error("OpenAI rejected the realtime connection.");
      }
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch (error) {
      this.disconnect();
      this.setStatus("error");
      this.options.onError?.(
        error instanceof Error ? error.message : "The realtime session could not connect.",
      );
    }
  }

  disconnect(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
    this.peerConnection?.getSenders().forEach((sender) => sender.track?.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.handledCallIds.clear();
    this.setStatus("idle");
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  /** Sends a tool's result back so the model can continue the conversation. */
  private sendToolOutput(callId: string, output: string) {
    this.sendEvent({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output },
    });
    // Ask the model to react (speak/continue) now that it has the result.
    this.sendEvent({ type: "response.create" });
  }

  private dispatchToolCall(call: RealtimeToolCall) {
    // The model can resend the same function-call-arguments event while
    // streaming; only act on each call_id once.
    if (this.handledCallIds.has(call.callId)) {
      return;
    }
    this.handledCallIds.add(call.callId);
    const output = this.options.onToolCall(call);
    this.sendToolOutput(call.callId, output);
  }

  private handleServerEvent(event: Record<string, unknown>) {
    // Realtime sends the same tool call info through a couple of different
    // event shapes depending on timing; normalize them here so the rest of
    // the client only deals with one RealtimeToolCall shape.
    const type = event.type as string | undefined;

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
