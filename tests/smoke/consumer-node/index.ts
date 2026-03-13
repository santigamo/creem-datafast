import {
  CreemDataFastError,
  type CreemDataFastOptions,
  type CreemSdkClientLike,
  DataFastRequestError,
  InvalidCreemSignatureError,
  MemoryIdempotencyStore,
  MissingTrackingError,
  createCreemDataFast
} from "creem-datafast";

const creemClient: CreemSdkClientLike = {
  checkouts: {
    async create() {
      return { id: "checkout_123", checkoutUrl: "https://example.com/checkout" };
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

void createCreemDataFast;
void CreemDataFastError;
void DataFastRequestError;
void InvalidCreemSignatureError;
void MemoryIdempotencyStore;
void MissingTrackingError;
void options;
