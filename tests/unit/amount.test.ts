import { currencyExponent, minorToMajor } from "../../src/core/amount.js";

describe("amount", () => {
  it("keeps zero-decimal currencies like JPY unchanged for small and large amounts", () => {
    expect(currencyExponent("JPY")).toBe(0);
    expect(minorToMajor(1, "JPY")).toBe(1);
    expect(minorToMajor(1234, "JPY")).toBe(1234);
    expect(minorToMajor(987654, "JPY")).toBe(987654);
  });

  it("converts two-decimal currencies like USD for small and large amounts", () => {
    expect(currencyExponent("USD")).toBe(2);
    expect(minorToMajor(1, "USD")).toBe(0.01);
    expect(minorToMajor(2999, "USD")).toBe(29.99);
    expect(minorToMajor(123456789, "USD")).toBe(1234567.89);
  });

  it("converts three-decimal currencies like KWD for small and large amounts", () => {
    expect(currencyExponent("KWD")).toBe(3);
    expect(minorToMajor(1, "KWD")).toBe(0.001);
    expect(minorToMajor(12345, "KWD")).toBe(12.345);
    expect(minorToMajor(123456789, "KWD")).toBe(123456.789);
  });

  it("uses exponent 2 for unknown currencies", () => {
    expect(currencyExponent("ZZZ")).toBe(2);
    expect(minorToMajor(1, "ZZZ")).toBe(0.01);
    expect(minorToMajor(123456, "ZZZ")).toBe(1234.56);
  });
});
