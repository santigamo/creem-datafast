import { createHmac } from "node:crypto";

import checkoutCompletedFixture from "../fixtures/checkout-completed.json";
import refundCreatedFixture from "../fixtures/refund-created.json";
import subscriptionPaidFixture from "../fixtures/subscription-paid.json";
import transactionFixture from "../fixtures/transaction.json";

import { InvalidCreemSignatureError } from "../../src/core/errors.js";
import { noopLogger } from "../../src/core/logger.js";
import { handleWebhook } from "../../src/core/webhook.js";
import type { IdempotencyStore } from "../../src/core/types.js";

const webhookSecret = "creem_webhook_secret";

class TestMemoryIdempotencyStore implements IdempotencyStore {
  private readonly values = new Map<string, number>();

  async has(key: string): Promise<boolean> {
    const expiresAt = this.values.get(key);
    if (expiresAt === undefined) {
      return false;
    }

    if (Date.now() > expiresAt) {
      this.values.delete(key);
      return false;
    }

    return true;
  }

  async set(key: string, ttlSeconds = 86400): Promise<void> {
    this.values.set(key, Date.now() + ttlSeconds * 1000);
  }
}

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

function createDependencies(overrides?: {
  datafast?: {
    sendPayment?: ReturnType<typeof vi.fn>;
  };
  creem?: {
    getTransactionById?: ReturnType<typeof vi.fn>;
  };
  idempotencyStore?: IdempotencyStore;
}) {
  return {
    creem: {
      createCheckout: vi.fn(),
      getTransactionById: overrides?.creem?.getTransactionById ?? vi.fn()
    },
    creemWebhookSecret: webhookSecret,
    datafast: {
      sendPayment: overrides?.datafast?.sendPayment ?? vi.fn()
    },
    hydrateTransactionOnSubscriptionPaid: true,
    idempotencyStore: overrides?.idempotencyStore ?? new TestMemoryIdempotencyStore(),
    idempotencyTtlSeconds: 3600,
    logger: noopLogger
  };
}

describe("handleWebhook", () => {
  it("ignores unsupported events", async () => {
    const result = await handleWebhook(createParams({
      eventType: "customer.created",
      id: "evt_unsupported"
    }), createDependencies());

    expect(result).toEqual({
      eventId: "evt_unsupported",
      eventType: "customer.created",
      ignored: true,
      ok: true,
      reason: "unsupported_event"
    });
  });

  it("ignores duplicate events", async () => {
    const store = new TestMemoryIdempotencyStore();
    await store.set("creem:event:evt_duplicate", 3600);

    const result = await handleWebhook(createParams({
      ...checkoutCompletedFixture,
      id: "evt_duplicate"
    }), createDependencies({
      idempotencyStore: store
    }));

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
    }, createDependencies())).rejects.toThrow(InvalidCreemSignatureError);
  });

  it("propagates DataFast failures", async () => {
    const sendPayment = vi.fn(async () => {
      throw new Error("DataFast failed");
    });

    await expect(handleWebhook(createParams(checkoutCompletedFixture), {
      ...createDependencies(),
      datafast: {
        sendPayment
      }
    })).rejects.toThrow("DataFast failed");
  });

  it("processes one-time checkout.completed events", async () => {
    const sendPayment = vi.fn(async () => ({ ok: true }));

    const result = await handleWebhook(createParams(checkoutCompletedFixture), createDependencies({
      datafast: {
        sendPayment
      }
    }));

    expect(result.ignored).toBe(false);
    expect(sendPayment).toHaveBeenCalledTimes(1);
  });

  it("ignores checkout.completed for an initial subscription purchase", async () => {
    const sendPayment = vi.fn();

    const result = await handleWebhook(createParams({
      ...checkoutCompletedFixture,
      object: {
        ...checkoutCompletedFixture.object,
        order: {
          ...checkoutCompletedFixture.object.order,
          type: "recurring"
        },
        subscription: {
          id: "sub_123"
        }
      }
    }), createDependencies({
      datafast: {
        sendPayment
      }
    }));

    expect(result).toEqual({
      eventId: "evt_checkout_completed_123",
      eventType: "checkout.completed",
      ignored: true,
      ok: true,
      reason: "delegated_to_subscription_paid"
    });
    expect(sendPayment).not.toHaveBeenCalled();
  });

  it("marks events as processed after a successful send", async () => {
    const store = new TestMemoryIdempotencyStore();

    const result = await handleWebhook(createParams(checkoutCompletedFixture), createDependencies({
      datafast: {
        sendPayment: vi.fn(async () => ({ ok: true }))
      },
      idempotencyStore: store
    }));

    expect(result.ignored).toBe(false);
    expect(await store.has("creem:event:evt_checkout_completed_123")).toBe(true);
  });

  it("hydrates subscription.paid transactions when available", async () => {
    const result = await handleWebhook(createParams(subscriptionPaidFixture), createDependencies({
      creem: {
        getTransactionById: vi.fn(async () => transactionFixture)
      },
      datafast: {
        sendPayment: vi.fn(async (payload) => payload)
      }
    }));

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

  it("processes refund.created as a refunded DataFast payment", async () => {
    const result = await handleWebhook(createParams(refundCreatedFixture), createDependencies({
      datafast: {
        sendPayment: vi.fn(async (payload) => payload)
      }
    }));

    if (result.ignored) {
      throw new Error("Expected refund.created to be processed.");
    }

    expect(result.payload).toEqual({
      amount: 5,
      currency: "EUR",
      customer_id: "cus_refund_123",
      datafast_visitor_id: "visitor_refund_123",
      email: "refund@example.com",
      name: "Refund Customer",
      refunded: true,
      renewal: true,
      timestamp: "2026-03-12T11:00:00.000Z",
      transaction_id: "refund_123"
    });
  });
});
