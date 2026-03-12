import { DataFastRequestError } from "./errors.js";
import type {
  CreemDataFastOptions,
  DataFastPaymentPayload,
  InternalDataFastClient
} from "./types.js";

const DATAFAST_PAYMENTS_URL = "https://datafa.st/api/v1/payments";

function resolveFetch(fetchImplementation?: typeof globalThis.fetch): typeof globalThis.fetch {
  const resolved = fetchImplementation ?? globalThis.fetch;

  if (!resolved) {
    throw new DataFastRequestError("Fetch implementation is required to call DataFast.");
  }

  return resolved;
}

function parseResponseBody(body: string): unknown {
  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function createDataFastClient(
  options: CreemDataFastOptions
): InternalDataFastClient {
  const fetchImplementation = resolveFetch(options.fetch);

  return {
    async sendPayment(payload: DataFastPaymentPayload) {
      const response = await fetchImplementation(DATAFAST_PAYMENTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.datafastApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      const responseBody = parseResponseBody(responseText);

      if (!response.ok) {
        throw new DataFastRequestError(
          `DataFast request failed with status ${response.status}.`,
          response.status,
          responseBody
        );
      }

      return responseBody;
    }
  };
}
