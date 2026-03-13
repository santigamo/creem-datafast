const mockHandleWebhookRequest = vi.hoisted(() => vi.fn());

vi.mock("creem-datafast/next", () => ({
  handleWebhookRequest: mockHandleWebhookRequest
}));

const REQUIRED_ENV = {
  CREEM_API_KEY: "creem_test_key",
  CREEM_WEBHOOK_SECRET: "whsec_test_key",
  DATAFAST_API_KEY: "datafast_test_key",
  CREEM_PRODUCT_ID: "prod_test_key"
} as const;

async function loadRoute() {
  return import("../../example-next/app/api/webhook/creem/route");
}

describe("example-next custom webhook docs contract", () => {
  beforeEach(() => {
    vi.resetModules();
    mockHandleWebhookRequest.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();

    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it("returns 400 when the low-level helper rejects with InvalidCreemSignatureError", async () => {
    const { InvalidCreemSignatureError } = await import("creem-datafast");
    mockHandleWebhookRequest.mockRejectedValue(new InvalidCreemSignatureError("bad signature"));

    const { POST } = await loadRoute();
    const response = await POST(new Request("https://example.com/api/webhook/creem", {
      body: "{}",
      method: "POST"
    }));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid signature");
  });

  it("returns 500 when the low-level helper rejects unexpectedly", async () => {
    mockHandleWebhookRequest.mockRejectedValue(new Error("DataFast failed"));

    const { POST } = await loadRoute();
    const response = await POST(new Request("https://example.com/api/webhook/creem", {
      body: "{}",
      method: "POST"
    }));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal error");
    expect(console.error).toHaveBeenCalledWith("[example-next] webhook failed", {
      errorName: "Error",
      message: "DataFast failed"
    });
  });

  it("returns 200 ignored when the low-level helper yields an ignored webhook", async () => {
    mockHandleWebhookRequest.mockResolvedValue({
      deduplicated: false,
      eventId: "evt_123",
      eventType: "refund.created",
      ignored: true,
      ok: true,
      reason: "unsupported_event"
    });

    const { POST } = await loadRoute();
    const response = await POST(new Request("https://example.com/api/webhook/creem", {
      body: "{}",
      method: "POST"
    }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Ignored");
  });
});
