import { createHmac } from "node:crypto";

import { createCreemDataFast } from "../../src/index.js";
import { extractHeader, verifyCreemSignature } from "../../src/core/signature.js";

const secret = "creem_secret";
const rawBody = '{"ok":true}';

function sign(body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("signature", () => {
  const client = createCreemDataFast({
    creemClient: {
      checkouts: {
        create: vi.fn()
      },
      transactions: {
        getById: vi.fn()
      }
    },
    creemWebhookSecret: secret,
    datafastApiKey: "datafast_key",
    fetch: vi.fn() as typeof fetch
  });

  it("validates a correct signature", async () => {
    await expect(verifyCreemSignature(rawBody, secret, sign(rawBody))).resolves.toBe(true);
  });

  it("rejects an invalid signature", async () => {
    await expect(verifyCreemSignature(rawBody, secret, "bad-signature")).resolves.toBe(false);
  });

  it("rejects malformed hex signatures without throwing", async () => {
    await expect(verifyCreemSignature(rawBody, secret, "abc")).resolves.toBe(false);
    await expect(verifyCreemSignature(rawBody, secret, "zz")).resolves.toBe(false);
  });

  it("reads headers case-insensitively", () => {
    expect(extractHeader({ "Creem-Signature": sign(rawBody) }, "creem-signature")).toBe(
      sign(rawBody)
    );
  });

  it("surfaces missing signature through the higher-level API", async () => {
    await expect(client.verifyWebhookSignature(rawBody, {})).rejects.toThrow(
      "Missing creem-signature header."
    );
  });

  it("throws a clear error when Web Crypto is unavailable", async () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined
    });

    try {
      await expect(verifyCreemSignature(rawBody, secret, sign(rawBody))).rejects.toThrow(
        "Web Crypto API is required to verify Creem signatures."
      );
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto
      });
    }
  });
});
