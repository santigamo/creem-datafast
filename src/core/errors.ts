export class CreemDataFastError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidCreemSignatureError extends CreemDataFastError {}

export class MissingTrackingError extends CreemDataFastError {}

export class UnsupportedWebhookEventError extends CreemDataFastError {}

export class DataFastRequestError extends CreemDataFastError {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class TransactionHydrationError extends CreemDataFastError {}
