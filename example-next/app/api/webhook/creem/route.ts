import { createNextWebhookHandler } from "creem-datafast/next";
import type { CreemDataFastClient } from "creem-datafast";

import { getCreemDataFastClient } from "../../../../lib/creem-datafast";

export const runtime = "nodejs";

const client: CreemDataFastClient = {
  createCheckout(params, context) {
    return getCreemDataFastClient().createCheckout(params, context);
  },
  handleWebhook(params) {
    return getCreemDataFastClient().handleWebhook(params);
  },
  verifyWebhookSignature(rawBody, headers) {
    return getCreemDataFastClient().verifyWebhookSignature(rawBody, headers);
  }
};

export const POST = createNextWebhookHandler(client);
