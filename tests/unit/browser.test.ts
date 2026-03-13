import { appendDataFastTracking, getDataFastTracking } from "../../src/client/browser.js";

describe("browser helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads tracking from document.cookie", () => {
    vi.stubGlobal("document", {
      cookie: "datafast_visitor_id=visitor_1; datafast_session_id=session_1"
    });

    expect(getDataFastTracking()).toEqual({
      sessionId: "session_1",
      visitorId: "visitor_1"
    });
  });

  it("supports a manual cookie source", () => {
    expect(getDataFastTracking("datafast_visitor_id=visitor_2")).toEqual({
      visitorId: "visitor_2"
    });
  });

  it("appends tracking onto existing query params", () => {
    expect(
      appendDataFastTracking("/api/checkout?foo=bar", {
        sessionId: "session_1",
        visitorId: "visitor_1"
      })
    ).toBe("/api/checkout?foo=bar&datafast_visitor_id=visitor_1&datafast_session_id=session_1");
  });

  it("does not fail without cookies", () => {
    expect(appendDataFastTracking("/api/checkout", {})).toBe("/api/checkout");
  });
});
