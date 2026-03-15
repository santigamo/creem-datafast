import transactionFixture from "../fixtures/transaction.json";

import { hydrateTransaction } from "../../src/core/transaction.js";
import { TransactionHydrationError } from "../../src/core/errors.js";

function createMockCreem(overrides?: { getTransactionById?: ReturnType<typeof vi.fn> }) {
  return {
    createCheckout: vi.fn(),
    getTransactionById: overrides?.getTransactionById ?? vi.fn()
  };
}

describe("hydrateTransaction", () => {
  it("returns a NormalizedTransaction for a valid response", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => transactionFixture)
    });

    const result = await hydrateTransaction(creem, "txn_sub_123");

    expect(result).toEqual({
      amount: 1099,
      currency: "EUR",
      id: "txn_sub_123",
      timestamp: "2026-03-12T10:00:00.000Z"
    });
  });

  it("uses created_at when createdAt is absent", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({
        id: "txn_1",
        amount: 500,
        currency: "USD",
        created_at: 1773309600000
      }))
    });

    const result = await hydrateTransaction(creem, "txn_1");

    expect(result.timestamp).toBe("2026-03-12T10:00:00.000Z");
  });

  it("throws TransactionHydrationError for null response", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => null)
    });

    await expect(hydrateTransaction(creem, "txn_null")).rejects.toThrow(TransactionHydrationError);
  });

  it("throws TransactionHydrationError when id is missing", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({ amount: 100, currency: "USD" }))
    });

    await expect(hydrateTransaction(creem, "txn_no_id")).rejects.toThrow(TransactionHydrationError);
  });

  it("throws TransactionHydrationError when amount is missing", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({ id: "txn_1", currency: "USD" }))
    });

    await expect(hydrateTransaction(creem, "txn_1")).rejects.toThrow(TransactionHydrationError);
  });

  it("throws TransactionHydrationError when currency is missing", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({ id: "txn_1", amount: 100 }))
    });

    await expect(hydrateTransaction(creem, "txn_1")).rejects.toThrow(TransactionHydrationError);
  });

  it("wraps network errors in TransactionHydrationError with cause", async () => {
    const networkError = new Error("ECONNREFUSED");
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => {
        throw networkError;
      })
    });

    const error = await hydrateTransaction(creem, "txn_net").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TransactionHydrationError);
    expect((error as TransactionHydrationError).cause).toBe(networkError);
  });

  it("returns undefined timestamp when createdAt is NaN", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({
        id: "txn_1",
        amount: 100,
        currency: "USD",
        createdAt: NaN
      }))
    });

    const result = await hydrateTransaction(creem, "txn_1");

    expect(result.timestamp).toBeUndefined();
  });

  it("returns undefined timestamp when no timestamp field exists", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({
        id: "txn_1",
        amount: 100,
        currency: "USD"
      }))
    });

    const result = await hydrateTransaction(creem, "txn_1");

    expect(result.timestamp).toBeUndefined();
  });

  it("treats values <= 1e12 as seconds and multiplies by 1000", async () => {
    const creem = createMockCreem({
      getTransactionById: vi.fn(async () => ({
        id: "txn_1",
        amount: 100,
        currency: "USD",
        createdAt: 1773309600
      }))
    });

    const result = await hydrateTransaction(creem, "txn_1");

    expect(result.timestamp).toBe("2026-03-12T10:00:00.000Z");
  });
});
