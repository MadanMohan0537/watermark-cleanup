import type { AnalyzeResult, ClassifiedFile, ProcessResult } from "@/lib/types";

export interface StoredJob {
  file: ClassifiedFile;
  analysis?: AnalyzeResult;
  result?: ProcessResult;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const jobs = new Map<string, StoredJob>();

function sweep(now = Date.now()) {
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) jobs.delete(id);
  }
}

export function saveJob(file: ClassifiedFile) {
  sweep();
  jobs.set(file.id, { file, createdAt: Date.now() });
  return file.id;
}

export function getJob(id: string) {
  sweep();
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<StoredJob>) {
  const current = getJob(id);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  jobs.set(id, next);
  return next;
}

export function deleteJob(id: string) {
  sweep();
  return jobs.delete(id);
}
