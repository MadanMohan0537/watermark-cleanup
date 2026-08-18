import { z } from "zod";

export const analyzeRequestSchema = z.object({
  authorized: z.literal(true),
});

export const processRequestSchema = z.object({
  id: z.string().min(8),
  authorized: z.literal(true),
  regionIds: z.array(z.string()).default([]),
  textRemovals: z.array(z.string()).optional(),
});
