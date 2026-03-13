import { afterEach, describe, expect, it, vi } from "vitest";

import { MemoryIdempotencyStore } from "../../src/core/idempotency.js";

describe("MemoryIdempotencyStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a second claim while the event is in flight", async () => {
    const store = new MemoryIdempotencyStore();

    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(true);
    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(false);
  });

  it("rejects claims after the event is completed", async () => {
    const store = new MemoryIdempotencyStore();

    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(true);
    await store.complete("creem:event:evt_123", 3600);

    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(false);
  });

  it("allows a new claim after release", async () => {
    const store = new MemoryIdempotencyStore();

    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(true);
    await store.release("creem:event:evt_123");

    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(true);
  });

  it("allows reclaiming after the in-flight ttl expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T10:00:00.000Z"));

    const store = new MemoryIdempotencyStore();

    await expect(store.claim("creem:event:evt_123", 1)).resolves.toBe(true);
    await expect(store.claim("creem:event:evt_123", 1)).resolves.toBe(false);

    vi.advanceTimersByTime(1_001);

    await expect(store.claim("creem:event:evt_123", 1)).resolves.toBe(true);
  });
});
