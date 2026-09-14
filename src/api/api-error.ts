export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly statusCode: number;
  };
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
    };
  }
}
