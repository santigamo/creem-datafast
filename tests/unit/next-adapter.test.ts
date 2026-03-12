import { InvalidCreemSignatureError } from "../../src/core/errors.js";
import { createNextWebhookHandler } from "../../src/adapters/next.js";
import type { HandleWebhookResult } from "../../src/core/types.js";

describe("createNextWebhookHandler", () => {
  it("returns 200 on success", async () => {
    const handler = createNextWebhookHandler({
      createCheckout: vi.fn(),
      handleWebhook: vi.fn(async (): Promise<HandleWebhookResult> => ({
        datafastResponse: { ok: true },
        deduplicated: false,
        eventId: "evt_123",
        eventType: "checkout.completed" as const,
        ignored: false as const,
        ok: true,
        payload: {
          amount: 10,
          currency: "EUR",
          transaction_id: "txn_123"
        }
      })),
      verifyWebhookSignature: vi.fn()
    });

    const response = await handler(new Request("https://example.com", {
      body: "{}",
      method: "POST"
    }));

    expect(response.status).toBe(200);
  });

  it("returns 400 on invalid signature", async () => {
    const handler = createNextWebhookHandler({
      createCheckout: vi.fn(),
      handleWebhook: vi.fn(async () => {
        throw new InvalidCreemSignatureError("bad");
      }),
      verifyWebhookSignature: vi.fn()
    });

    const response = await handler(new Request("https://example.com", {
      body: "{}",
      method: "POST"
    }));

    expect(response.status).toBe(400);
  });
});
