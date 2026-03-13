import { createDataFastClient } from "../../src/core/datafast-client.js";
import { DataFastRequestError } from "../../src/core/errors.js";

async function getThrownDataFastError(promise: Promise<unknown>): Promise<DataFastRequestError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(DataFastRequestError);
    return error as DataFastRequestError;
  }

  throw new Error("Expected DataFast request to fail.");
}

describe("datafast client", () => {
  it("sends the expected request", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    );

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
    expect(fetchMock).toHaveBeenCalledWith(
      "https://datafa.st/api/v1/payments",
      expect.objectContaining({
        body: JSON.stringify(payload),
        headers: {
          Authorization: "Bearer datafast_key",
          "Content-Type": "application/json"
        },
        method: "POST"
      })
    );
  });

  it("throws on non-2xx responses", async () => {
    const client = createDataFastClient({
      creemWebhookSecret: "secret",
      datafastApiKey: "datafast_key",
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "bad request" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          })
      ) as typeof fetch
    });

    await expect(
      client.sendPayment({
        amount: 10,
        currency: "EUR",
        transaction_id: "txn_123"
      })
    ).rejects.toMatchObject({
      responseBody: { error: "bad request" },
      retryable: false,
      status: 400
    } satisfies Partial<DataFastRequestError>);
  });

  it("throws on 500 responses", async () => {
    const client = createDataFastClient({
      creemWebhookSecret: "secret",
      datafastApiKey: "datafast_key",
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "server error" }), {
            status: 500,
            headers: { "content-type": "application/json" }
          })
      ) as typeof fetch
    });

    await expect(
      client.sendPayment({
        amount: 10,
        currency: "EUR",
        transaction_id: "txn_500"
      })
    ).rejects.toMatchObject({
      responseBody: { error: "server error" },
      retryable: true,
      status: 500
    } satisfies Partial<DataFastRequestError>);
  });

  it("retries once on retryable responses", async () => {
    vi.useFakeTimers();

    try {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "try again" }), {
            status: 503,
            headers: {
              "content-type": "application/json",
              "x-request-id": "req_retryable"
            }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" }
          })
        );

      const client = createDataFastClient({
        creemWebhookSecret: "secret",
        datafastApiKey: "datafast_key",
        fetch: fetchMock as typeof fetch,
        logger,
        retry: {
          retries: 1,
          baseDelayMs: 1,
          maxDelayMs: 1
        }
      });

      const promise = client.sendPayment({
        amount: 10,
        currency: "EUR",
        transaction_id: "txn_retry"
      });

      await vi.advanceTimersByTimeAsync(1);

      await expect(promise).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        "Retrying DataFast request after retryable response.",
        expect.objectContaining({
          attempt: 1,
          nextAttempt: 2,
          requestId: "req_retryable",
          status: 503
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry on non-retryable 4xx responses", async () => {
    vi.useFakeTimers();

    try {
      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "bad request" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          })
      );

      const client = createDataFastClient({
        creemWebhookSecret: "secret",
        datafastApiKey: "datafast_key",
        fetch: fetchMock as typeof fetch,
        retry: {
          retries: 1,
          baseDelayMs: 1,
          maxDelayMs: 1
        }
      });

      await expect(
        client.sendPayment({
          amount: 10,
          currency: "EUR",
          transaction_id: "txn_no_retry"
        })
      ).rejects.toMatchObject({
        retryable: false,
        status: 400
      } satisfies Partial<DataFastRequestError>);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts timed out requests and retries them once", async () => {
    vi.useFakeTimers();

    try {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      };
      const fetchMock = vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => {
                reject(new DOMException("The operation was aborted.", "AbortError"));
              },
              { once: true }
            );
          })
      );

      const client = createDataFastClient({
        creemWebhookSecret: "secret",
        datafastApiKey: "datafast_key",
        fetch: fetchMock as typeof fetch,
        logger,
        timeoutMs: 50,
        retry: {
          retries: 1,
          baseDelayMs: 1,
          maxDelayMs: 1
        }
      });

      const promise = client.sendPayment({
        amount: 10,
        currency: "EUR",
        transaction_id: "txn_timeout"
      });
      const errorPromise = getThrownDataFastError(promise);

      await vi.advanceTimersByTimeAsync(101);

      const error = await errorPromise;
      expect(error.retryable).toBe(true);
      expect(error.message).toBe("DataFast request timed out after 50ms.");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenNthCalledWith(
        1,
        "Retrying DataFast request after transport failure.",
        expect.objectContaining({
          attempt: 1,
          nextAttempt: 2,
          reason: "timeout"
        })
      );
      expect(logger.warn).toHaveBeenNthCalledWith(2, "DataFast request timed out.", {
        attempts: 2,
        timeoutMs: 50
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("exposes useful error metadata and truncates large response bodies", async () => {
    const largeError = "x".repeat(1_100);
    const client = createDataFastClient({
      creemWebhookSecret: "secret",
      datafastApiKey: "datafast_key",
      fetch: vi.fn(
        async () =>
          new Response(largeError, {
            status: 429,
            statusText: "Too Many Requests",
            headers: {
              "content-type": "text/plain",
              "x-request-id": "req_123"
            }
          })
      ) as typeof fetch,
      retry: {
        retries: 0
      }
    });

    const error = await getThrownDataFastError(
      client.sendPayment({
        amount: 10,
        currency: "EUR",
        transaction_id: "txn_429"
      })
    );

    expect(error.requestId).toBe("req_123");
    expect(error.retryable).toBe(true);
    expect(error.status).toBe(429);
    expect(error.statusText).toBe("Too Many Requests");
    expect(error.responseBody).toEqual(expect.stringContaining("[truncated]"));
  });
});
