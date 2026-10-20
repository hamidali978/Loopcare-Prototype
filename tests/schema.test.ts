import { describe, expect, it } from "vitest";
import { AuditRequestSchema, ExtractionSchema, MAX_DOC_CHARS } from "@/lib/schema";
import { DEMO_DOCS, SAMPLE_AUDITS } from "@/lib/demo";
import { excerptInSource } from "@/lib/rules";

describe("request validation", () => {
  it("accepts and trims valid text", () => expect(AuditRequestSchema.parse({ text: "  " + "a".repeat(30) + " " }).text).toHaveLength(30));
  it("rejects short, long and missing text", () => {
    expect(AuditRequestSchema.safeParse({ text: "hi" }).success).toBe(false);
    expect(AuditRequestSchema.safeParse({ text: "a".repeat(MAX_DOC_CHARS + 1) }).success).toBe(false);
    expect(AuditRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("model output validation", () => {
  it("normalises lenient model output", () => {
    const r = ExtractionSchema.parse({ items: [{ id: "a1", description: "d", excerpt: "e", owner: "  ", status: "weird", kind: "?", dependencies: null }] });
    expect(r.items[0]).toMatchObject({ owner: null, status: "unknown", kind: "task", dependencies: [], resultReviewDocumented: false });
  });
  it("rejects items without an excerpt", () => {
    expect(ExtractionSchema.safeParse({ items: [{ id: "a1", description: "d" }] }).success).toBe(false);
  });
});

describe("demo data", () => {
  it("every demo excerpt appears verbatim in its document", () => {
    for (const d of DEMO_DOCS) for (const i of d.items) expect(excerptInSource(i.excerpt, d.text)).toBe(true);
  });
  it("sample audits produce findings with verified excerpts", () => {
    for (const a of SAMPLE_AUDITS) {
      expect(a.findings.length).toBeGreaterThan(0);
      expect(a.findings.every((f) => f.excerptVerified)).toBe(true);
    }
  });
});
