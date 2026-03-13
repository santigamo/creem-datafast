# Production Idempotency

By default no idempotency store is configured, so duplicate webhook deliveries are forwarded to DataFast every time. For production, pass a durable store so deduplication survives process restarts and works across multiple instances.

## Interface

This is the interface that `creem-datafast` expects:

```ts
interface IdempotencyStore {
  has(key: string): Promise<boolean>;
  set(key: string, ttlSeconds?: number): Promise<void>;
}
```

## Recommended TTL

Use `86400` seconds (24 hours) unless you know Creem can retry longer in your setup.

- It covers the normal webhook retry window.
- The keys are lightweight, so keeping them for a full day is cheap.
- Shorter TTLs increase the chance that a late retry gets forwarded twice.

## Why The Store Must Be Durable

An in-memory `Map` only works inside one process. It resets on deploy, crashes, or autoscaling events, so the same webhook can be forwarded again.

Use a durable shared store such as Redis so:

- dedupe survives restarts and deploys
- dedupe works across multiple server instances
- late webhook retries still hit the same seen-event set

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
  async has(key) {
    return (await redis.exists(key)) === 1;
  },
  async set(key, ttlSeconds = 86400) {
    await redis.set(key, "1", { ex: ttlSeconds });
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
  // optional — defaults to 86400 (24 h)
  idempotencyTtlSeconds: 86400
});
```

This is enough to get persistent webhook dedupe without designing your own storage contract.
