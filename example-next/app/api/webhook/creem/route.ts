import { createNextWebhookHandler } from "creem-datafast/next";

import { getCreemDataFastClient } from "../../../../lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return createNextWebhookHandler(getCreemDataFastClient())(request);
}
