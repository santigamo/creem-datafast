import type { IdempotencyStore } from "./types.js";

class NoopIdempotencyStore implements IdempotencyStore {
  async has(): Promise<boolean> {
    return false;
  }

  async set(): Promise<void> {
    return;
  }
}

class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly values = new Map<string, number>();

  async has(key: string): Promise<boolean> {
    const expiresAt = this.values.get(key);
    if (expiresAt === undefined) {
      return false;
    }

    if (Date.now() > expiresAt) {
      this.values.delete(key);
      return false;
    }

    return true;
  }

  async set(key: string, ttlSeconds = 86400): Promise<void> {
    this.values.set(key, Date.now() + ttlSeconds * 1000);
  }
}

export function resolveIdempotencyStore(store?: IdempotencyStore): IdempotencyStore {
  return store ?? new NoopIdempotencyStore();
}

export function getIdempotencyKey(eventId: string): string {
  return `creem:event:${eventId}`;
}

export async function shouldProcessEvent(
  eventId: string,
  store: IdempotencyStore
): Promise<boolean> {
  return !(await store.has(getIdempotencyKey(eventId)));
}

export async function markEventProcessed(
  eventId: string,
  store: IdempotencyStore,
  ttlSeconds: number
): Promise<void> {
  await store.set(getIdempotencyKey(eventId), ttlSeconds);
}
