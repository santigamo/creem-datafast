import { CreemDataFastError } from "./errors.js";
import { getHeaderValue } from "./headers.js";
import type { HeadersLike } from "./types.js";

const textEncoder = new TextEncoder();

function normalizeSignature(signature: string): string {
  return signature.trim().replace(/^sha256=/i, "");
}

function hexToUint8Array(input: string): Uint8Array | undefined {
  if (input.length === 0 || input.length % 2 !== 0 || /[^0-9a-f]/iu.test(input)) {
    return undefined;
  }

  const bytes = new Uint8Array(input.length / 2);

  for (let index = 0; index < input.length; index += 2) {
    const byte = Number.parseInt(input.slice(index, index + 2), 16);
    if (Number.isNaN(byte)) {
      return undefined;
    }

    bytes[index / 2] = byte;
  }

  return bytes;
}

function getWebCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new CreemDataFastError("Web Crypto API is required to verify Creem signatures.");
  }

  return subtle;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  return Uint8Array.from(bytes).buffer;
}

export function extractHeader(
  headers: HeadersLike,
  name: string
): string | undefined {
  return getHeaderValue(headers, name);
}

export async function verifyCreemSignature(
  rawBody: string,
  webhookSecret: string,
  signature: string
): Promise<boolean> {
  const signatureBytes = hexToUint8Array(normalizeSignature(signature).toLowerCase());
  if (!signatureBytes) {
    return false;
  }

  const subtle = getWebCrypto();
  const key = await subtle.importKey(
    "raw",
    textEncoder.encode(webhookSecret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  return subtle.verify(
    "HMAC",
    key,
    toArrayBuffer(signatureBytes),
    toArrayBuffer(textEncoder.encode(rawBody))
  );
}
