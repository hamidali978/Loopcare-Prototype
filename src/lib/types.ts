export type Status = "open" | "in_progress" | "completed" | "unknown";
export type ItemKind = "task" | "pending_result";
export type Severity = "high" | "medium" | "low";
export type RuleId =
  | "MISSING_OWNER" | "MISSING_DUE_DATE" | "COMPLETED_NO_EVIDENCE"
  | "UNRESOLVED_DEPENDENCY" | "RESULT_REVIEW_NOT_DOCUMENTED";

export interface ActionItem {
  id: string;
  description: string;
  kind: ItemKind;
  owner: string | null;
  dueDate: string | null;
  status: Status;
  dependencies: string[];
  evidence: string | null;
  excerpt: string;
  resultReviewDocumented: boolean;
}

export interface Finding {
  id: string;
  ruleId: RuleId;
  severity: Severity;
  title: string;
  itemId: string;
  itemDescription: string;
  excerpt: string;
  excerptVerified: boolean;
  explanation: string;
  verify: string[];
}

export interface AuditResult {
  id: string;
  title: string;
  source: "gemini" | "demo";
  demoReason?: string;
  createdAt: string;
  items: ActionItem[];
  findings: Finding[];
}
