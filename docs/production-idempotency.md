# Production Idempotency

By default no idempotency store is configured, so duplicate webhook deliveries are forwarded to DataFast every time. For production, pass a durable atomic store so deduplication survives process restarts and blocks concurrent deliveries across multiple instances.

## Interface

This is the interface that `creem-datafast` expects:

```ts
interface IdempotencyStore {
  claim(key: string, ttlSeconds?: number): Promise<boolean>;
  complete(key: string, ttlSeconds?: number): Promise<void>;
  release(key: string): Promise<void>;
}
```

`claim()` must be atomic. Two simultaneous deliveries of the same event must not both return `true`.

## Recommended TTLs

Use:

- `idempotencyInFlightTtlSeconds: 300`
- `idempotencyProcessedTtlSeconds: 86400`

The short in-flight TTL prevents a stuck worker from blocking retries forever. The longer processed TTL covers normal webhook retry windows after a successful forward.

## Why The Store Must Be Durable And Atomic

An in-memory `Map` only works inside one process. It resets on deploy, crashes, or autoscaling events, so the same webhook can be forwarded again.

A non-atomic `has()` / `set()` sequence is also unsafe: two workers can both observe "missing", both forward to DataFast, and only then persist the key.

Use a durable shared store such as Redis so:

- dedupe survives restarts and deploys
- dedupe works across multiple server instances
- concurrent deliveries cannot both claim the same event
- late webhook retries still hit the same processed-event set

`creem-datafast` stores keys as `creem:event:{eventId}`.

## Redis / Upstash Recipe

Install the dependency:

```bash
pnpm add @upstash/redis
```

Create a store implementation:

```ts
import { Redis } from "@upstash/redis";
import type { IdempotencyStore } from "creem-datafast";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export const redisIdempotencyStore: IdempotencyStore = {
  async claim(key, ttlSeconds = 300) {
    const result = await redis.set(key, "processing", {
      ex: ttlSeconds,
      nx: true
    });
    return result === "OK";
  },
  async complete(key, ttlSeconds = 86400) {
    await redis.set(key, "processed", { ex: ttlSeconds });
  },
  async release(key) {
    await redis.del(key);
  }
};
```

Pass it to `createCreemDataFast()`:

```ts
import { createCreemDataFast } from "creem-datafast";
import { redisIdempotencyStore } from "./redis-idempotency-store";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  idempotencyStore: redisIdempotencyStore,
  // optional — defaults to 300 seconds
  idempotencyInFlightTtlSeconds: 300,
  // optional — defaults to 86400 seconds (24 h)
  idempotencyProcessedTtlSeconds: 86400
});
```

If webhook processing fails before the DataFast forward completes, the package calls `release()` so a retry can claim the event again. After a successful forward, it calls `complete()` so later duplicates are ignored for the full processed TTL.
