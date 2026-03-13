import {
  CreemDataFastError,
  type CreemDataFastOptions,
  type CreemSdkClientLike,
  type IdempotencyStore,
  DataFastRequestError,
  InvalidCreemSignatureError,
  MemoryIdempotencyStore,
  MissingTrackingError,
  createCreemDataFast
} from "creem-datafast";
import { Redis } from "@upstash/redis";
import { createUpstashIdempotencyStore } from "creem-datafast/idempotency/upstash";

const creemClient: CreemSdkClientLike = {
  checkouts: {
    async create() {
      return {
        id: "checkout_123",
        checkoutUrl: "https://example.com/checkout"
      };
    }
  },
  transactions: {
    async getById() {
      return { id: "txn_123" };
    }
  }
};

const options: CreemDataFastOptions = {
  creemClient,
  creemWebhookSecret: "creem_secret",
  datafastApiKey: "datafast_key"
};

const upstashStore: IdempotencyStore = createUpstashIdempotencyStore({
  async del() {
    return 1;
  },
  async set() {
    return "OK";
  }
});

void createCreemDataFast;
void CreemDataFastError;
void DataFastRequestError;
void InvalidCreemSignatureError;
void MemoryIdempotencyStore;
void MissingTrackingError;
void Redis;
void createUpstashIdempotencyStore;
void upstashStore;
void options;
