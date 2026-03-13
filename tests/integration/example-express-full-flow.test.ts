import { createHmac } from "node:crypto";
import type { Server } from "node:http";

import checkoutCompletedFixture from "../fixtures/checkout-completed.json";
import subscriptionPaidFixture from "../fixtures/subscription-paid.json";
import transactionFixture from "../fixtures/transaction.json";

import { createCreemDataFast } from "creem-datafast";
import { createExampleExpressApp } from "../../example-express/src/app.js";

const WEBHOOK_SECRET = "whsec_runtime_integration";
const DATAFAST_API_KEY = "datafast_runtime_integration";
const CHECKOUT_URL = "https://creem.test/checkout/123";
const VISITOR_ID = "abc";

type CheckoutRequest = {
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type RuntimeHarness = {
  checkoutCreate: ReturnType<typeof vi.fn>;
  datafastFetch: ReturnType<typeof vi.fn>;
  getTransactionById: ReturnType<typeof vi.fn>;
  server: Server;
};

function sign(rawBody: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

async function getListeningPort(server: Server): Promise<number> {
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected HTTP server to listen on an ephemeral port.");
  }

  return address.port;
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createRuntimeHarness(): RuntimeHarness {
  const checkoutCreate = vi.fn(async (_request) => ({
    checkoutUrl: CHECKOUT_URL,
    id: "checkout_123"
  }));
  const getTransactionById = vi.fn(async (_transactionId: string) =>
    structuredClone(transactionFixture)
  );
  const datafastFetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json"
        },
        status: 200
      })
  );

  const client = createCreemDataFast({
    creemClient: {
      checkouts: {
        create: checkoutCreate
      },
      transactions: {
        getById: getTransactionById
      }
    },
    creemWebhookSecret: WEBHOOK_SECRET,
    datafastApiKey: DATAFAST_API_KEY,
    fetch: datafastFetch,
    logger: {
      debug() {},
      error() {},
      info() {},
      warn() {}
    }
  });

  return {
    checkoutCreate,
    datafastFetch,
    getTransactionById,
    server: createExampleExpressApp({
      checkoutConfig: {
        appBaseUrl: "http://127.0.0.1:3000",
        productId: "prod_runtime_integration"
      },
      client
    }).listen(0, "127.0.0.1")
  };
}

function getInjectedMetadata(harness: RuntimeHarness): Record<string, unknown> {
  const request = harness.checkoutCreate.mock.calls[0]?.[0] as CheckoutRequest | undefined;
  const metadata = request?.metadata;

  if (!metadata || typeof metadata !== "object") {
    throw new Error(
      "Expected checkout metadata to be captured during the runtime integration test."
    );
  }

  return metadata;
}

async function createCheckout(port: number): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/api/checkout`, {
    headers: {
      cookie: `datafast_visitor_id=${VISITOR_ID}`
    },
    method: "POST",
    redirect: "manual"
  });
}

async function postSignedWebhook(port: number, payload: unknown): Promise<Response> {
  const rawBody = JSON.stringify(payload);

  return fetch(`http://127.0.0.1:${port}/api/webhook/creem`, {
    body: rawBody,
    headers: {
      "content-type": "application/json",
      "creem-signature": sign(rawBody)
    },
    method: "POST"
  });
}

function getForwardedPayment(harness: RuntimeHarness): Record<string, unknown> {
  const [url, init] = harness.datafastFetch.mock.calls[0] as [string, RequestInit];
  const body = init.body;

  if (typeof url !== "string") {
    throw new Error("Expected DataFast fetch to receive a string URL.");
  }

  if (typeof body !== "string") {
    throw new Error("Expected DataFast fetch body to be a JSON string.");
  }

  expect(url).toBe("https://datafa.st/api/v1/payments");
  expect(init.headers).toEqual({
    Authorization: `Bearer ${DATAFAST_API_KEY}`,
    "Content-Type": "application/json"
  });

  return JSON.parse(body) as Record<string, unknown>;
}

describe("example-express full runtime flow", () => {
  let harness: RuntimeHarness | undefined;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (harness) {
      await stopServer(harness.server);
      harness = undefined;
    }
  });

  it("creates a checkout over HTTP and injects visitor tracking into Creem metadata", async () => {
    harness = createRuntimeHarness();
    const port = await getListeningPort(harness.server);

    const response = await createCheckout(port);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(CHECKOUT_URL);
    expect(harness.checkoutCreate).toHaveBeenCalledTimes(1);
    expect(getInjectedMetadata(harness)).toEqual({
      datafast_visitor_id: VISITOR_ID
    });
  });

  it("forwards checkout.completed through the real Express runtime path", async () => {
    harness = createRuntimeHarness();
    const port = await getListeningPort(harness.server);

    const checkoutResponse = await createCheckout(port);

    expect(checkoutResponse.status).toBe(303);

    const response = await postSignedWebhook(port, {
      ...structuredClone(checkoutCompletedFixture),
      object: {
        ...structuredClone(checkoutCompletedFixture).object,
        metadata: getInjectedMetadata(harness)
      }
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(harness.datafastFetch).toHaveBeenCalledTimes(1);
    expect(getForwardedPayment(harness)).toEqual({
      amount: 29.99,
      currency: "USD",
      customer_id: "cus_123",
      datafast_visitor_id: VISITOR_ID,
      email: "checkout@example.com",
      name: "Checkout Customer",
      renewal: false,
      transaction_id: "order_123"
    });
  });

  it("forwards subscription.paid with hydrated transaction data through the real Express runtime path", async () => {
    harness = createRuntimeHarness();
    const port = await getListeningPort(harness.server);

    const checkoutResponse = await createCheckout(port);

    expect(checkoutResponse.status).toBe(303);

    const response = await postSignedWebhook(port, {
      ...structuredClone(subscriptionPaidFixture),
      object: {
        ...structuredClone(subscriptionPaidFixture).object,
        metadata: getInjectedMetadata(harness)
      }
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(harness.getTransactionById).toHaveBeenCalledTimes(1);
    expect(harness.getTransactionById).toHaveBeenCalledWith("txn_sub_123");
    expect(harness.datafastFetch).toHaveBeenCalledTimes(1);
    expect(getForwardedPayment(harness)).toEqual({
      amount: 10.99,
      currency: "EUR",
      customer_id: "cus_sub_123",
      datafast_visitor_id: VISITOR_ID,
      email: "subscription@example.com",
      name: "Subscription Customer",
      renewal: true,
      timestamp: "2026-03-12T10:00:00.000Z",
      transaction_id: "txn_sub_123"
    });
  });

  it("rejects invalid webhook signatures through the real Express runtime path", async () => {
    harness = createRuntimeHarness();
    const port = await getListeningPort(harness.server);
    const rawBody = JSON.stringify(checkoutCompletedFixture);

    const response = await fetch(`http://127.0.0.1:${port}/api/webhook/creem`, {
      body: rawBody,
      headers: {
        "content-type": "application/json",
        "creem-signature": "bad_signature"
      },
      method: "POST"
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid signature");
    expect(harness.datafastFetch).not.toHaveBeenCalled();
  });
});
