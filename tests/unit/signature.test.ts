import { createHmac } from "node:crypto";

import { InvalidCreemSignatureError } from "../../src/core/errors.js";
import { extractHeader, verifyCreemSignature } from "../../src/core/signature.js";

const secret = "creem_secret";
const rawBody = "{\"ok\":true}";

function sign(body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("signature", () => {
  it("validates a correct signature", () => {
    expect(verifyCreemSignature(rawBody, secret, sign(rawBody))).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifyCreemSignature(rawBody, secret, "bad-signature")).toBe(false);
  });

  it("reads headers case-insensitively", () => {
    expect(extractHeader({ "Creem-Signature": sign(rawBody) }, "creem-signature")).toBe(sign(rawBody));
  });

  it("surfaces missing signature through the higher-level API", () => {
    const signature = extractHeader({}, "creem-signature");
    expect(signature).toBeUndefined();
    expect(() => {
      if (!signature) {
        throw new InvalidCreemSignatureError("Missing creem-signature header.");
      }
    }).toThrow(InvalidCreemSignatureError);
  });
});
