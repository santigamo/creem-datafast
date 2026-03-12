import { InvalidCreemSignatureError } from "../../src/core/errors.js";
import { createExpressWebhookHandler } from "../../src/adapters/express.js";
import type { HandleWebhookResult } from "../../src/core/types.js";

describe("createExpressWebhookHandler", () => {
  it("returns 200 on success", async () => {
    const send = vi.fn();
    const res = {
      send,
      status: vi.fn(function status() {
        return res;
      })
    };

    await createExpressWebhookHandler({
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
    })({
      body: Buffer.from("{}"),
      headers: {}
    }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith("OK");
  });

  it("returns 400 on invalid signature", async () => {
    const send = vi.fn();
    const res = {
      send,
      status: vi.fn(function status() {
        return res;
      })
    };

    await createExpressWebhookHandler({
      createCheckout: vi.fn(),
      handleWebhook: vi.fn(async () => {
        throw new InvalidCreemSignatureError("bad");
      }),
      verifyWebhookSignature: vi.fn()
    })({
      body: "{}",
      headers: {}
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Invalid signature");
  });
});
