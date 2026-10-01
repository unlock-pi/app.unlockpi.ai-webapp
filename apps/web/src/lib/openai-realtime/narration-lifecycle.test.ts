import { describe, expect, test } from "bun:test";
import { OpenAIRealtimeClient } from "./realtime-client";

type Harness = {
  dataChannel: { readyState: string };
  sendEvent: (event: Record<string, unknown>) => void;
  handleServerEvent: (event: Record<string, unknown>) => void;
};

describe("Realtime teaching narration lifecycle", () => {
  test("response generation completion does not mean voice playback completion", () => {
    const events: Record<string, unknown>[] = [];
    const callbacks: string[] = [];
    const client = new OpenAIRealtimeClient({ tokenEndpoint: "/test", onToolCall: () => "ok" });
    const harness = client as unknown as Harness;
    harness.dataChannel = { readyState: "open" };
    harness.sendEvent = (event) => { events.push(event); };
    client.prepareNarration("step-1", "Create q0", {
      start: () => { callbacks.push("start"); }, complete: () => { callbacks.push("complete"); }, fail: (message) => { callbacks.push(message); },
    });
    expect(events[0].type).toBe("response.create");
    const response = { id: "r1", metadata: { teaching_token: "step-1" }, status: "completed", output: [{ content: [{ type: "audio" }] }] };
    harness.handleServerEvent({ type: "response.created", response });
    harness.handleServerEvent({ type: "output_audio_buffer.started", response_id: "r1" });
    harness.handleServerEvent({ type: "response.done", response });
    expect(callbacks).toEqual(["start"]);
    harness.handleServerEvent({ type: "output_audio_buffer.stopped", response_id: "unrelated" });
    expect(callbacks).toEqual(["start"]);
    harness.handleServerEvent({ type: "output_audio_buffer.stopped", response_id: "r1" });
    expect(callbacks).toEqual(["start", "complete"]);
  });
  test("cancellation never reports successful narration completion", () => {
    const callbacks: string[] = [];
    const events: Record<string, unknown>[] = [];
    const client = new OpenAIRealtimeClient({ tokenEndpoint: "/test", onToolCall: () => "ok" });
    const harness = client as unknown as Harness;
    harness.dataChannel = { readyState: "open" };
    harness.sendEvent = (event) => { events.push(event); };
    client.prepareNarration("step", "Create q0", { start: () => {}, complete: () => { callbacks.push("complete"); }, fail: () => { callbacks.push("fail"); } });
    harness.handleServerEvent({ type: "response.created", response: { id: "r", metadata: { teaching_token: "step" } } });
    client.cancelNarration("step");
    harness.handleServerEvent({ type: "output_audio_buffer.cleared", response_id: "r" });
    expect(callbacks).toEqual([]);
    expect(events.some((event) => event.type === "response.cancel")).toBe(true);
  });
});

test("narration waits for ordinary response audio to drain", () => {
  const events: Record<string, unknown>[] = [];
  const client = new OpenAIRealtimeClient({ tokenEndpoint: "/test", onToolCall: () => "ok" });
  const harness = client as unknown as Harness;
  harness.dataChannel = { readyState: "open" };
  harness.sendEvent = (event) => { events.push(event); };
  harness.handleServerEvent({ type: "response.created", response: { id: "intro" } });
  client.prepareNarration("step", "Create q0", { start: () => {}, complete: () => {}, fail: () => {} });
  expect(events).toHaveLength(0);
  harness.handleServerEvent({ type: "response.done", response: { id: "intro", output: [{ content: [{ type: "audio" }] }] } });
  expect(events).toHaveLength(0);
  harness.handleServerEvent({ type: "output_audio_buffer.stopped", response_id: "intro" });
  expect(events[0].type).toBe("response.create");
});
