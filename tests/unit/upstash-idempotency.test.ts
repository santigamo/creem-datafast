import { describe, expect, it, vi } from "vitest";

import { createUpstashIdempotencyStore } from "../../src/idempotency/upstash.js";

describe("createUpstashIdempotencyStore", () => {
  it("claims an event when Upstash returns OK", async () => {
    const redis = {
      del: vi.fn(),
      set: vi.fn().mockResolvedValue("OK")
    };

    const store = createUpstashIdempotencyStore(redis);

    await expect(store.claim("creem:event:evt_123")).resolves.toBe(true);
    expect(redis.set).toHaveBeenCalledWith("creem:event:evt_123", "processing", {
      ex: 300,
      nx: true
    });
  });

  it("rejects a claim when the key already exists", async () => {
    const redis = {
      del: vi.fn(),
      set: vi.fn().mockResolvedValue(null)
    };

    const store = createUpstashIdempotencyStore(redis);

    await expect(store.claim("creem:event:evt_123", 60)).resolves.toBe(false);
    expect(redis.set).toHaveBeenCalledWith("creem:event:evt_123", "processing", {
      ex: 60,
      nx: true
    });
  });

  it("marks events as processed with the default ttl", async () => {
    const redis = {
      del: vi.fn(),
      set: vi.fn().mockResolvedValue("OK")
    };

    const store = createUpstashIdempotencyStore(redis);

    await store.complete("creem:event:evt_123");
    expect(redis.set).toHaveBeenCalledWith("creem:event:evt_123", "processed", {
      ex: 86400
    });
  });

  it("releases events by deleting the key", async () => {
    const redis = {
      del: vi.fn().mockResolvedValue(1),
      set: vi.fn()
    };

    const store = createUpstashIdempotencyStore(redis);

    await store.release("creem:event:evt_123");
    expect(redis.del).toHaveBeenCalledWith("creem:event:evt_123");
  });
});
