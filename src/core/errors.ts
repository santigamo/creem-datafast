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
    public readonly details: {
      status?: number;
      statusText?: string;
      requestId?: string;
      retryable: boolean;
      responseBody?: unknown;
    },
    errorOptions?: ErrorOptions
  ) {
    super(message, errorOptions);
  }

  get status(): number | undefined {
    return this.details.status;
  }

  get statusText(): string | undefined {
    return this.details.statusText;
  }

  get requestId(): string | undefined {
    return this.details.requestId;
  }

  get retryable(): boolean {
    return this.details.retryable;
  }

  get responseBody(): unknown {
    return this.details.responseBody;
  }
}

export class TransactionHydrationError extends CreemDataFastError {}
