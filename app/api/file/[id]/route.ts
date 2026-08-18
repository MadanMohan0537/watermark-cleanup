import { AppError } from "@/lib/errors";
import { jsonError } from "@/lib/security/http";
import { deleteJob, getJob } from "@/lib/storage/temp-store";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!getJob(id)) {
      throw new AppError("not_found", "That file is already gone.", 404);
    }
    deleteJob(id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
