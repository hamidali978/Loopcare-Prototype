import { buildAudit } from "./audit";
import type { ActionItem, AuditResult } from "./types";

export interface DemoDoc { title: string; text: string; items: ActionItem[] }

const t1 = `Synthetic discharge summary. Patient A (fictional), 67, admitted for community-acquired pneumonia.
Follow-up plan:
1. Repeat chest X-ray in 6 weeks to confirm resolution. Owner: PCP Dr. Example. Due: 2026-12-01.
2. Blood culture result pending at discharge; review the final result and call the patient if positive.
3. Medication reconciliation completed by pharmacy on 2026-10-12; reconciliation note filed in chart.
4. Home oxygen setup to be arranged by case management once insurance authorization is approved. Owner: Case Mgmt. Due: 2026-10-15.
5. Insurance authorization for home oxygen submitted, awaiting payer response. Owner: Billing Office.
6. Cardiology referral completed per patient report.`;

const t2 = `Synthetic SNF transfer handoff (fictional patient B).
- Hemoglobin A1c result pending from lab; ordering clinician to review when available. Owner: Dr. Sample. Due: 2026-10-30.
- Wound care nurse to reassess sacral wound weekly. Owner: Nurse Example. Due: 2026-10-27. Status: in progress.
- Physical therapy evaluation completed 2026-10-14, see PT note #4412.
- Warfarin dose adjustment depends on INR result. Owner: Anticoag Clinic.`;

const base = { dependencies: [] as string[], evidence: null, resultReviewDocumented: false };

export const DEMO_DOCS: DemoDoc[] = [
  {
    title: "Pneumonia discharge summary (sample)", text: t1,
    items: [
      { ...base, id: "a1", description: "Repeat chest X-ray", kind: "task", owner: "PCP Dr. Example", dueDate: "2026-12-01", status: "open",
        excerpt: "Repeat chest X-ray in 6 weeks to confirm resolution. Owner: PCP Dr. Example. Due: 2026-12-01." },
      { ...base, id: "a2", description: "Review final blood culture result", kind: "pending_result", owner: null, dueDate: null, status: "open",
        excerpt: "Blood culture result pending at discharge; review the final result and call the patient if positive." },
      { ...base, id: "a3", description: "Medication reconciliation", kind: "task", owner: "Pharmacy", dueDate: "2026-10-12", status: "completed",
        evidence: "Reconciliation note filed in chart",
        excerpt: "Medication reconciliation completed by pharmacy on 2026-10-12; reconciliation note filed in chart." },
      { ...base, id: "a4", description: "Arrange home oxygen setup", kind: "task", owner: "Case Mgmt", dueDate: "2026-10-15", status: "open", dependencies: ["a5"],
        excerpt: "Home oxygen setup to be arranged by case management once insurance authorization is approved. Owner: Case Mgmt. Due: 2026-10-15." },
      { ...base, id: "a5", description: "Insurance authorization for home oxygen", kind: "task", owner: "Billing Office", dueDate: null, status: "in_progress",
        excerpt: "Insurance authorization for home oxygen submitted, awaiting payer response. Owner: Billing Office." },
      { ...base, id: "a6", description: "Cardiology referral", kind: "task", owner: null, dueDate: null, status: "completed",
        excerpt: "Cardiology referral completed per patient report." },
    ],
  },
  {
    title: "SNF transfer handoff (sample)", text: t2,
    items: [
      { ...base, id: "b1", description: "Review hemoglobin A1c result", kind: "pending_result", owner: "Dr. Sample", dueDate: "2026-10-30", status: "open",
        excerpt: "Hemoglobin A1c result pending from lab; ordering clinician to review when available. Owner: Dr. Sample. Due: 2026-10-30." },
      { ...base, id: "b2", description: "Reassess sacral wound weekly", kind: "task", owner: "Nurse Example", dueDate: "2026-10-27", status: "in_progress",
        excerpt: "Wound care nurse to reassess sacral wound weekly. Owner: Nurse Example. Due: 2026-10-27. Status: in progress." },
      { ...base, id: "b3", description: "Physical therapy evaluation", kind: "task", owner: "Physical therapy", dueDate: "2026-10-14", status: "completed",
        evidence: "PT note #4412", excerpt: "Physical therapy evaluation completed 2026-10-14, see PT note #4412." },
      { ...base, id: "b4", description: "Warfarin dose adjustment", kind: "task", owner: "Anticoag Clinic", dueDate: null, status: "open", dependencies: ["INR result"],
        excerpt: "Warfarin dose adjustment depends on INR result. Owner: Anticoag Clinic." },
    ],
  },
];

export function demoAudit(doc: DemoDoc, reason?: string): AuditResult {
  return buildAudit({ title: doc.title, items: doc.items, sourceText: doc.text, source: "demo", demoReason: reason });
}

export const SAMPLE_AUDITS: AuditResult[] = DEMO_DOCS.map((d) => demoAudit(d, "Built-in synthetic sample data."));
