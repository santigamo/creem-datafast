import { createCreemClient } from "../../src/core/creem-client.js";

describe("createCreemClient", () => {
  it("accepts a custom Creem client with the public minimal contract", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "checkout_123",
      checkoutUrl: "https://example.com/checkout"
    });
    const getById = vi.fn().mockResolvedValue({ id: "txn_123" });

    const client = createCreemClient({
      creemClient: {
        checkouts: { create },
        transactions: { getById }
      },
      creemWebhookSecret: "creem_secret",
      datafastApiKey: "datafast_key"
    });

    await expect(
      client.createCheckout({
        productId: "prod_123",
        successUrl: "https://example.com/success"
      })
    ).resolves.toMatchObject({
      id: "checkout_123",
      checkoutUrl: "https://example.com/checkout"
    });

    await expect(client.getTransactionById("txn_123")).resolves.toEqual({
      id: "txn_123"
    });
    expect(create).toHaveBeenCalledWith({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    });
    expect(getById).toHaveBeenCalledWith("txn_123");
  });

  it("rejects malformed custom Creem clients at runtime", () => {
    expect(() => {
      createCreemClient({
        creemClient: {
          checkouts: {},
          transactions: {}
        } as never,
        creemWebhookSecret: "creem_secret",
        datafastApiKey: "datafast_key"
      });
    }).toThrow("Provided creem client does not expose the expected SDK methods.");
  });
});
