import { z } from "zod";

export const MAX_DOC_CHARS = 20000;

export const AuditRequestSchema = z.object({
  text: z
    .string({ required_error: "Document text is required." })
    .trim()
    .min(20, "Document is too short to audit (minimum 20 characters).")
    .max(MAX_DOC_CHARS, `Document is too long (maximum ${MAX_DOC_CHARS} characters).`),
});

const nullableText = z
  .string()
  .nullish()
  .transform((v) => {
    const t = v?.trim();
    return t ? t : null;
  });

export const ExtractedItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(["task", "pending_result"]).catch("task"),
  owner: nullableText,
  dueDate: nullableText,
  status: z.enum(["open", "in_progress", "completed", "unknown"]).catch("unknown"),
  dependencies: z.array(z.string()).nullish().transform((v) => v ?? []),
  evidence: nullableText,
  excerpt: z.string().min(1),
  resultReviewDocumented: z.boolean().nullish().transform((v) => v ?? false),
});

export const ExtractionSchema = z.object({
  items: z.array(ExtractedItemSchema).max(50),
});

export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;
