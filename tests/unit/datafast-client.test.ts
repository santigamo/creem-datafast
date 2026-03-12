import { createDataFastClient } from "../../src/core/datafast-client.js";
import { DataFastRequestError } from "../../src/core/errors.js";

describe("datafast client", () => {
  it("sends the expected request", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    const client = createDataFastClient({
      creemWebhookSecret: "secret",
      datafastApiKey: "datafast_key",
      fetch: fetchMock as typeof fetch
    });

    const payload = {
      amount: 29.99,
      currency: "USD",
      transaction_id: "txn_123"
    };

    const response = await client.sendPayment(payload);

    expect(response).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("https://datafa.st/api/v1/payments", expect.objectContaining({
      body: JSON.stringify(payload),
      headers: {
        Authorization: "Bearer datafast_key",
        "Content-Type": "application/json"
      },
      method: "POST"
    }));
  });

  it("throws on non-2xx responses", async () => {
    const client = createDataFastClient({
      creemWebhookSecret: "secret",
      datafastApiKey: "datafast_key",
      fetch: vi.fn(async () => new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      })) as typeof fetch
    });

    await expect(client.sendPayment({
      amount: 10,
      currency: "EUR",
      transaction_id: "txn_123"
    })).rejects.toMatchObject({
      body: { error: "bad request" },
      status: 400
    } satisfies Partial<DataFastRequestError>);
  });

  it("throws on 500 responses", async () => {
    const client = createDataFastClient({
      creemWebhookSecret: "secret",
      datafastApiKey: "datafast_key",
      fetch: vi.fn(async () => new Response(JSON.stringify({ error: "server error" }), {
        status: 500,
        headers: { "content-type": "application/json" }
      })) as typeof fetch
    });

    await expect(client.sendPayment({
      amount: 10,
      currency: "EUR",
      transaction_id: "txn_500"
    })).rejects.toMatchObject({
      body: { error: "server error" },
      status: 500
    } satisfies Partial<DataFastRequestError>);
  });
});
