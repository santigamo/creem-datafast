import { CreemDataFastError, MissingTrackingError } from "../../src/core/errors.js";
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

  it("uses cookieHeader when request cookies are absent", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      cookieHeader: "datafast_visitor_id=visitor_cookie",
      request: {
        headers: {}
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      visitorId: "visitor_cookie"
    });
  });

  it("fills missing request cookie fields from cookieHeader", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      cookieHeader: "datafast_visitor_id=visitor_cookie",
      request: {
        headers: {
          cookie: "datafast_session_id=session_cookie"
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
  });

  it("keeps request cookie values over cookieHeader", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      cookieHeader: "datafast_visitor_id=visitor_fallback; datafast_session_id=session_fallback",
      request: {
        headers: {
          cookie: "datafast_visitor_id=visitor_request; datafast_session_id=session_request"
        }
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      sessionId: "session_request",
      visitorId: "visitor_request"
    });
  });

  it("uses query params from request.url when cookies are missing", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      request: {
        headers: {},
        url: "https://example.com/api/checkout?datafast_visitor_id=visitor_query&datafast_session_id=session_query"
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      sessionId: "session_query",
      visitorId: "visitor_query"
    });
  });

  it("keeps query params above request cookies and cookieHeader", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      cookieHeader: "datafast_visitor_id=visitor_fallback",
      request: {
        headers: {
          cookie: "datafast_visitor_id=visitor_request; datafast_session_id=session_request"
        },
        url: "/api/checkout?datafast_visitor_id=visitor_query&datafast_session_id=session_query"
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      sessionId: "session_query",
      visitorId: "visitor_query"
    });
  });

  it("prefers query params over cookies", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      request: {
        headers: {
          cookie: "datafast_visitor_id=visitor_cookie; datafast_session_id=session_cookie"
        },
        url: "/api/checkout?datafast_visitor_id=visitor_query&datafast_session_id=session_query"
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      sessionId: "session_query",
      visitorId: "visitor_query"
    });
  });

  it("keeps metadata above query params", async () => {
    const result = await createCheckout({
      metadata: {
        datafast_session_id: "session_metadata",
        datafast_visitor_id: "visitor_metadata"
      },
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      request: {
        headers: {},
        url: "/api/checkout?datafast_visitor_id=visitor_query&datafast_session_id=session_query"
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      sessionId: "session_metadata",
      visitorId: "visitor_metadata"
    });
    expect(result.finalMetadata).toEqual({
      datafast_session_id: "session_metadata",
      datafast_visitor_id: "visitor_metadata"
    });
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
      request: {
        headers: {
          cookie: "datafast_visitor_id=visitor_cookie; datafast_session_id=session_cookie"
        },
        url: "/api/checkout?datafast_visitor_id=visitor_query&datafast_session_id=session_query"
      }
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

  it("ignores malformed request urls", async () => {
    const result = await createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, {
      request: {
        headers: {
          cookie: "datafast_visitor_id=visitor_cookie"
        },
        url: "http://%"
      }
    }, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    });

    expect(result.injectedTracking).toEqual({
      visitorId: "visitor_cookie"
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

  it("throws a generic package error when Creem returns an invalid checkout response", async () => {
    creem.createCheckout.mockResolvedValueOnce({
      id: "checkout_123"
    });

    await expect(createCheckout({
      productId: "prod_123",
      successUrl: "https://example.com/success"
    }, undefined, {
      captureSessionId: true,
      creem,
      logger: noopLogger,
      strictTracking: false
    })).rejects.toThrow(CreemDataFastError);
  });
});
