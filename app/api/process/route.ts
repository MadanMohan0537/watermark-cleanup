import { AppError } from "@/lib/errors";
import { jsonError, requireAuthorization } from "@/lib/security/http";
import { consumeRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { processFile } from "@/lib/processors";
import { getJob, updateJob } from "@/lib/storage/temp-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!consumeRateLimit(getClientKey(request.headers), 3)) {
      throw new AppError("rate_limited", "Too many requests. Wait a moment and try again.", 429);
    }
    const body = await request.json();
    requireAuthorization(body.authorized);
    const job = getJob(String(body.id ?? ""));
    if (!job?.analysis) {
      throw new AppError("not_found", "That file is no longer available. Upload it again.", 404);
    }
    const regionIds = Array.isArray(body.regionIds) ? body.regionIds.map(String) : [];
    const result = await processFile(
      job.file,
      { jobId: job.file.id, regionIds, textRemovals: body.textRemovals },
      job.analysis,
    );
    updateJob(job.file.id, { result });
    return Response.json({
      id: job.file.id,
      filename: result.filename,
      mimeType: result.mimeType,
      residualDetected: result.residualDetected,
      warnings: result.warnings,
      size: result.bytes.byteLength,
    });
  } catch (error) {
    return jsonError(error);
  }
}
