import { createHmac, timingSafeEqual } from "node:crypto";

import { getHeaderValue } from "./headers.js";
import type { HeadersLike } from "./types.js";

function normalizeSignature(signature: string): string {
  return signature.trim().replace(/^sha256=/i, "");
}

export function extractHeader(
  headers: HeadersLike,
  name: string
): string | undefined {
  return getHeaderValue(headers, name);
}

export function verifyCreemSignature(
  rawBody: string,
  webhookSecret: string,
  signature: string
): boolean {
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const actual = Buffer.from(normalizeSignature(signature));
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
