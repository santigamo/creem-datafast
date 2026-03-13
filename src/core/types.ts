export type MetadataValue = string | number | boolean | null;
export type CheckoutMetadata = Record<string, MetadataValue>;

export interface DataFastTracking {
  visitorId?: string;
  sessionId?: string;
}

export interface LoggerLike {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export interface IdempotencyStore {
  claim(key: string, ttlSeconds?: number): Promise<boolean>;
  complete(key: string, ttlSeconds?: number): Promise<void>;
  release(key: string): Promise<void>;
}

export type HeadersLike =
  | Headers
  | Record<string, string | string[] | undefined>;

export interface RequestLike {
  headers: HeadersLike;
  url?: string;
}

export interface CheckoutCustomerInput {
  id?: string;
  email?: string;
}

export interface CheckoutCustomFieldInput {
  type: "text" | "checkbox";
  key: string;
  label: string;
  optional?: boolean;
  text?: {
    maxLength?: number;
    minLength?: number;
  };
  checkbox?: {
    label: string;
  };
}

export interface CreateCheckoutParams {
  productId: string;
  successUrl: string;
  requestId?: string;
  units?: number;
  discountCode?: string;
  customer?: CheckoutCustomerInput;
  customFields?: CheckoutCustomFieldInput[];
  metadata?: CheckoutMetadata;
  tracking?: DataFastTracking;
}

export interface CreateCheckoutContext {
  request?: RequestLike;
  cookieHeader?: string;
  strictTracking?: boolean;
}

export interface CreateCheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
  injectedTracking: DataFastTracking;
  finalMetadata: CheckoutMetadata;
  raw: unknown;
}

/**
 * Raw webhook input for Creem signature verification and processing.
 *
 * `rawBody` must be the exact unparsed request body string that Creem sent.
 * Passing JSON that was parsed and re-serialized can break signature checks.
 */
export interface HandleWebhookParams {
  rawBody: string;
  headers: HeadersLike;
}

export type SupportedWebhookEvent =
  | "checkout.completed"
  | "subscription.paid"
  | "refund.created";

/**
 * DataFast payment payload fields currently documented by the receiver API.
 *
 * `datafast_session_id` is captured during checkout and preserved in Creem
 * metadata, but it is intentionally not forwarded here until DataFast documents
 * support for it on `POST /api/v1/payments`.
 */
export interface DataFastPaymentPayload {
  amount: number;
  currency: string;
  transaction_id: string;
  datafast_visitor_id?: string;
  email?: string;
  name?: string;
  customer_id?: string;
  renewal?: boolean;
  refunded?: boolean;
  timestamp?: string;
}

