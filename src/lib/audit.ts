import { applyRules, sortFindings } from "./rules";
import type { ActionItem, AuditResult } from "./types";

export function buildAudit(args: {
  title: string; items: ActionItem[]; sourceText?: string;
  source: "gemini" | "demo"; demoReason?: string;
}): AuditResult {
  return {
    id: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: args.title, source: args.source, demoReason: args.demoReason,
    createdAt: new Date().toISOString(), items: args.items,
    findings: sortFindings(applyRules(args.items, args.sourceText)),
  };
}

export function titleFrom(text: string): string {
  const first = text.split("\n").find((l) => l.trim()) ?? "Pasted document";
  return first.trim().slice(0, 60);
}
