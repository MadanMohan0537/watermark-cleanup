import { AppError } from "@/lib/errors";
import { jsonError } from "@/lib/security/http";
import { getJob } from "@/lib/storage/temp-store";
import { toArrayBuffer } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = getJob(id);
    if (!job?.result) {
      throw new AppError("not_found", "No cleaned file is available for this id.", 404);
    }
    return new Response(toArrayBuffer(job.result.bytes), {
      headers: {
        "content-type": job.result.mimeType,
        "content-disposition": `attachment; filename="${job.result.filename}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
