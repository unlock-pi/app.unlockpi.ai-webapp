import { describe, expect, test } from "bun:test";
import { PlaybackCoordinator } from "./playback-coordinator-agent";

describe("RE animation synchronization", () => {
  test("does not advance until the entire requested trace arrives", async () => {
    const playback = new PlaybackCoordinator();
    let completed = false;
    const waiting = playback.wait("run", 2).then(() => { completed = true; });
    playback.report("other-run", 2);
    playback.report("run", 1);
    await Promise.resolve();
    expect(completed).toBe(false);
    playback.report("run", 2);
    await waiting;
    expect(completed).toBe(true);
  });

  test("serializes rapid visual calls instead of replacing a traveling flow", async () => {
    const playback = new PlaybackCoordinator();
    const order: number[] = [];
    const first = playback.run(async () => {
      order.push(1);
      await playback.wait("first", 1);
      order.push(2);
    });
    const second = playback.run(async () => { order.push(3); });
    await Promise.resolve();
    expect(order).toEqual([1]);
    playback.report("first", 1);
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2, 3]);
  });

  test("reset cancels unfinished and queued work, but permits a new run", async () => {
    const playback = new PlaybackCoordinator();
    const first = playback.run(() => playback.wait("old", 1));
    let staleRan = false;
    const stale = playback.run(async () => { staleRan = true; });
    const firstError = first.catch((error: Error) => error.message);
    const staleError = stale.catch((error: Error) => error.message);
    await Promise.resolve();
    playback.cancel();
    expect(await firstError).toBe("Playback was cancelled.");
    expect(await staleError).toBe("Playback was cancelled.");
    expect(staleRan).toBe(false);
    expect(await playback.run(async () => "new")).toBe("new");
  });

  test("handles an acknowledgement received before the waiter registers", async () => {
    const playback = new PlaybackCoordinator();
    playback.report("run", 1);
    await playback.wait("run", 1);
  });
});
