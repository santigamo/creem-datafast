import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { createCreemDataFast } from "creem-datafast";

const webhookSecret = "bun_smoke_secret";

function sign(rawBody) {
  return createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
}

const webhookPayload = {
  id: "evt_bun_checkout",
  eventType: "checkout.completed",
  object: {
    customer: {
      email: "bun@example.com",
      id: "cus_bun",
      name: "Bun User"
    },
    metadata: {
      datafast_visitor_id: "visitor_from_webhook"
    },
    order: {
      amount: 2499,
      currency: "USD",
      id: "order_bun",
      type: "one_time"
    }
  }
};

const rawBody = JSON.stringify(webhookPayload);
let forwardedPayload;

const client = createCreemDataFast({
  creemClient: {
    checkouts: {
      async create(input) {
        return {
          checkoutUrl: "https://creem.test/checkout/bun",
          id: "checkout_bun",
          metadata: input.metadata
        };
      }
    },
    transactions: {
      async getById(transactionId) {
        return {
          amount: 2499,
          createdAt: 1710000000000,
          currency: "USD",
          id: transactionId
        };
      }
    }
  },
  creemWebhookSecret: webhookSecret,
  datafastApiKey: "datafast_key",
  fetch: async (_input, init) => {
    forwardedPayload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  }
});

assert.equal(
  await client.verifyWebhookSignature(rawBody, { "creem-signature": sign(rawBody) }),
  true
);

const checkout = await client.createCheckout(
  {
    productId: "prod_bun",
    successUrl: "https://example.com/success"
  },
  {
    request: {
      headers: {
        cookie: "datafast_visitor_id=visitor_from_cookie"
      },
      url: "https://example.com/api/checkout"
    }
  }
);

assert.equal(checkout.finalMetadata.datafast_visitor_id, "visitor_from_cookie");

const result = await client.handleWebhook({
  rawBody,
  headers: {
    "creem-signature": sign(rawBody)
  }
});

assert.equal(result.ignored, false);
assert.deepEqual(forwardedPayload, {
  amount: 24.99,
  currency: "USD",
  customer_id: "cus_bun",
  datafast_visitor_id: "visitor_from_webhook",
  email: "bun@example.com",
  name: "Bun User",
  renewal: false,
  transaction_id: "order_bun"
});
