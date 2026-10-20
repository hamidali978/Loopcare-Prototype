import { describe, expect, it } from "vitest";
import { applyRules, excerptInSource } from "@/lib/rules";
import type { ActionItem } from "@/lib/types";

const item = (o: Partial<ActionItem> = {}): ActionItem => ({
  id: "x1", description: "Task", kind: "task", owner: "Dr. A", dueDate: "2026-11-01", status: "open",
  dependencies: [], evidence: null, excerpt: "Do the task", resultReviewDocumented: false, ...o,
});
const ids = (items: ActionItem[]) => applyRules(items).map((f) => f.ruleId);

describe("audit rules", () => {
  it("flags nothing for a complete open item", () => expect(ids([item()])).toEqual([]));
  it("flags missing owner", () => expect(ids([item({ owner: null })])).toContain("MISSING_OWNER"));
  it("flags missing due date on open items only", () => {
    expect(ids([item({ dueDate: null })])).toContain("MISSING_DUE_DATE");
    expect(ids([item({ dueDate: null, status: "completed", evidence: "note" })])).not.toContain("MISSING_DUE_DATE");
  });
  it("flags completion without evidence, not with it", () => {
    expect(ids([item({ status: "completed" })])).toContain("COMPLETED_NO_EVIDENCE");
    expect(ids([item({ status: "completed", evidence: "chart note" })])).toEqual([]);
  });
  it("flags unresolved dependencies (open, missing, or free-text)", () => {
    const dep = item({ id: "d1", status: "in_progress" });
    expect(ids([item({ dependencies: ["d1"] }), dep])).toContain("UNRESOLVED_DEPENDENCY");
    expect(ids([item({ dependencies: ["INR result"] })])).toContain("UNRESOLVED_DEPENDENCY");
  });
  it("does not flag dependencies that are completed", () => {
    const dep = item({ id: "d1", status: "completed", evidence: "note" });
    expect(ids([item({ dependencies: ["d1"] }), dep])).toEqual([]);
  });
  it("flags pending results without documented review", () => {
    expect(ids([item({ kind: "pending_result" })])).toContain("RESULT_REVIEW_NOT_DOCUMENTED");
    expect(ids([item({ kind: "pending_result", resultReviewDocumented: true })])).toEqual([]);
  });
  it("never presents absence of documentation as proof of failure", () => {
    for (const f of applyRules([item({ owner: null, dueDate: null, kind: "pending_result", status: "completed" })])) {
      expect(f.explanation).toMatch(/does not prove/i);
      expect(f.verify.length).toBeGreaterThan(0);
    }
  });
  it("marks excerpts that are not in the source", () => {
    const f = applyRules([item({ owner: null })], "completely different text");
    expect(f[0].excerptVerified).toBe(false);
    expect(excerptInSource("do  the TASK", "Please Do the task now")).toBe(true);
  });
});
