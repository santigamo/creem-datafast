import refundCreatedFixture from "../fixtures/refund-created.json";

import { mapRefundCreatedToPayment } from "../../src/core/mapper.js";

describe("mapRefundCreatedToPayment", () => {
  it("maps refund.created into a refunded DataFast payment payload", () => {
    expect(mapRefundCreatedToPayment(refundCreatedFixture)).toEqual({
      amount: 5,
      currency: "EUR",
      customer_id: "cus_refund_123",
      datafast_visitor_id: "visitor_refund_123",
      email: "refund@example.com",
      name: "Refund Customer",
      refunded: true,
      renewal: true,
      timestamp: "2026-03-12T11:00:00.000Z",
      transaction_id: "refund_123"
    });
  });

  it("supports partial refunds without touching the original transaction amount", () => {
    expect(
      mapRefundCreatedToPayment({
        ...refundCreatedFixture,
        object: {
          ...refundCreatedFixture.object,
          refund_amount: 199
        }
      }).amount
    ).toBe(1.99);
  });

  it("falls back to transaction metadata and string customers", () => {
    expect(
      mapRefundCreatedToPayment({
        ...refundCreatedFixture,
        object: {
          ...refundCreatedFixture.object,
          customer: "cus_refund_string_123",
          metadata: {},
          transaction: {
            ...refundCreatedFixture.object.transaction,
            metadata: {
              datafast_visitor_id: "visitor_from_transaction_metadata"
            }
          }
        }
      })
    ).toEqual({
      amount: 5,
      currency: "EUR",
      customer_id: "cus_refund_string_123",
      datafast_visitor_id: "visitor_from_transaction_metadata",
      refunded: true,
      renewal: true,
      timestamp: "2026-03-12T11:00:00.000Z",
      transaction_id: "refund_123"
    });
  });

  it("marks one-off refunds as non-renewals", () => {
    expect(
      mapRefundCreatedToPayment({
        ...refundCreatedFixture,
        object: {
          ...refundCreatedFixture.object,
          transaction: {
            ...refundCreatedFixture.object.transaction,
            subscription: null,
            type: "payment_link"
          }
        }
      }).renewal
    ).toBe(false);
  });
});
