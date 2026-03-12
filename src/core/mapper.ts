import { minorToMajor } from "./amount.js";
import { CreemDataFastError } from "./errors.js";
import type {
  CheckoutCompletedCustomer,
  CheckoutCompletedEvent,
  CheckoutMetadata,
  DataFastPaymentPayload,
  NormalizedTransaction,
  SubscriptionPaidCustomer,
  SubscriptionPaidEvent
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readMetadataValue(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toCustomer(value: CheckoutCompletedCustomer | SubscriptionPaidCustomer | string | undefined) {
  return typeof value === "object" && value !== null ? value : undefined;
}

function withOptionalFields(
  base: DataFastPaymentPayload,
  fields: Partial<DataFastPaymentPayload>
): DataFastPaymentPayload {
  const result: DataFastPaymentPayload = { ...base };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      result[key as keyof DataFastPaymentPayload] = value as never;
    }
  }

  return result;
}

function getCheckoutMetadata(event: CheckoutCompletedEvent): CheckoutMetadata | undefined {
  return asRecord(event.object?.metadata) as CheckoutMetadata | undefined
    ?? asRecord(event.object?.order?.metadata) as CheckoutMetadata | undefined;
}

function getSubscriptionMetadata(event: SubscriptionPaidEvent): CheckoutMetadata | undefined {
  return asRecord(event.object?.metadata) as CheckoutMetadata | undefined;
}

export function mapCheckoutCompletedToPayment(
  event: CheckoutCompletedEvent
): DataFastPaymentPayload {
  const order = event.object?.order;
  if (!order) {
    throw new CreemDataFastError("checkout.completed payload is missing order.");
  }

  const customer = toCustomer(event.object?.customer);
  const metadata = getCheckoutMetadata(event);

  return withOptionalFields(
    {
      amount: minorToMajor(order.amount, order.currency),
      currency: order.currency,
      transaction_id: order.id,
      renewal: false
    },
    {
      customer_id: customer?.id,
      datafast_visitor_id: readMetadataValue(metadata, "datafast_visitor_id"),
      email: customer?.email,
      name: customer?.name
    }
  );
}

export function mapSubscriptionPaidToPayment(
  event: SubscriptionPaidEvent,
  transaction?: NormalizedTransaction
): DataFastPaymentPayload {
  const customer = toCustomer(event.object?.customer);
  const metadata = getSubscriptionMetadata(event);
  const product = event.object?.product;
  const transactionId = transaction?.id
    ?? event.object?.last_transaction_id
    ?? event.object?.lastTransactionId;

  if (!transactionId) {
    throw new CreemDataFastError("subscription.paid payload is missing last_transaction_id.");
  }

  if (!transaction) {
    if (!product || typeof product.price !== "number" || typeof product.currency !== "string") {
      throw new CreemDataFastError("subscription.paid payload is missing product pricing for fallback mapping.");
    }
  }

  return withOptionalFields(
    {
      amount: transaction
        ? minorToMajor(transaction.amount, transaction.currency)
        : minorToMajor(product!.price!, product!.currency!),
      currency: transaction?.currency ?? product!.currency!,
      transaction_id: transactionId,
      renewal: true
    },
    {
      customer_id: customer?.id,
      datafast_visitor_id: readMetadataValue(metadata, "datafast_visitor_id"),
      email: customer?.email,
      name: customer?.name,
      timestamp: transaction?.timestamp
        ?? event.object?.last_transaction_date
        ?? event.object?.lastTransactionDate
    }
  );
}
