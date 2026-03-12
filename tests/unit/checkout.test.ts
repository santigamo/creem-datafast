import { MissingTrackingError } from "../../src/core/errors.js";
import { createCheckout } from "../../src/core/checkout.js";
import { noopLogger } from "../../src/core/logger.js";

describe("createCheckout", () => {
  const creem = {
    createCheckout: vi.fn(async (request) => ({
      checkoutUrl: "https://creem.test/checkout/123",
      id: "checkout_123",
      ...request
    })),
    getTransactionById: vi.fn()
  };

  beforeEach(() => {
    creem.createCheckout.mockClear();
  });

  it("uses cookies from request headers", async () => {
    const result = await createCheckout({
      metadata: { existing: "value" },
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      request: {
        headers: {
          cookie: "datafast_visitor_id=visitor_cookie; datafast_session_id=session_cookie"
        }
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      sessionId: "session_cookie",
      visitorId: "visitor_cookie"
    });
    expect(result.finalMetadata).toEqual({
      datafast_session_id: "session_cookie",
      datafast_visitor_id: "visitor_cookie",
      existing: "value"
    });
  });

  it("uses cookieHeader when request is missing", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      cookieHeader: "datafast_visitor_id=visitor_cookie"
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking.visitorId).toBe("visitor_cookie");
  });

  it("lets explicit tracking win over cookies and metadata", async () => {
    const result = await createCheckout({
      metadata: {
        datafast_visitor_id: "from-metadata"
      },
      productId: "prod_123",
      successUrl: "https://example.com/success",
      tracking: {
        sessionId: "from-explicit-session",
        visitorId: "from-explicit"
      }
    }, {
      cookieHeader: "datafast_visitor_id=visitor_cookie; datafast_session_id=session_cookie"
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.finalMetadata).toEqual({
      datafast_session_id: "from-explicit-session",
      datafast_visitor_id: "from-explicit"
    });
  });

  it("does not overwrite existing merchant metadata", async () => {
    const result = await createCheckout({
      metadata: {
        merchant_flag: true
      },
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      cookieHeader: "datafast_visitor_id=visitor_cookie"
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.finalMetadata).toEqual({
      datafast_visitor_id: "visitor_cookie",
      merchant_flag: true
    });
  });

  it("throws when strictTracking is enabled and visitorId is missing", async () => {
    await expect(createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, undefined, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: true
    })).rejects.toThrow(MissingTrackingError);
  });
});
