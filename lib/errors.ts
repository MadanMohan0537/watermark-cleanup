export type AppErrorCode =
  | "unsupported_file"
  | "corrupted_file"
  | "encrypted_pdf"
  | "oversized_upload"
  | "no_watermark"
  | "low_confidence"
  | "processing_failure"
  | "reconstruction_failure"
  | "unauthorized"
  | "rate_limited"
  | "not_found"
  | "invalid_request";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
