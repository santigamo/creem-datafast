import type { Server } from "node:http";

import { InvalidCreemSignatureError } from "creem-datafast";

import { createExampleExpressApp } from "../../example-express/src/app.js";
import type { CreemDataFastClient, HandleWebhookResult } from "../../src/core/types.js";

function createClient(
  overrides: Partial<CreemDataFastClient> = {}
): CreemDataFastClient {
  return {
    createCheckout: vi.fn(),
    handleWebhook: vi.fn(async (): Promise<HandleWebhookResult> => ({
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
    })),
    verifyWebhookSignature: vi.fn(),
    ...overrides
  };
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

describe("example-express runtime app", () => {
  let server: Server | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();

    if (server) {
      await stopServer(server);
      server = undefined;
    }
  });

  it("uses express.raw for webhook requests and returns 200 on success", async () => {
    const handleWebhook = vi.fn(async (): Promise<HandleWebhookResult> => ({
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
    }));
    const app = createExampleExpressApp({
      client: createClient({ handleWebhook })
    });

    server = app.listen(0, "127.0.0.1");
    const port = await getListeningPort(server);
    const rawBody = "{\"ok\":true}";

    const response = await fetch(`http://127.0.0.1:${port}/api/webhook/creem`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "creem-signature": "sig_123"
      },
      body: rawBody
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(handleWebhook).toHaveBeenCalledWith({
      rawBody,
      headers: expect.objectContaining({
        "content-type": "application/json",
        "creem-signature": "sig_123"
      })
    });
  });

  it("returns 400 when the adapter sees InvalidCreemSignatureError", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const app = createExampleExpressApp({
      client: createClient({
        handleWebhook: vi.fn(async () => {
          throw new InvalidCreemSignatureError("bad signature");
        })
      })
    });

    server = app.listen(0, "127.0.0.1");
    const port = await getListeningPort(server);

    const response = await fetch(`http://127.0.0.1:${port}/api/webhook/creem`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{}"
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid signature");
  });
});
