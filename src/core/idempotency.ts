import type { IdempotencyStore } from "./types.js";

type EntryStatus = "processing" | "processed";

type Entry = {
  expiresAt: number;
  status: EntryStatus;
};

class NoopIdempotencyStore implements IdempotencyStore {
  async claim(): Promise<boolean> {
    return true;
  }

  async complete(): Promise<void> {
    return;
  }

  async release(): Promise<void> {
    return;
  }
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly values = new Map<string, Entry>();

  private getActiveEntry(key: string): Entry | undefined {
    const entry = this.values.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.values.delete(key);
      return undefined;
    }

    return entry;
  }

  async claim(key: string, ttlSeconds = 300): Promise<boolean> {
    if (this.getActiveEntry(key)) {
      return false;
    }

    this.values.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      status: "processing"
    });
    return true;
  }

  async complete(key: string, ttlSeconds = 86400): Promise<void> {
    this.values.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      status: "processed"
    });
  }

  async release(key: string): Promise<void> {
    this.values.delete(key);
  }
}

export function resolveIdempotencyStore(store?: IdempotencyStore): IdempotencyStore {
  return store ?? new NoopIdempotencyStore();
}

export function getIdempotencyKey(eventId: string): string {
  return `creem:event:${eventId}`;
}

export async function claimEvent(
  eventId: string,
  store: IdempotencyStore,
  ttlSeconds: number
): Promise<boolean> {
  return store.claim(getIdempotencyKey(eventId), ttlSeconds);
}

export async function completeEvent(
  eventId: string,
  store: IdempotencyStore,
  ttlSeconds: number
): Promise<void> {
  await store.complete(getIdempotencyKey(eventId), ttlSeconds);
}

export async function releaseEvent(
  eventId: string,
  store: IdempotencyStore
): Promise<void> {
  await store.release(getIdempotencyKey(eventId));
}
