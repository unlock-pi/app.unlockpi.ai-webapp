import { describe, expect, test } from "bun:test";
import { TeachingTimeline, type TeachingStep } from "./timeline-agent";

const steps: TeachingStep[] = [
  { id: "s0", action: { type: "create_state", stateId: "q0" }, narration: "Start at q0." },
  { id: "s1", action: { type: "set_initial_state", stateId: "q0" }, narration: "Mark q0 initial." },
];
function setup() {
  const prepared: string[] = [];
  const cancelled: string[] = [];
  const engine = new TeachingTimeline({
    prepare: (_, token) => { prepared.push(token); },
    cancel: (token) => { cancelled.push(token); },
  }, () => {});
  engine.load(steps);
  engine.resume();
  return { engine, prepared, cancelled };
}

describe("semantic teaching timeline", () => {
  test("starts visuals at actual narration start, not at request creation", () => {
    const { engine, prepared } = setup();
    expect(engine.snapshot().mode).toBe("preparing");
    expect(engine.snapshot().animation).toBe("idle");
    engine.narrationStarted(prepared[0]);
    expect(engine.snapshot().animation).toBe("running");
    expect(engine.snapshot().narration).toBe("speaking");
  });
  test("waits for narration after animation finishes", () => {
    const { engine, prepared } = setup();
    engine.narrationStarted(prepared[0]);
    engine.animationCompleted(prepared[0]);
    expect(engine.snapshot().currentStep).toBe(0);
    expect(prepared).toHaveLength(1);
    engine.narrationCompleted(prepared[0]);
    expect(engine.snapshot().currentStep).toBe(1);
    expect(prepared).toHaveLength(2);
  });
  test("also waits for animation when narration ends first", () => {
    const { engine, prepared } = setup();
    engine.narrationStarted(prepared[0]);
    engine.narrationCompleted(prepared[0]);
    expect(prepared).toHaveLength(1);
    engine.animationCompleted(prepared[0]);
    expect(prepared).toHaveLength(2);
  });
  test("pause cancels the unfinished step; resume uses a new token and ignores late events", () => {
    const { engine, prepared, cancelled } = setup();
    const old = prepared[0];
    engine.narrationStarted(old);
    engine.pause();
    expect(cancelled).toEqual([old]);
    expect(engine.snapshot().currentStep).toBe(0);
    engine.resume();
    expect(prepared[1] === old).toBe(false);
    engine.animationCompleted(old);
    engine.narrationCompleted(old);
    expect(engine.snapshot().mode).toBe("preparing");
    expect(engine.snapshot().currentStep).toBe(0);
  });
  test("supports one-step playback, undo, reset and completion", () => {
    const { engine, prepared } = setup();
    engine.pause();
    engine.resume(false);
    const token = prepared.at(-1)!;
    engine.narrationStarted(token);
    engine.animationCompleted(token);
    engine.narrationCompleted(token);
    expect(engine.snapshot().currentStep).toBe(1);
    expect(engine.snapshot().mode).toBe("paused");
    engine.undo();
    expect(engine.snapshot().currentStep).toBe(0);
    engine.reset();
    expect(engine.snapshot().steps).toEqual(steps);
    engine.resume();
    for (let index = 0; index < steps.length; index++) {
      const current = prepared.at(-1)!;
      engine.narrationStarted(current);
      engine.narrationCompleted(current);
      engine.animationCompleted(current);
    }
    expect(engine.snapshot().mode).toBe("complete");
  });
  test("reports narration errors without advancing the graph", () => {
    const { engine, prepared } = setup();
    engine.fail(prepared[0], "Disconnected");
    expect(engine.snapshot().mode).toBe("error");
    expect(engine.snapshot().currentStep).toBe(0);
  });
});

test("reset and undo preserve a prepared graph prefix", () => {
  const engine = new TeachingTimeline({ prepare: () => {}, cancel: () => {} }, () => {});
  engine.load(steps, 1);
  engine.undo();
  expect(engine.snapshot().currentStep).toBe(1);
  engine.resume(false);
  const token = engine.snapshot().token!;
  engine.narrationStarted(token);
  engine.animationCompleted(token);
  engine.narrationCompleted(token);
  expect(engine.snapshot().currentStep).toBe(2);
  engine.reset();
  expect(engine.snapshot().currentStep).toBe(1);
});
