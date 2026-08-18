import { describe, expect, it } from "vitest";
import { applyTextRemovals, proposeTextCleanup } from "@/lib/text-processing";
import { textProcessor } from "@/lib/text-processing/processor";
import { classifyUpload } from "@/lib/security/classify";
import { sampleTextDocument } from "./helpers/fixtures";

describe("text processing", () => {
  it("proposes repeated overlay removal without deleting anything yet", async () => {
    const proposal = proposeTextCleanup(sampleTextDocument);
    expect(proposal.removals.some((item) => item.text === "CONFIDENTIAL COPY")).toBe(true);
    expect(proposal.original).toContain("CONFIDENTIAL COPY");
    const file = classifyUpload(new TextEncoder().encode(sampleTextDocument), "notes.txt");
    const analysis = await textProcessor.analyze(file);
    expect(analysis.regions.every((region) => region.action === "keep")).toBe(true);
    expect(analysis.textPreview).toContain("Meeting notes");
  });

  it("removes only user-confirmed overlay lines", async () => {
    const file = classifyUpload(new TextEncoder().encode(sampleTextDocument), "notes.txt");
    const analysis = await textProcessor.analyze(file);
    const ids = analysis.regions.map((region) => region.id);
    const result = await textProcessor.process(file, { jobId: file.id, regionIds: ids }, analysis);
    const text = new TextDecoder().decode(result.bytes);
    expect(text).not.toContain("CONFIDENTIAL COPY");
    expect(text).toContain("Meeting notes");
    expect(text).toContain("product roadmap");
  });

  it("never silently deletes unmatched body text", () => {
    const source = "Just a letter to a friend.\nSecond paragraph stays.";
    const proposal = proposeTextCleanup(source);
    expect(proposal.removals).toHaveLength(0);
    expect(applyTextRemovals(source, [])).toContain("Just a letter");
  });
});
