const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF"
]);

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function currencyExponent(currency: string): 0 | 2 | 3 {
  const normalized = currency.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
    return 0;
  }

  if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
    return 3;
  }

  return 2;
}

export function minorToMajor(amount: number, currency: string): number {
  const exponent = currencyExponent(currency);

  if (exponent === 0) {
    return amount;
  }

  const factor = 10 ** exponent;
  return Math.round((amount / factor) * 1000) / 1000;
}
