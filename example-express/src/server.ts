import { createExampleExpressApp } from "./app.js";
import { getExampleConfig } from "./creem-datafast.js";

const config = getExampleConfig();
const app = createExampleExpressApp();

app.listen(config.port, () => {
  console.info(`[example-express] listening on ${config.appBaseUrl}`);
  console.info("[example-express] checkout endpoint POST /api/checkout");
  console.info("[example-express] webhook endpoint POST /api/webhook/creem");
});
