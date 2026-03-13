import { currencyExponent, minorToMajor } from "../../src/core/amount.js";

describe("amount", () => {
  it("keeps zero-decimal currencies unchanged", () => {
    expect(currencyExponent("JPY")).toBe(0);
    expect(minorToMajor(1234, "JPY")).toBe(1234);
  });

  it("converts two-decimal currencies", () => {
    expect(currencyExponent("USD")).toBe(2);
    expect(minorToMajor(2999, "USD")).toBe(29.99);
  });

  it("converts three-decimal currencies", () => {
    expect(currencyExponent("KWD")).toBe(3);
    expect(minorToMajor(12345, "KWD")).toBe(12.345);
  });

  it("uses exponent 2 for unknown currencies", () => {
    expect(currencyExponent("ZZZ")).toBe(2);
  });
});
