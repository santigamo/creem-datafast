import { InvalidCreemSignatureError, UnsupportedWebhookEventError } from "./errors.js";
import { markEventProcessed, resolveIdempotencyStore, shouldProcessEvent } from "./idempotency.js";
import {
  mapCheckoutCompletedToPayment,
  mapRefundCreatedToPayment,
  mapSubscriptionPaidToPayment
} from "./mapper.js";
import { extractHeader, verifyCreemSignature } from "./signature.js";
import { hydrateTransaction } from "./transaction.js";
import type {
  CheckoutCompletedEvent,
  HandleWebhookParams,
  HandleWebhookResult,
  RefundCreatedEvent,
  SubscriptionPaidEvent,
  SupportedWebhookEvent,
  WebhookHandlerDependencies
} from "./types.js";

function getEventType(payload: Record<string, unknown>): string | undefined {
  const eventType = payload.eventType ?? payload.event_type;
  return typeof eventType === "string" ? eventType : undefined;
}

function getEventId(payload: Record<string, unknown>): string | undefined {
  return typeof payload.id === "string" ? payload.id : undefined;
}

function isSupportedWebhookEvent(eventType: string): eventType is SupportedWebhookEvent {
  return eventType === "checkout.completed"
    || eventType === "subscription.paid"
    || eventType === "refund.created";
}

function parseWebhookPayload(rawBody: string): Record<string, unknown> {
  return JSON.parse(rawBody) as Record<string, unknown>;
}

export async function handleWebhook(
  params: HandleWebhookParams,
  dependencies: WebhookHandlerDependencies
): Promise<HandleWebhookResult> {
  const signature = extractHeader(params.headers, "creem-signature");
  if (!signature) {
    throw new InvalidCreemSignatureError("Missing creem-signature header.");
  }

  if (!verifyCreemSignature(params.rawBody, dependencies.creemWebhookSecret, signature)) {
    throw new InvalidCreemSignatureError("Invalid Creem webhook signature.");
  }

  const payload = parseWebhookPayload(params.rawBody);
  const eventType = getEventType(payload);
  const eventId = getEventId(payload);

  if (!eventType) {
    throw new UnsupportedWebhookEventError("Webhook payload is missing eventType.");
  }

  if (!isSupportedWebhookEvent(eventType)) {
    return {
      ok: true,
      ignored: true,
      eventId,
      eventType,
      reason: "unsupported_event"
    };
  }

  if (!eventId) {
    throw new UnsupportedWebhookEventError("Supported webhook payload is missing id.");
  }

  const idempotencyStore = resolveIdempotencyStore(dependencies.idempotencyStore);
  const canProcess = await shouldProcessEvent(eventId, idempotencyStore);
  if (!canProcess) {
    return {
      ok: true,
      ignored: true,
      eventId,
      eventType,
      reason: "duplicate_event"
    };
  }

  const normalizedPayload = eventType === "checkout.completed"
    ? mapCheckoutCompletedToPayment(payload as CheckoutCompletedEvent)
    : eventType === "refund.created"
      ? mapRefundCreatedToPayment(payload as RefundCreatedEvent)
      : await (async () => {
        const subscriptionPayload = payload as SubscriptionPaidEvent;
        const lastTransactionId = subscriptionPayload.object?.last_transaction_id
          ?? subscriptionPayload.object?.lastTransactionId;

        if (
          dependencies.hydrateTransactionOnSubscriptionPaid &&
          lastTransactionId
        ) {
          try {
            const transaction = await hydrateTransaction(dependencies.creem, lastTransactionId);
            return mapSubscriptionPaidToPayment(subscriptionPayload, transaction);
          } catch (error) {
            dependencies.logger.warn("Falling back to subscription product pricing after transaction hydration failure.", {
              error,
              lastTransactionId
            });
          }
        }

        return mapSubscriptionPaidToPayment(subscriptionPayload);
      })();

  const datafastResponse = await dependencies.datafast.sendPayment(normalizedPayload);
  await markEventProcessed(
    eventId,
    idempotencyStore,
    dependencies.idempotencyTtlSeconds
  );

  return {
    ok: true,
    ignored: false,
    eventId,
    eventType,
    deduplicated: false,
    payload: normalizedPayload,
    datafastResponse
  };
}
