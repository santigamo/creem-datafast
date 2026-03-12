import checkoutCompletedFixture from "../fixtures/checkout-completed.json";

import { mapCheckoutCompletedToPayment } from "../../src/core/mapper.js";

describe("mapCheckoutCompletedToPayment", () => {
  it("maps checkout.completed into a DataFast payment payload", () => {
    expect(mapCheckoutCompletedToPayment(checkoutCompletedFixture)).toEqual({
      amount: 29.99,
      currency: "USD",
      customer_id: "cus_123",
      datafast_visitor_id: "visitor_from_metadata",
      email: "checkout@example.com",
      name: "Checkout Customer",
      renewal: false,
      transaction_id: "order_123"
    });
  });

  it("does not fail when visitor id is missing", () => {
    const payload = mapCheckoutCompletedToPayment({
      ...checkoutCompletedFixture,
      object: {
        ...checkoutCompletedFixture.object,
        metadata: {}
      }
    });

    expect(payload.datafast_visitor_id).toBeUndefined();
    expect(payload.renewal).toBe(false);
  });
});
