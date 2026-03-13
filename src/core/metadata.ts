import type { CheckoutMetadata, DataFastTracking } from "./types.js";

interface MergeTrackingOptions {
  captureSessionId?: boolean;
  preferTracking?: boolean;
}

function asMetadataString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return undefined;
}

export function readTrackingFromMetadata(metadata?: CheckoutMetadata): DataFastTracking {
  if (!metadata) {
    return {};
  }

  return {
    visitorId: asMetadataString(metadata.datafast_visitor_id),
    sessionId: asMetadataString(metadata.datafast_session_id)
  };
}

export function mergeTrackingIntoMetadata(
  metadata: CheckoutMetadata | undefined,
  tracking: DataFastTracking,
  options: MergeTrackingOptions = {}
): CheckoutMetadata {
  const result: CheckoutMetadata = { ...(metadata ?? {}) };
  const captureSessionId = options.captureSessionId ?? true;
  const preferTracking = options.preferTracking ?? false;

  if (tracking.visitorId && (preferTracking || result.datafast_visitor_id === undefined)) {
    result.datafast_visitor_id = tracking.visitorId;
  }

  if (
    captureSessionId &&
    tracking.sessionId &&
    (preferTracking || result.datafast_session_id === undefined)
  ) {
    result.datafast_session_id = tracking.sessionId;
  }

  return result;
}
