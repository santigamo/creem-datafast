import { createHmac } from "node:crypto";

import checkoutCompletedFixture from "../fixtures/checkout-completed.json";
import subscriptionPaidFixture from "../fixtures/subscription-paid.json";
import transactionFixture from "../fixtures/transaction.json";

import { InvalidCreemSignatureError } from "../../src/core/errors.js";
import { MemoryIdempotencyStore } from "../../src/core/idempotency.js";
import { noopLogger } from "../../src/core/logger.js";
import { handleWebhook } from "../../src/core/webhook.js";

const webhookSecret = "creem_webhook_secret";

function sign(rawBody: string): string {
  return createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
}

function createParams(payload: unknown) {
  const rawBody = JSON.stringify(payload);
  return {
    headers: {
      "creem-signature": sign(rawBody)
    },
    rawBody
  };
}

describe("handleWebhook", () => {
  it("ignores unsupported events", async () => {
    const result = await handleWebhook(createParams({
      eventType: "customer.created",
      id: "evt_unsupported"
    }), {
      creem: {
        createCheckout: vi.fn(),
        getTransactionById: vi.fn()
      },
      creemWebhookSecret: webhookSecret,
      datafast: {
        sendPayment: vi.fn()
      },
      hydrateTransactionOnSubscriptionPaid: true,
      idempotencyStore: new MemoryIdempotencyStore(),
      idempotencyTtlSeconds: 3600,
      logger: noopLogger
    });

    expect(result).toEqual({
      eventId: "evt_unsupported",
      eventType: "customer.created",
      ignored: true,
      ok: true,
      reason: "unsupported_event"
    });
  });

  it("ignores duplicate events", async () => {
    const store = new MemoryIdempotencyStore();
    await store.set("creem:event:evt_duplicate", 3600);

    const result = await handleWebhook(createParams({
      ...checkoutCompletedFixture,
      id: "evt_duplicate"
    }), {
      creem: {
        createCheckout: vi.fn(),
        getTransactionById: vi.fn()
      },
      creemWebhookSecret: webhookSecret,
      datafast: {
        sendPayment: vi.fn()
      },
      hydrateTransactionOnSubscriptionPaid: true,
      idempotencyStore: store,
      idempotencyTtlSeconds: 3600,
      logger: noopLogger
    });

    expect(result).toEqual({
      eventId: "evt_duplicate",
      eventType: "checkout.completed",
      ignored: true,
      ok: true,
      reason: "duplicate_event"
    });
  });

  it("fails on invalid signatures", async () => {
    await expect(handleWebhook({
      headers: {
        "creem-signature": "bad"
      },
      rawBody: JSON.stringify(checkoutCompletedFixture)
    }, {
      creem: {
        createCheckout: vi.fn(),
        getTransactionById: vi.fn()
      },
      creemWebhookSecret: webhookSecret,
      datafast: {
        sendPayment: vi.fn()
      },
      hydrateTransactionOnSubscriptionPaid: true,
      idempotencyStore: new MemoryIdempotencyStore(),
      idempotencyTtlSeconds: 3600,
      logger: noopLogger
    })).rejects.toThrow(InvalidCreemSignatureError);
  });

  it("propagates DataFast failures", async () => {
    await expect(handleWebhook(createParams(checkoutCompletedFixture), {
      creem: {
        createCheckout: vi.fn(),
        getTransactionById: vi.fn()
      },
      creemWebhookSecret: webhookSecret,
      datafast: {
        sendPayment: vi.fn(async () => {
          throw new Error("DataFast failed");
        })
      },
      hydrateTransactionOnSubscriptionPaid: true,
      idempotencyStore: new MemoryIdempotencyStore(),
      idempotencyTtlSeconds: 3600,
      logger: noopLogger
    })).rejects.toThrow("DataFast failed");
  });

  it("marks events as processed after a successful send", async () => {
    const store = new MemoryIdempotencyStore();

    const result = await handleWebhook(createParams(checkoutCompletedFixture), {
      creem: {
        createCheckout: vi.fn(),
        getTransactionById: vi.fn()
      },
      creemWebhookSecret: webhookSecret,
      datafast: {
        sendPayment: vi.fn(async () => ({ ok: true }))
      },
      hydrateTransactionOnSubscriptionPaid: true,
      idempotencyStore: store,
      idempotencyTtlSeconds: 3600,
      logger: noopLogger
    });

    expect(result.ignored).toBe(false);
    expect(await store.has("creem:event:evt_checkout_completed_123")).toBe(true);
  });

  it("hydrates subscription.paid transactions when available", async () => {
    const result = await handleWebhook(createParams(subscriptionPaidFixture), {
      creem: {
        createCheckout: vi.fn(),
        getTransactionById: vi.fn(async () => transactionFixture)
      },
      creemWebhookSecret: webhookSecret,
      datafast: {
        sendPayment: vi.fn(async (payload) => payload)
      },
      hydrateTransactionOnSubscriptionPaid: true,
      idempotencyStore: new MemoryIdempotencyStore(),
      idempotencyTtlSeconds: 3600,
      logger: noopLogger
    });

    if (result.ignored) {
      throw new Error("Expected subscription.paid to be processed.");
    }

    expect(result.payload).toEqual({
      amount: 10.99,
      currency: "EUR",
      customer_id: "cus_sub_123",
      datafast_visitor_id: "visitor_sub_123",
      email: "subscription@example.com",
      name: "Subscription Customer",
      renewal: true,
      timestamp: "2026-03-12T10:00:00.000Z",
      transaction_id: "txn_sub_123"
    });
  });
});
