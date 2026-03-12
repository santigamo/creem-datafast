import { currencyExponent, minorToMajor } from "../../src/core/amount.js";

describe("amount", () => {
  it("converts 1000 EUR to 10", () => {
    expect(minorToMajor(1000, "EUR")).toBe(10);
  });

  it("converts 2999 USD to 29.99", () => {
    expect(minorToMajor(2999, "USD")).toBe(29.99);
  });

  it("uses exponent 2 for unknown currencies", () => {
    expect(currencyExponent("ZZZ")).toBe(2);
  });
});
