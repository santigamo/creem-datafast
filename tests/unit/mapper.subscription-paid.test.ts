import subscriptionPaidFixture from "../fixtures/subscription-paid.json";
import transactionFixture from "../fixtures/transaction.json";

import { mapSubscriptionPaidToPayment } from "../../src/core/mapper.js";

describe("mapSubscriptionPaidToPayment", () => {
  it("maps subscription.paid using a hydrated transaction when present", () => {
    expect(mapSubscriptionPaidToPayment(subscriptionPaidFixture, {
      amount: transactionFixture.amount,
      currency: transactionFixture.currency,
      id: transactionFixture.id,
      timestamp: "2026-03-12T10:00:00.000Z"
    })).toEqual({
      amount: 10.99,
      currency: "EUR",
      customer_id: "cus_sub_123",
      datafast_visitor_id: "visitor_sub_123",
      email: "subscription@example.com",
      name: "Subscription Customer",
      renewal: true,
      timestamp: "2026-03-12T10:00:00.000Z",
      transaction_id: "txn_sub_123"
    });
  });

  it("falls back to product pricing when no transaction is provided", () => {
    expect(mapSubscriptionPaidToPayment(subscriptionPaidFixture)).toEqual({
      amount: 10,
      currency: "EUR",
      customer_id: "cus_sub_123",
      datafast_visitor_id: "visitor_sub_123",
      email: "subscription@example.com",
      name: "Subscription Customer",
      renewal: true,
      timestamp: "2026-03-12T10:00:00.000Z",
      transaction_id: "txn_sub_123"
    });
  });
});
