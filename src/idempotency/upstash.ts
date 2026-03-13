import type { Redis } from "@upstash/redis";

import type { IdempotencyStore } from "../core/types.js";

type UpstashRedisLike = Pick<Redis, "del" | "set">;

/**
 * Production-ready idempotency store backed by Upstash Redis atomic commands.
 *
 * Install `@upstash/redis` in the consuming app and pass an initialized client.
 */
export function createUpstashIdempotencyStore(redis: UpstashRedisLike): IdempotencyStore {
  return {
    async claim(key, ttlSeconds = 300) {
      const result = await redis.set(key, "processing", {
        ex: ttlSeconds,
        nx: true
      });
      return result === "OK";
    },
    async complete(key, ttlSeconds = 86400) {
      await redis.set(key, "processed", {
        ex: ttlSeconds
      });
    },
    async release(key) {
      await redis.del(key);
    }
  };
}
