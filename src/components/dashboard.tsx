"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Play, RefreshCcw, ShieldAlert, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FindingCard, findingToSpeech, speak, stopSpeaking } from "@/components/finding-card";
import { VoiceInput } from "@/components/voice-input";
import { DEMO_DOCS, SAMPLE_AUDITS } from "@/lib/demo";
import type { AuditResult, RuleId, Severity } from "@/lib/types";

const RULE_LABELS: Record<RuleId, string> = {
  MISSING_OWNER: "Missing owner",
  MISSING_DUE_DATE: "Missing due date",
  COMPLETED_NO_EVIDENCE: "Complete without evidence",
  UNRESOLVED_DEPENDENCY: "Unresolved dependency",
  RESULT_REVIEW_NOT_DOCUMENTED: "Result review not documented",
};
const select = "h-9 rounded-md border border-brand-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export default function Dashboard() {
  const [audits, setAudits] = useState<AuditResult[]>(SAMPLE_AUDITS);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sev, setSev] = useState<"all" | Severity>("all");
  const [rule, setRule] = useState<"all" | RuleId>("all");
  const [auditId, setAuditId] = useState("all");
  const [q, setQ] = useState("");
  const [lastDemoNote, setLastDemoNote] = useState<string | null>(null);

  const findings = useMemo(
    () => audits.flatMap((a) => a.findings.map((f) => ({ f, a }))),
    [audits],
  );
  const filtered = findings.filter(({ f, a }) =>
    (sev === "all" || f.severity === sev) && (rule === "all" || f.ruleId === rule) &&
    (auditId === "all" || a.id === auditId) &&
    (!q || `${f.title} ${f.itemDescription} ${f.excerpt}`.toLowerCase().includes(q.toLowerCase())));

  const metrics = [
    { label: "Documents audited", value: audits.length },
    { label: "Action items found", value: audits.reduce((n, a) => n + a.items.length, 0) },
    { label: "Items to verify", value: findings.length },
    { label: "High priority", value: findings.filter(({ f }) => f.severity === "high").length },
  ];

  async function run() {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? `Audit failed (HTTP ${res.status}).`);
      setAudits((p) => [data as AuditResult, ...p]);
      setLastDemoNote((data as AuditResult).source === "demo" ? (data as AuditResult).demoReason ?? "Demo results." : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally { setLoading(false); }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), disclaimer: "Prototype output; not clinically validated.", audits }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "loopcare-audit.json"; a.click(); URL.revokeObjectURL(a.href);
  }

  function readHigh() {
    const hi = filtered.filter(({ f }) => f.severity === "high");
    if (!hi.length) return;
    stopSpeaking();
    speak(`${hi.length} high priority findings. ` + hi.map(({ f }, i) => `Finding ${i + 1}. ${findingToSpeech(f)}`).join(" "));
  }

  return (
    <div className="min-h-screen">
      <header className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-6 w-6 text-brand-200" aria-hidden />
            <div>
              <h1 className="font-display text-2xl leading-none">LoopCare</h1>
              <p className="text-xs text-brand-100">Find open loops in care handoffs</p>
            </div>
          </div>
          <Badge tone="green" className="bg-white/15 text-white">Prototype · synthetic data only</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section aria-label="Metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className="p-4">
              <p className="font-display text-3xl text-brand-700">{m.value}</p>
              <p className="text-sm text-slate-600">{m.label}</p>
            </Card>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section aria-label="New audit" className="space-y-3">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl text-brand-900">Audit a handoff</h2>
                <VoiceInput onFinal={(t) => setText((p) => p + (p && !p.endsWith(" ") && !p.endsWith("\n") ? " " : "") + t)} />
              </div>
              <label htmlFor="doc" className="mt-3 block text-sm text-slate-600">
                Paste or dictate a synthetic document. Dictation lands here so you can edit it before running the audit.
              </label>
              <textarea id="doc" value={text} onChange={(e) => setText(e.target.value)} rows={12}
                placeholder="Paste a fictional discharge or handoff note…"
                className="mt-2 w-full rounded-md border border-brand-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{text.length.toLocaleString()} / 20,000 characters</span>
                <span>Do not enter real patient information.</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={run} disabled={loading || text.trim().length < 20}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {loading ? "Auditing…" : "Run audit"}
                </Button>
                {DEMO_DOCS.map((d, i) => (
                  <Button key={d.title} variant="outline" onClick={() => setText(d.text)}>
                    <FileText className="h-4 w-4" /> Load sample {i + 1}
                  </Button>
                ))}
              </div>
              {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              {lastDemoNote && (
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900" role="status">
                  <strong>Demo results.</strong> {lastDemoNote}
                </p>
              )}
            </Card>
            <p className="text-xs text-slate-500">
              LoopCare is a prototype. It is not clinically validated, not a medical device, and not HIPAA compliant. Findings flag text that may need a second look; they are not conclusions about care.
            </p>
          </section>

          <section aria-label="Exception queue" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl text-brand-900">Exception queue <span className="text-base text-slate-500">({filtered.length})</span></h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={readHigh}><Volume2 className="h-4 w-4" /> Read high priority</Button>
                <Button size="sm" variant="outline" onClick={exportJson}><Download className="h-4 w-4" /> Export JSON</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
              <input aria-label="Search findings" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className={select + " w-36"} />
              <select aria-label="Severity" className={select} value={sev} onChange={(e) => setSev(e.target.value as "all" | Severity)}>
                <option value="all">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <select aria-label="Rule" className={select} value={rule} onChange={(e) => setRule(e.target.value as "all" | RuleId)}>
                <option value="all">All rules</option>
                {Object.entries(RULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select aria-label="Document" className={select} value={auditId} onChange={(e) => setAuditId(e.target.value)}>
                <option value="all">All documents</option>
                {audits.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {audits.map((a) => (
                <Badge key={a.id} tone={a.source === "demo" ? "amber" : "green"}>
                  {a.source === "demo" ? "Demo" : "Gemini"}: {a.title}
                </Badge>
              ))}
            </div>
            {filtered.length === 0 ? (
              <Card className="flex items-center gap-3 p-6 text-sm text-slate-600">
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
                {findings.length === 0 ? "No findings yet. Run an audit to fill the queue." : "No findings match these filters."}
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(({ f, a }) => <FindingCard key={`${a.id}-${f.id}`} f={f} auditTitle={a.title} />)}
              </div>
            )}
          </section>
        </div>

        <section aria-label="Extracted items" className="space-y-2">
          <h2 className="flex items-center gap-2 font-display text-xl text-brand-900"><ShieldAlert className="h-5 w-5" /> Extracted action items</h2>
          {audits.slice(0, 3).map((a) => (
            <details key={a.id} className="rounded-lg border border-brand-100 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium">{a.title} — {a.items.length} items {a.source === "demo" && "(demo)"}</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-1 pr-3">Item</th><th className="pr-3">Owner</th><th className="pr-3">Due</th><th className="pr-3">Status</th><th className="pr-3">Depends on</th><th>Evidence</th></tr></thead>
                  <tbody>
                    {a.items.map((i) => (
                      <tr key={i.id} className="border-t border-brand-50 align-top">
                        <td className="py-1.5 pr-3">{i.description}</td>
                        <td className="pr-3">{i.owner ?? <span className="text-slate-400">not stated</span>}</td>
                        <td className="pr-3">{i.dueDate ?? <span className="text-slate-400">not stated</span>}</td>
                        <td className="pr-3">{i.status.replace("_", " ")}</td>
                        <td className="pr-3">{i.dependencies.join(", ") || "—"}</td>
                        <td>{i.evidence ?? <span className="text-slate-400">not stated</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </section>
      </main>
    </div>
  );
}
