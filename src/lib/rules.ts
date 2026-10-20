import type { ActionItem, Finding, RuleId, Severity } from "./types";

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** True when the excerpt appears verbatim (ignoring whitespace/case) in the source text. */
export function excerptInSource(excerpt: string, sourceText: string): boolean {
  return norm(sourceText).includes(norm(excerpt));
}

const NOTE = "Absence of documentation in this text does not prove the step was missed.";

function make(
  item: ActionItem, ruleId: RuleId, severity: Severity, title: string,
  explanation: string, verify: string[], sourceText?: string,
): Finding {
  return {
    id: `${item.id}:${ruleId}`, ruleId, severity, title,
    itemId: item.id, itemDescription: item.description,
    excerpt: item.excerpt,
    excerptVerified: sourceText === undefined ? true : excerptInSource(item.excerpt, sourceText),
    explanation: `${explanation} ${NOTE}`,
    verify,
  };
}

export function applyRules(items: ActionItem[], sourceText?: string): Finding[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: Finding[] = [];

  for (const it of items) {
    const done = it.status === "completed";

    if (!it.owner) {
      out.push(make(it, "MISSING_OWNER", it.kind === "pending_result" ? "high" : "medium",
        "No owner named",
        "The provided text does not name who is responsible for this item.",
        ["Check the full record for an assigned owner.", "If none exists, confirm who should own it."], sourceText));
    }
    if (!done && !it.dueDate) {
      out.push(make(it, "MISSING_DUE_DATE", "medium", "No due date stated",
        "The provided text does not give a due date or timeframe for this open item.",
        ["Look for a date or timeframe in the source record.", "Confirm the expected timeline with the owner."], sourceText));
    }
    if (done && !it.evidence) {
      out.push(make(it, "COMPLETED_NO_EVIDENCE", "medium", "Marked complete without evidence",
        "The item is described as complete, but the text cites no supporting evidence (e.g. a note, result or order).",
        ["Find the chart note, order or result that supports completion.", "If it exists, add a reference to the handoff."], sourceText));
    }
    if (!done) {
      const unresolved = it.dependencies.filter((d) => {
        const dep = byId.get(d);
        return !dep || dep.status !== "completed";
      });
      if (unresolved.length) {
        const names = unresolved.map((d) => byId.get(d)?.description ?? d);
        out.push(make(it, "UNRESOLVED_DEPENDENCY", "high", "Depends on an unresolved item",
          `This item depends on: ${names.join("; ")}. None of these are shown as completed in the provided text.`,
          ["Check the current status of each dependency.", "Confirm the dependency has an owner and due date."], sourceText));
      }
    }
    if (it.kind === "pending_result" && !it.resultReviewDocumented) {
      out.push(make(it, "RESULT_REVIEW_NOT_DOCUMENTED", "high", "Result review not documented here",
        "This pending result has no documented review in the provided text.",
        ["Check whether the result has returned and who reviewed it.", "Confirm any needed patient follow-up was recorded."], sourceText));
    }
  }
  return out;
}

const ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
export const sortFindings = (f: Finding[]) => [...f].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
