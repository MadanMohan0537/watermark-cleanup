import { classifyUpload } from "@/lib/security/classify";
import { jsonError, requireAuthorization } from "@/lib/security/http";
import { consumeRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/errors";
import { analyzeFile } from "@/lib/processors";
import { saveJob, updateJob } from "@/lib/storage/temp-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!consumeRateLimit(getClientKey(request.headers), 2)) {
      throw new AppError("rate_limited", "Too many requests. Wait a moment and try again.", 429);
    }
    const form = await request.formData();
    requireAuthorization(form.get("authorized") === "true" || form.get("authorized") === "on");
    const uploaded = form.get("file");
    if (!(uploaded instanceof File)) {
      throw new AppError("invalid_request", "Upload a file to analyze.");
    }
    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    const file = classifyUpload(bytes, uploaded.name || "upload");
    saveJob(file);
    const analysis = await analyzeFile(file);
    updateJob(file.id, { analysis });
    return Response.json({
      id: file.id,
      mediaKind: file.mediaKind,
      mimeType: file.mimeType,
      size: file.size,
      analysis,
    });
  } catch (error) {
    return jsonError(error);
  }
}
