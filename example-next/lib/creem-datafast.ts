import { createCreemDataFast, type CreemDataFastOptions, type LoggerLike } from "creem-datafast";

const DATAFAST_URL = "https://datafa.st/api/v1/payments";

type ExampleConfig = {
  appBaseUrl: string;
  creemApiKey: string;
  creemWebhookSecret: string;
  datafastApiKey: string;
  productId: string;
  testMode: boolean;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createDevFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (process.env.NODE_ENV !== "production" && url === DATAFAST_URL) {
      console.info("[example-next] forwarding payload to DataFast", init?.body);
    }

    return baseFetch(input, init);
  };
}

function createLogger(): LoggerLike {
  return {
    debug(message, meta) {
      if (process.env.NODE_ENV !== "production") {
        console.debug(message, meta);
      }
    },
    info(message, meta) {
      if (process.env.NODE_ENV !== "production") {
        console.info(message, meta);
      }
    },
    warn(message, meta) {
      console.warn(message, meta);
    },
    error(message, meta) {
      console.error(message, meta);
    }
  };
}

export function getExampleConfig(): ExampleConfig {
  return {
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    creemApiKey: getRequiredEnv("CREEM_API_KEY"),
    creemWebhookSecret: getRequiredEnv("CREEM_WEBHOOK_SECRET"),
    datafastApiKey: getRequiredEnv("DATAFAST_API_KEY"),
    productId: getRequiredEnv("CREEM_PRODUCT_ID"),
    testMode: process.env.CREEM_TEST_MODE !== "false"
  };
}

export function getCreemDataFastClient() {
  const config = getExampleConfig();
  const options: CreemDataFastOptions = {
    creemApiKey: config.creemApiKey,
    creemWebhookSecret: config.creemWebhookSecret,
    datafastApiKey: config.datafastApiKey,
    fetch: createDevFetch(fetch),
    logger: createLogger(),
    testMode: config.testMode
  };

  return createCreemDataFast(options);
}
