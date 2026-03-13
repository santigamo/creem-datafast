import { buildClientCheckoutPath } from "../../example-next/app/checkout-button";

describe("example-next checkout button helper", () => {
  it("appends DataFast tracking onto the checkout request path", () => {
    expect(
      buildClientCheckoutPath(
        "theme=paper; datafast_visitor_id=visitor_123; datafast_session_id=session_123"
      )
    ).toBe("/api/checkout?datafast_visitor_id=visitor_123&datafast_session_id=session_123");
  });

  it("leaves the same-origin checkout path untouched when tracking is missing", () => {
    expect(buildClientCheckoutPath("theme=paper")).toBe("/api/checkout");
  });
});
