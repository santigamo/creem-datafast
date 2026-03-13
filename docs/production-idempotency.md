# Production Idempotency

By default `creem-datafast` uses an in-process `MemoryIdempotencyStore` that deduplicates webhook deliveries within a single server process. Treat that default as `dev / single-instance only`. For production, pass a durable atomic store so deduplication survives process restarts and blocks concurrent deliveries across multiple instances.

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

## Official Upstash Helper

Install the dependency:

```bash
pnpm add @upstash/redis
```

Create the Redis client and adapter:

```ts
import { Redis } from "@upstash/redis";
import { createUpstashIdempotencyStore } from "creem-datafast/idempotency/upstash";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export const redisIdempotencyStore = createUpstashIdempotencyStore(redis);
```

Pass it to `createCreemDataFast()`:

```ts
import { createCreemDataFast } from "creem-datafast";
import { Redis } from "@upstash/redis";
import { createUpstashIdempotencyStore } from "creem-datafast/idempotency/upstash";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  idempotencyStore: createUpstashIdempotencyStore(redis),
  // optional — defaults to 300 seconds
  idempotencyInFlightTtlSeconds: 300,
  // optional — defaults to 86400 seconds (24 h)
  idempotencyProcessedTtlSeconds: 86400
});
```

The helper uses the same atomic `claim` / `complete` / `release` contract as the core package:

- `claim()` writes `processing` with `NX`
- `complete()` replaces it with `processed`
- `release()` deletes the in-flight key after a failed attempt

## Custom Stores

If you prefer another provider, implement the same `IdempotencyStore` interface and pass it through `createCreemDataFast({ idempotencyStore })`.

If webhook processing fails before the DataFast forward completes, the package calls `release()` so a retry can claim the event again. After a successful forward, it calls `complete()` so later duplicates are ignored for the full processed TTL.
