import type { HeadersLike } from "./types.js";

function isHeadersInstance(headers: HeadersLike): headers is Headers {
  return typeof Headers !== "undefined" && headers instanceof Headers;
}

function normalizeArrayValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}

export function getHeaderValue(headers: HeadersLike, name: string): string | undefined {
  if (isHeadersInstance(headers)) {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
  }

  const expected = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === expected) {
      return normalizeArrayValue(value);
    }
  }

  return undefined;
}
