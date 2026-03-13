import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCreemDataFast, type CreemDataFastOptions, type LoggerLike } from "creem-datafast";

const DATAFAST_URL = "https://datafa.st/api/v1/payments";
const EXAMPLE_ROOT = fileURLToPath(new URL("../", import.meta.url));

type ExampleConfig = {
  appBaseUrl: string;
  creemApiKey: string;
  creemWebhookSecret: string;
  datafastApiKey: string;
  datafastDomain?: string;
  datafastWebsiteId?: string;
  port: number;
  productId: string;
  testMode: boolean;
};

let envLoaded = false;

function loadLocalEnv() {
  if (envLoaded) {
    return;
  }

  envLoaded = true;

  for (const filename of [".env.local", ".env"]) {
    const filePath = join(EXAMPLE_ROOT, filename);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/gu, "");

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function getRequiredEnv(name: string): string {
  loadLocalEnv();

  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createDevFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (process.env.NODE_ENV !== "production" && url === DATAFAST_URL) {
      console.info("[example-express] forwarding payload to DataFast", init?.body);
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
  loadLocalEnv();

  return {
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    creemApiKey: getRequiredEnv("CREEM_API_KEY"),
    creemWebhookSecret: getRequiredEnv("CREEM_WEBHOOK_SECRET"),
    datafastApiKey: getRequiredEnv("DATAFAST_API_KEY"),
    datafastDomain: process.env.DATAFAST_DOMAIN,
    datafastWebsiteId: process.env.DATAFAST_WEBSITE_ID,
    port: Number(process.env.PORT ?? "3000"),
    productId: getRequiredEnv("CREEM_PRODUCT_ID"),
    testMode: process.env.CREEM_TEST_MODE !== "false"
  };
}

export function getOptionalExampleDataFastScriptConfig() {
  loadLocalEnv();

  const websiteId = process.env.DATAFAST_WEBSITE_ID;
  if (!websiteId) {
    return undefined;
  }

  return {
    domain: process.env.DATAFAST_DOMAIN,
    websiteId
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
