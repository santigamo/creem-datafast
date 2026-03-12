import type { DataFastTracking } from "./types.js";

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    cookies[key] = decodeCookieValue(value);
  }

  return cookies;
}

export function readTrackingFromCookieHeader(cookieHeader?: string): DataFastTracking {
  if (!cookieHeader) {
    return {};
  }

  const cookies = parseCookieHeader(cookieHeader);

  return {
    visitorId: cookies.datafast_visitor_id,
    sessionId: cookies.datafast_session_id
  };
}
