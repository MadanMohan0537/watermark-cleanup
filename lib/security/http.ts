import { AppError, isAppError } from "@/lib/errors";

export function jsonError(error: unknown) {
  if (isAppError(error)) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json(
    {
      error: "processing_failure",
      message: "Processing failed. The original file was not modified.",
    },
    { status: 500 },
  );
}

export function requireAuthorization(value: unknown) {
  if (value !== true && value !== "true") {
    throw new AppError(
      "unauthorized",
      "Confirm that you own this content or have permission to modify it.",
      403,
    );
  }
}