export interface RetryConfig {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Minimal request shape that the injected Creem SDK checkout client must accept.
 */
export interface CreemCheckoutCreateRequest {
  productId: string;
  successUrl: string;
  requestId?: string;
  units?: number;
  discountCode?: string;
  customer?: CheckoutCustomerInput;
  customFields?: CheckoutCustomFieldInput[];
  metadata?: CheckoutMetadata;
}

/**
 * Minimal response shape that `createCheckout()` must return for this package to work.
 */
export interface CreemCheckoutResponse {
  id?: string;
  checkoutUrl?: string;
  checkout_url?: string;
  [key: string]: unknown;
}

/**
 * Minimal public contract for a custom Creem SDK instance injected through `creemClient`.
 */
export interface CreemSdkClientLike {
  checkouts: {
    create(
      request: CreemCheckoutCreateRequest
    ): Promise<CreemCheckoutResponse>;
  };
  transactions: {
    getById(transactionId: string): Promise<unknown>;
  };
}

/**
 * Successful webhook processing result for supported events that were forwarded
 * to DataFast.
 */
export type ProcessedWebhookResult = {
  ok: true;
  ignored: false;
  eventId: string;
  eventType: SupportedWebhookEvent;
  deduplicated: boolean;
  payload: DataFastPaymentPayload;
  datafastResponse: unknown;
};

/**
 * Successful webhook result for deliveries that were intentionally ignored,
 * such as unsupported event types or duplicates.
 */
export type IgnoredWebhookResult = {
  ok: true;
  ignored: true;
  eventId?: string;
  eventType?: string;
  reason:
    | "unsupported_event"
    | "duplicate_event"
    | "delegated_to_subscription_paid";
};

/**
 * Discriminated result from webhook handling.
 *
 * Branch on `ignored` to distinguish forwarded payments from intentionally
 * ignored deliveries.
 */
export type HandleWebhookResult =
  | ProcessedWebhookResult
  | IgnoredWebhookResult;

export interface CreemDataFastOptions {
  creemApiKey?: string;
  creemClient?: CreemSdkClientLike;
  creemWebhookSecret: string;
  datafastApiKey: string;
  testMode?: boolean;
  captureSessionId?: boolean;
  hydrateTransactionOnSubscriptionPaid?: boolean;
  strictTracking?: boolean;
  idempotencyInFlightTtlSeconds?: number;
  idempotencyProcessedTtlSeconds?: number;
  logger?: LoggerLike;
  idempotencyStore?: IdempotencyStore;
  timeoutMs?: number;
  retry?: RetryConfig;
  fetch?: typeof globalThis.fetch;
}

export interface CreemDataFastClient {
  createCheckout(
    params: CreateCheckoutParams,
    context?: CreateCheckoutContext
  ): Promise<CreateCheckoutResult>;
  /**
   * Verifies, deduplicates, normalizes, and forwards a raw Creem webhook payload.
   *
   * Use this when you already have the exact raw request body and headers from your framework.
   */
  handleWebhook(
    params: HandleWebhookParams
  ): Promise<HandleWebhookResult>;
  /**
   * Validates the `creem-signature` header against the exact raw webhook body.
   *
   * This is useful when you need signature checks separately from full webhook processing.
   * Returns `true` for a valid signature and `false` for an invalid one.
   * Throws `InvalidCreemSignatureError` when the `creem-signature` header is missing.
   */
  verifyWebhookSignature(
    rawBody: string,
    headers: HeadersLike
  ): boolean;
}

export interface NextWebhookHandlerOptions {
  onError?: (error: unknown) => void | Promise<void>;
}

export interface ExpressLikeRequest {
  headers: Record<string, string | string[] | undefined>;
  body: Buffer | string;
}

export interface ExpressLikeResponse {
  status(code: number): ExpressLikeResponse;
  send(body?: unknown): void;
}

export interface ExpressWebhookHandlerOptions {
  onError?: (error: unknown) => void | Promise<void>;
}

export interface BrowserTrackingResult {
  visitorId?: string;
  sessionId?: string;
}

export type InternalCreateCheckoutRequest = CreemCheckoutCreateRequest;

export type InternalCheckoutResponse = CreemCheckoutResponse;

export interface NormalizedTransaction {
  amount: number;
  currency: string;
  id: string;
  timestamp?: string;
}

export interface InternalCreemClient {
  createCheckout(
    request: InternalCreateCheckoutRequest
  ): Promise<InternalCheckoutResponse>;
  getTransactionById(
    transactionId: string
  ): Promise<unknown>;
}

export interface InternalDataFastClient {
  sendPayment(
    payload: DataFastPaymentPayload
  ): Promise<unknown>;
}

export interface CheckoutCompletedCustomer {
  id?: string;
  email?: string;
  name?: string;
}

export interface CheckoutCompletedOrder {
  id: string;
  amount: number;
  currency: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutCompletedSubscription {
  id?: string;
}

export interface CheckoutCompletedObject {
  order?: CheckoutCompletedOrder;
  customer?: CheckoutCompletedCustomer | string;
  metadata?: Record<string, unknown>;
  subscription?: CheckoutCompletedSubscription | string;
}

export interface CheckoutCompletedEvent {
  id?: string;
  eventType?: string;
  event_type?: string;
  object?: CheckoutCompletedObject;
}

export interface SubscriptionPaidCustomer {
  id?: string;
  email?: string;
  name?: string;
}

export interface SubscriptionPaidProduct {
  price?: number;
  currency?: string;
}

export interface SubscriptionPaidObject {
  customer?: SubscriptionPaidCustomer | string;
  metadata?: Record<string, unknown>;
  product?: SubscriptionPaidProduct;
  last_transaction_id?: string;
  lastTransactionId?: string;
  last_transaction_date?: string;
  lastTransactionDate?: string;
}

export interface SubscriptionPaidEvent {
  id?: string;
  eventType?: string;
  event_type?: string;
  object?: SubscriptionPaidObject;
}

export interface RefundCreatedCustomer {
  id?: string;
  email?: string;
  name?: string;
}

export interface RefundCreatedTransaction {
  id?: string;
  amount?: number;
  amount_paid?: number;
  amountPaid?: number;
  currency?: string;
  type?: string;
  subscription?: string | null;
  customer?: RefundCreatedCustomer | string;
  metadata?: Record<string, unknown>;
  created_at?: number | string;
  createdAt?: number | string;
}

export interface RefundCreatedObject {
  id?: string;
  refund_amount?: number;
  refundAmount?: number;
  refund_currency?: string;
  refundCurrency?: string;
  customer?: RefundCreatedCustomer | string;
  metadata?: Record<string, unknown>;
  created_at?: number | string;
  createdAt?: number | string;
  transaction?: RefundCreatedTransaction;
}

export interface RefundCreatedEvent {
  id?: string;
  eventType?: string;
  event_type?: string;
  created_at?: number | string;
  createdAt?: number | string;
  object?: RefundCreatedObject;
}

export interface WebhookHandlerDependencies {
  creemWebhookSecret: string;
  datafast: InternalDataFastClient;
  creem: InternalCreemClient;
  idempotencyStore?: IdempotencyStore;
  idempotencyInFlightTtlSeconds: number;
  idempotencyProcessedTtlSeconds: number;
  hydrateTransactionOnSubscriptionPaid: boolean;
  logger: LoggerLike;
}

export interface CheckoutDependencies {
  creem: InternalCreemClient;
  captureSessionId: boolean;
  strictTracking: boolean;
  logger: LoggerLike;
}
