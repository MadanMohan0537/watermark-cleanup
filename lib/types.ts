export type MediaKind = "image" | "pdf" | "text" | "video" | "unsupported";

export type RegionKind =
  | "badge"
  | "overlay"
  | "text"
  | "pattern"
  | "translucent"
  | "diagonal"
  | "timestamp"
  | "manual";

export type RegionAction = "keep" | "remove";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedRegion {
  id: string;
  kind: RegionKind;
  confidence: number;
  bbox: BoundingBox;
  pageIndex?: number;
  label: string;
  action: RegionAction;
  text?: string;
  strategy: string;
}

export interface ClassifiedFile {
  id: string;
  bytes: Uint8Array;
  mimeType: string;
  mediaKind: MediaKind;
  originalName: string;
  sanitizedName: string;
  size: number;
}

export interface AnalyzeWarning {
  code:
    | "no_watermark"
    | "low_confidence"
    | "encrypted_pdf"
    | "partial"
    | "browser_decode_required";
  message: string;
}

export interface AnalyzeResult {
  jobId: string;
  mediaKind: MediaKind;
  mimeType: string;
  width?: number;
  height?: number;
  pageCount?: number;
  regions: DetectedRegion[];
  warnings: AnalyzeWarning[];
  textPreview?: string;
  proposedText?: string;
}

export interface ProcessPlan {
  jobId: string;
  regionIds: string[];
  mask?: Uint8Array;
  maskWidth?: number;
  maskHeight?: number;
  pageMasks?: Array<{ pageIndex: number; mask: Uint8Array; width: number; height: number }>;
  textRemovals?: string[];
}

export interface ProcessResult {
  jobId: string;
  mediaKind: MediaKind;
  mimeType: string;
  filename: string;
  bytes: Uint8Array;
  warnings: AnalyzeWarning[];
  residualDetected: boolean;
}

export interface AnalyzeOptions {
  includeLowConfidence?: boolean;
  ocr?: boolean;
}

export interface Processor {
  kind: MediaKind;
  canHandle(file: ClassifiedFile): boolean;
  analyze(file: ClassifiedFile, options?: AnalyzeOptions): Promise<AnalyzeResult>;
  process(file: ClassifiedFile, plan: ProcessPlan, analysis: AnalyzeResult): Promise<ProcessResult>;
}
