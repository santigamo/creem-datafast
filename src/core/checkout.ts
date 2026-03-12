import { getHeaderValue } from "./headers.js";
import { mergeTrackingIntoMetadata, readTrackingFromMetadata } from "./metadata.js";
import { readTrackingFromCookieHeader } from "./cookies.js";
import { CreemDataFastError, MissingTrackingError } from "./errors.js";
import type {
  CheckoutDependencies,
  CreateCheckoutContext,
  CreateCheckoutParams,
  CreateCheckoutResult,
  DataFastTracking
} from "./types.js";

function hasExplicitTracking(tracking?: DataFastTracking): boolean {
  return Boolean(tracking?.visitorId || tracking?.sessionId);
}

function resolveTracking(
  explicit: DataFastTracking | undefined,
  metadataTracking: DataFastTracking,
  cookieTracking: DataFastTracking,
  captureSessionId: boolean
): DataFastTracking {
  return {
    visitorId: explicit?.visitorId ?? metadataTracking.visitorId ?? cookieTracking.visitorId,
    sessionId: captureSessionId
      ? explicit?.sessionId ?? metadataTracking.sessionId ?? cookieTracking.sessionId
      : undefined
  };
}

function resolveCookieHeader(context?: CreateCheckoutContext): string | undefined {
  if (context?.request) {
    return getHeaderValue(context.request.headers, "cookie");
  }

  return context?.cookieHeader;
}

export async function createCheckout(
  params: CreateCheckoutParams,
  context: CreateCheckoutContext | undefined,
  dependencies: CheckoutDependencies
): Promise<CreateCheckoutResult> {
  const cookieHeader = resolveCookieHeader(context);
  const cookieTracking = readTrackingFromCookieHeader(cookieHeader);
  const metadataTracking = readTrackingFromMetadata(params.metadata);
  const tracking = resolveTracking(
    params.tracking,
    metadataTracking,
    cookieTracking,
    dependencies.captureSessionId
  );

  const strictTracking = context?.strictTracking ?? dependencies.strictTracking;
  if (strictTracking && !tracking.visitorId) {
    throw new MissingTrackingError("Missing datafast_visitor_id while strict tracking is enabled.");
  }

  if (!tracking.visitorId) {
    dependencies.logger.warn("Creating Creem checkout without DataFast visitor tracking.");
  }

  const finalMetadata = mergeTrackingIntoMetadata(params.metadata, tracking, {
    captureSessionId: dependencies.captureSessionId,
    preferTracking: hasExplicitTracking(params.tracking)
  });

  const raw = await dependencies.creem.createCheckout({
    productId: params.productId,
    successUrl: params.successUrl,
    requestId: params.requestId,
    units: params.units,
    discountCode: params.discountCode,
    customer: params.customer,
    customFields: params.customFields,
    metadata: finalMetadata
  });

  const checkoutId = raw.id;
  const checkoutUrl = raw.checkoutUrl ?? raw.checkout_url;

  if (typeof checkoutId !== "string" || typeof checkoutUrl !== "string") {
    throw new CreemDataFastError("Creem checkout response is missing id or checkoutUrl.");
  }

  return {
    checkoutId,
    checkoutUrl,
    injectedTracking: tracking,
    finalMetadata,
    raw
  };
}
