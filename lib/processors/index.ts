import { AppError } from "@/lib/errors";
import { imageProcessor } from "@/lib/image-processing";
import { pdfProcessor } from "@/lib/pdf-processing";
import { textProcessor } from "@/lib/text-processing/processor";
import type { AnalyzeOptions, AnalyzeResult, ClassifiedFile, ProcessPlan, ProcessResult, Processor } from "@/lib/types";

const processors: Processor[] = [imageProcessor, pdfProcessor, textProcessor];

export function processorFor(file: ClassifiedFile): Processor {
  const found = processors.find((processor) => processor.canHandle(file));
  if (!found) {
    throw new AppError("unsupported_file", "No processor is registered for this file type yet.");
  }
  return found;
}

export async function analyzeFile(file: ClassifiedFile, options?: AnalyzeOptions): Promise<AnalyzeResult> {
  return processorFor(file).analyze(file, options);
}

export async function processFile(
  file: ClassifiedFile,
  plan: ProcessPlan,
  analysis: AnalyzeResult,
): Promise<ProcessResult> {
  return processorFor(file).process(file, plan, analysis);
}
