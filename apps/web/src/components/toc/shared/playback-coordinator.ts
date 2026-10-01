/** Synchronizes tool completion with structured renderer acknowledgements. */
export class PlaybackCoordinator {
  private tail: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private completed = new Map<string, number>();
  private pending = new Set<{ cancel: () => void; check: () => void }>();

  report(executionId: string, stepCount: number) {
    this.completed.set(executionId, stepCount);
    // Preview IDs are unique; bound the cache during long lessons.
    if (this.completed.size > 256) {
      const oldest = this.completed.keys().next().value;
      if (oldest !== undefined) this.completed.delete(oldest);
    }
    for (const waiter of this.pending) waiter.check();
  }

  wait(executionId: string, stepCount: number) {
    if ((this.completed.get(executionId) ?? -1) >= stepCount) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        this.pending.delete(waiter);
        if (error) reject(error);
        else resolve();
      };
      const waiter = {
        cancel: () => finish(new Error("Playback was cancelled.")),
        check: () => {
          if ((this.completed.get(executionId) ?? -1) >= stepCount) finish();
        },
      };
      const timer = setTimeout(() => finish(new Error("The visualization did not finish playback.")), Math.max(15_000, stepCount * 4_000));
      this.pending.add(waiter);
      waiter.check();
    });
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    const generation = this.generation;
    const result = this.tail.then(() => {
      if (generation !== this.generation) throw new Error("Playback was cancelled.");
      return operation();
    });
    this.tail = result.catch(() => {});
    return result;
  }

  cancel() {
    this.generation += 1;
    for (const waiter of this.pending) waiter.cancel();
    this.completed.clear();
    this.tail = Promise.resolve();
  }
}
