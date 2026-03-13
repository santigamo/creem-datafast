import { InvalidCreemSignatureError } from "../../src/core/errors.js";
import { createNextWebhookHandler, handleWebhookRequest } from "../../src/adapters/next.js";
import type { HandleWebhookResult } from "../../src/core/types.js";

describe("createNextWebhookHandler", () => {
  it("returns 200 on success", async () => {
    const handler = createNextWebhookHandler({
      createCheckout: vi.fn(),
      handleWebhook: vi.fn(
        async (): Promise<HandleWebhookResult> => ({
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
        })
      ),
      verifyWebhookSignature: vi.fn(async () => true)
    });

    const response = await handler(
      new Request("https://example.com", {
        body: "{}",
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
  });

  it("returns 400 on invalid signature", async () => {
    const handler = createNextWebhookHandler({
      createCheckout: vi.fn(),
      handleWebhook: vi.fn(async () => {
        throw new InvalidCreemSignatureError("bad");
      }),
      verifyWebhookSignature: vi.fn(async () => true)
    });

    const response = await handler(
      new Request("https://example.com", {
        body: "{}",
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
  });
});

describe("handleWebhookRequest", () => {
  it("reads the raw body and forwards headers to client.handleWebhook", async () => {
    const result: HandleWebhookResult = {
      datafastResponse: { ok: true },
      deduplicated: false,
      eventId: "evt_123",
      eventType: "checkout.completed",
      ignored: false,
      ok: true,
      payload: {
        amount: 10,
        currency: "EUR",
        transaction_id: "txn_123"
      }
    };
    const handleWebhook = vi.fn(async () => result);
    const request = new Request("https://example.com", {
      body: '{"ok":true}',
      headers: {
        "creem-signature": "sig_123",
        "content-type": "application/json"
      },
      method: "POST"
    });

    const response = await handleWebhookRequest(
      {
        createCheckout: vi.fn(),
        handleWebhook,
        verifyWebhookSignature: vi.fn(async () => true)
      },
      request
    );

    expect(response).toBe(result);
    expect(handleWebhook).toHaveBeenCalledWith({
      headers: request.headers,
      rawBody: '{"ok":true}'
    });
  });

  it("propagates client.handleWebhook errors", async () => {
    const error = new Error("DataFast failed");

    await expect(
      handleWebhookRequest(
        {
          createCheckout: vi.fn(),
          handleWebhook: vi.fn(async () => {
            throw error;
          }),
          verifyWebhookSignature: vi.fn(async () => true)
        },
        new Request("https://example.com", {
          body: "{}",
          method: "POST"
        })
      )
    ).rejects.toThrow(error);
  });
});
