import { describe, expect, it } from "vitest";
import { createSamplePdf, pdfProcessor } from "@/lib/pdf-processing";
import { classifyUpload } from "@/lib/security/classify";
import { AppError } from "@/lib/errors";

describe("pdf processing", () => {
  it("detects overlay text on a multi-page pdf and keeps body text", async () => {
    const bytes = await createSamplePdf(3, "CONFIDENTIAL");
    const file = classifyUpload(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), "doc.pdf");
    const analysis = await pdfProcessor.analyze(file);
    expect(analysis.pageCount).toBe(3);
    expect(analysis.regions.length).toBeGreaterThan(0);
    const ids = analysis.regions.map((region) => region.id);
    const result = await pdfProcessor.process(file, { jobId: file.id, regionIds: ids }, analysis);
    expect(result.mimeType).toBe("application/pdf");
    const cleaned = await pdfProcessor.analyze({
      ...file,
      id: "cleaned",
      bytes: result.bytes,
    });
    expect(cleaned.regions.every((region) => region.text !== "CONFIDENTIAL")).toBe(true);
  });

  it("rejects encrypted pdfs", async () => {
    const encrypted = new TextEncoder().encode(`%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 3 0 R /Encrypt 2 0 R >>endobj
2 0 obj<< /Filter /Standard /V 1 /R 2 /O (n) /U (n) /P -4 >>endobj
3 0 obj<< /Type /Pages /Count 0 /Kids [] >>endobj
trailer<< /Root 1 0 R /Encrypt 2 0 R >>
%%EOF`);
    const file = classifyUpload(encrypted, "secret.pdf");
    await expect(pdfProcessor.analyze(file)).rejects.toBeInstanceOf(AppError);
  });
});
