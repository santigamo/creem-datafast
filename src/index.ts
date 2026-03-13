import { createCheckout } from "./core/checkout.js";
import { createCreemClient } from "./core/creem-client.js";
import { createDataFastClient } from "./core/datafast-client.js";
import { DataFastRequestError, InvalidCreemSignatureError } from "./core/errors.js";
import { resolveLogger } from "./core/logger.js";
import { extractHeader, verifyCreemSignature } from "./core/signature.js";
import { handleWebhook } from "./core/webhook.js";
import type {
  CreemDataFastClient,
  CreemDataFastOptions,
  HeadersLike
} from "./core/types.js";

export type {
  CheckoutCustomerInput,
  CheckoutCustomFieldInput,
  CheckoutMetadata,
  CreateCheckoutContext,
  CreateCheckoutParams,
  CreateCheckoutResult,
  CreemDataFastClient,
  CreemDataFastOptions,
  DataFastPaymentPayload,
  DataFastTracking,
  HandleWebhookParams,
  HandleWebhookResult,
  HeadersLike,
  IgnoredWebhookResult,
  IdempotencyStore,
  LoggerLike,
  MetadataValue,
  ProcessedWebhookResult,
  RequestLike,
  RetryConfig,
  SupportedWebhookEvent
} from "./core/types.js";

export {
  DataFastRequestError,
  InvalidCreemSignatureError
} from "./core/errors.js";

export function createCreemDataFast(
  options: CreemDataFastOptions
): CreemDataFastClient {
  const logger = resolveLogger(options.logger);
  const creem = createCreemClient(options);
  const datafast = createDataFastClient(options);
  const captureSessionId = options.captureSessionId ?? true;
  const strictTracking = options.strictTracking ?? false;
  const hydrateTransactionOnSubscriptionPaid = options.hydrateTransactionOnSubscriptionPaid ?? true;
  const idempotencyTtlSeconds = options.idempotencyTtlSeconds ?? 86400;

  return {
    createCheckout(params, context) {
      return createCheckout(params, context, {
        creem,
        captureSessionId,
        strictTracking,
        logger
      });
    },
    handleWebhook(params) {
      return handleWebhook(params, {
        creemWebhookSecret: options.creemWebhookSecret,
        datafast,
        creem,
        idempotencyStore: options.idempotencyStore,
        idempotencyTtlSeconds,
        hydrateTransactionOnSubscriptionPaid,
        logger
      });
    },
    /**
     * Returns `true` for a valid signature and `false` for an invalid one.
     * Throws `InvalidCreemSignatureError` when the `creem-signature` header is missing.
     */
    verifyWebhookSignature(rawBody: string, headers: HeadersLike): boolean {
      const signature = extractHeader(headers, "creem-signature");
      if (!signature) {
        throw new InvalidCreemSignatureError("Missing creem-signature header.");
      }

      return verifyCreemSignature(rawBody, options.creemWebhookSecret, signature);
    }
  };
}
