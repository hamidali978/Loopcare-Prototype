"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Download,
  FilePlus,
  Files,
  FileText,
  HeartPulse,
  Home,
  ListChecks,
  Loader2,
  MoreVertical,
  Search,
  Settings,
  Upload,
  User,
  Users,
  Volume2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FindingCard, findingToSpeech, speak, stopSpeaking } from "@/components/finding-card";
import { VoiceInput } from "@/components/voice-input";
import { DEMO_DOCS, SAMPLE_AUDITS } from "@/lib/demo";
import type { AuditResult, Finding, RuleId, Severity } from "@/lib/types";

const MAX_CHARS = 20000;
const MAX_FILE_BYTES = 1_000_000;

const RULE_LABELS: Record<RuleId, string> = {
  MISSING_OWNER: "Missing owner",
  MISSING_DUE_DATE: "Missing due date",
  COMPLETED_NO_EVIDENCE: "Complete without evidence",
  UNRESOLVED_DEPENDENCY: "Unresolved dependency",
  RESULT_REVIEW_NOT_DOCUMENTED: "Result review not documented",
};
const VERIFY_RULES = new Set<string>(["RESULT_REVIEW_NOT_DOCUMENTED", "COMPLETED_NO_EVIDENCE"]);

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const SEV_STYLE: Record<Severity, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};
const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-50 text-green-700",
  pending: "bg-blue-50 text-blue-600",
  unknown: "bg-amber-50 text-amber-700",
};

type FindingRef = Finding & { itemId?: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const label = (s: string) => cap(s.replace(/_/g, " "));
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
const select = `h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 sm:w-auto ${ring}`;
const iconBtn = `grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 ${ring}`;

function Pill({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>
  );
}

function SampleArt() {
  return (
    <svg viewBox="0 0 170 130" className="h-24 w-auto shrink-0 self-end sm:h-28 sm:self-auto" aria-hidden>
      <rect x="22" y="14" width="96" height="108" rx="6" fill="#fff" stroke="#cfe8dc" transform="rotate(-8 70 68)" />
      <rect x="46" y="8" width="100" height="112" rx="6" fill="#fff" stroke="#b7dcc9" />
      <text x="58" y="30" fontSize="9" fontWeight="700" fill="#14532d">Discharge</text>
      <text x="58" y="41" fontSize="9" fontWeight="700" fill="#14532d">Summary</text>
      {[54, 63, 72, 81, 90, 99].map((y, i) => (
        <rect key={y} x="58" y={y} width={i % 2 ? 62 : 76} height="3" rx="1.5" fill="#d7e6de" />
      ))}
      <circle cx="136" cy="100" r="17" fill="#16a34a" />
      <path d="M136 91v18M127 100h18" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

const NAV: { href: string; label: string; icon: LucideIcon; active?: boolean }[] = [
  { href: "#top", label: "Dashboard", icon: Home, active: true },
  { href: "#audit", label: "New Audit", icon: FilePlus },
  { href: "#sample", label: "Sample Documents", icon: Files },
  { href: "#findings", label: "All Audits", icon: ListChecks },
];

export default function Dashboard() {
  const [audits, setAudits] = useState<AuditResult[]>(SAMPLE_AUDITS);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"write" | "upload" | "samples">("write");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [cat, setCat] = useState<"all" | RuleId>("all");
  const [stat, setStat] = useState("all");
  const [sev, setSev] = useState<"all" | Severity>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLive(Boolean(d?.live)))
      .catch(() => setLive(false));
  }, []);

  const rows = useMemo(
    () =>
      audits.flatMap((a) =>
        a.findings.map((f) => {
          const itemId = (f as FindingRef).itemId;
          const item =
            (itemId ? a.items.find((i) => i.id === itemId) : undefined) ??
            a.items.find((i) => i.description === f.itemDescription) ??
            null;
          return { f, a, key: `${a.id}-${f.id}`, item };
        }),
      ),
    [audits],
  );

  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.item?.status ?? "unknown")))),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter(
        ({ f, item }) =>
          (cat === "all" || f.ruleId === cat) &&
          (sev === "all" || f.severity === sev) &&
          (stat === "all" || String(item?.status ?? "unknown") === stat) &&
          (!needle || `${f.title} ${f.itemDescription} ${f.excerpt}`.toLowerCase().includes(needle)),
      )
      .sort((x, y) => SEV_RANK[x.f.severity] - SEV_RANK[y.f.severity]);
  }, [rows, cat, sev, stat, q]);

  const filtersActive = cat !== "all" || stat !== "all" || sev !== "all" || q !== "";
  const fellBack = live === true && demoNote !== null;
  const mode = live === null ? "Checking…" : !live ? "Demo Mode" : fellBack ? "Gemini error · demo results" : "Gemini connected";
  const modeOk = live === true && !fellBack;

  const stats: { label: string; value: number; icon: LucideIcon; tile: string }[] = [
    { label: "Actions Extracted", value: audits.reduce((n, a) => n + a.items.length, 0), icon: FileText, tile: "bg-green-50 text-green-600" },
    { label: "Potential Gaps", value: rows.length, icon: AlertTriangle, tile: "bg-red-50 text-red-500" },
    { label: "Missing Owners", value: rows.filter(({ f }) => f.ruleId === "MISSING_OWNER").length, icon: Users, tile: "bg-orange-50 text-orange-500" },
    { label: "Need Verification", value: rows.filter(({ f }) => VERIFY_RULES.has(f.ruleId)).length, icon: Calendar, tile: "bg-blue-50 text-blue-600" },
  ];

  function clearFilters() {
    setCat("all");
    setStat("all");
    setSev("all");
    setQ("");
  }

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? `Audit failed (HTTP ${res.status}).`);
      const result = data as AuditResult;
      setAudits((p) => [result, ...p]);
      setDemoNote(result.source === "demo" ? result.demoReason ?? "These are sample results." : null);
      clearFilters();
      setOpen(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!/\.(txt|md|text)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setError("Only plain-text files (.txt, .md) can be uploaded right now. For a PDF, copy the text and paste it.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is over 1 MB. Paste the relevant section instead.");
      return;
    }
    setText((await file.text()).slice(0, MAX_CHARS));
    setTab("write");
  }

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), disclaimer: "Prototype output; not clinically validated.", audits },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loopcare-audit.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readHigh() {
    const hi = filtered.filter(({ f }) => f.severity === "high");
    if (!hi.length) return;
    stopSpeaking();
    speak(
      `${hi.length} high priority findings. ` +
        hi.map(({ f }, i) => `Finding ${i + 1}. ${findingToSpeech(f)}`).join(" "),
    );
  }

  const actions = (cls: string) => (
    <div className={`gap-2 ${cls}`}>
      <button type="button" onClick={readHigh} title="Read high priority findings aloud" aria-label="Read high priority findings aloud" className={iconBtn}>
        <Volume2 className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={exportJson} title="Export JSON" aria-label="Export JSON" className={iconBtn}>
        <Download className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <aside className="sticky top-0 z-20 bg-brand-900 text-brand-100 lg:h-screen lg:w-60 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:justify-start lg:gap-8 lg:py-6">
          <div className="flex shrink-0 items-center gap-2 lg:px-2">
            <HeartPulse className="h-7 w-7 text-green-400" aria-hidden />
            <span className="text-lg font-bold text-white">LoopCare</span>
          </div>
          <nav aria-label="Main" className="flex items-center gap-1 lg:flex-col lg:items-stretch">
            {NAV.map(({ href, label: text, icon: Icon, active }) => (
              <a
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-md p-2 text-sm lg:px-3 ${ring} ${
                  active ? "bg-white/10 font-medium text-white" : "hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 lg:h-4 lg:w-4" aria-hidden />
                <span className="sr-only lg:not-sr-only">{text}</span>
              </a>
            ))}
            <span
              aria-disabled="true"
              title="Coming soon"
              className="hidden cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm opacity-50 lg:flex"
            >
              <Settings className="h-4 w-4" aria-hidden />
              Settings
            </span>
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-4 px-4 py-5 sm:space-y-5 sm:py-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">Welcome to LoopCare</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review care-transition documents, identify potential gaps, and keep follow-up on track.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                modeOk ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${modeOk ? "bg-green-500" : "bg-amber-500"}`} aria-hidden />
              {mode}
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500" aria-hidden>
              <User className="h-4 w-4" />
            </span>
          </div>
        </header>

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map(({ label: name, value, icon: Icon, tile }) => (
            <div
              key={name}
              className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-4"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-11 sm:w-11 ${tile}`} aria-hidden>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none sm:text-2xl">{value}</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{name}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
          <section id="audit" aria-label="Audit a document" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:scroll-mt-6">
            <h2 className="font-semibold">Audit a Document</h2>

            <div role="tablist" aria-label="Input source" className="mt-3 grid grid-cols-3 gap-1 rounded-md border border-slate-200 p-0.5">
              {(
                [
                  ["write", "Paste Text"],
                  ["upload", "Upload File"],
                  ["samples", "Use Sample"],
                ] as const
              ).map(([t, name]) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap rounded px-1 py-1.5 text-xs sm:px-2 sm:text-sm ${ring} ${
                    tab === t ? "bg-brand-50 font-medium text-brand-800 ring-1 ring-brand-500" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {tab === "write" && (
              <div className="mt-3">
                <label htmlFor="doc" className="sr-only">Document text</label>
                <textarea
                  id="doc"
                  value={text}
                  maxLength={MAX_CHARS}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  autoComplete="off"
                  placeholder="Paste a discharge summary or care-transition document…"
                  className={`w-full resize-y rounded-md border border-slate-200 p-3 text-base placeholder:text-slate-400 sm:text-sm ${ring}`}
                />
                <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-slate-500">
                  <span>Please don’t enter real patient information.</span>
                  <span>{text.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}</span>
                </div>
              </div>
            )}

            {tab === "upload" && (
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-600 focus-within:ring-2 focus-within:ring-brand-500 hover:bg-slate-50">
                <Upload className="h-6 w-6 text-slate-400" aria-hidden />
                <span className="font-medium text-brand-700">Choose a .txt or .md file</span>
                <span className="text-xs text-slate-500">Plain text only, up to 1 MB. It opens in the editor so you can review it first.</span>
                <input type="file" accept=".txt,.md,.text,text/plain,text/markdown" onChange={onFile} className="sr-only" />
              </label>
            )}

            {tab === "samples" && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
                {DEMO_DOCS.map((d) => (
                  <li key={d.title} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0">{d.title}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setText(d.text);
                        setTab("write");
                      }}
                      className={`shrink-0 rounded-md border border-brand-500 bg-white px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 ${ring}`}
                    >
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <VoiceInput onFinal={(t) => setText((p) => p + (p && !/\s$/.test(p) ? " " : "") + t)} />
              <button
                type="button"
                onClick={run}
                disabled={loading || text.trim().length < 20}
                className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-brand-800 px-3 text-sm font-medium text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50 ${ring}`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? "Auditing…" : "Audit Document"}
                {!loading && <ChevronRight className="h-4 w-4" aria-hidden />}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            {demoNote && (
              <div role="status" className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  <strong>Demo results.</strong> {demoNote}
                </p>
                {/GEMINI_API_KEY/.test(demoNote) && (
                  <p className="mt-1 text-xs">
                    To audit your own text, add <code>GEMINI_API_KEY</code> to <code>.env.local</code> (never commit it) and restart the dev server.
                  </p>
                )}
              </div>
            )}
          </section>

          <section
            id="sample"
            aria-label="Sample document"
            className="flex scroll-mt-20 flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 lg:scroll-mt-6"
          >
            <div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-700 shadow-sm" aria-hidden>
                <FileText className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-lg font-semibold text-brand-900">Sample Document</h2>
              <p className="mt-1 max-w-xs text-sm text-slate-600">
                Try a fictional discharge summary to see how LoopCare works.
              </p>
              <button
                type="button"
                onClick={() => {
                  setText(DEMO_DOCS[0]?.text ?? "");
                  setTab("write");
                  document.getElementById("audit")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`mt-4 h-10 w-full whitespace-nowrap rounded-md bg-brand-800 px-4 text-sm font-medium text-white hover:bg-brand-900 sm:w-auto ${ring}`}
              >
                Load Sample Document
              </button>
            </div>
            <SampleArt />
          </section>
        </div>

        <section id="findings" aria-label="Audit findings" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
              <h2 className="font-semibold">Audit Findings ({filtered.length})</h2>
              {actions("flex sm:hidden")}
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center" role="group" aria-label="Filters">
              <select aria-label="Category" autoComplete="off" className={`${select} col-span-2`} value={cat} onChange={(e) => setCat(e.target.value as "all" | RuleId)}>
                <option value="all">All Categories</option>
                {Object.entries(RULE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select aria-label="Status" autoComplete="off" className={select} value={stat} onChange={(e) => setStat(e.target.value)}>
                <option value="all">All Status</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{label(s)}</option>
                ))}
              </select>
              <select aria-label="Priority" autoComplete="off" className={select} value={sev} onChange={(e) => setSev(e.target.value as "all" | Severity)}>
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <div className="relative col-span-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  aria-label="Search findings"
                  placeholder="Search findings…"
                  autoComplete="off"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className={`h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-base placeholder:text-slate-400 sm:w-44 sm:text-sm ${ring}`}
                />
              </div>
              {actions("hidden sm:flex")}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
              {rows.length === 0 ? "No findings yet. Audit a document to fill this list." : "No findings match these filters."}
              {filtersActive && rows.length > 0 && (
                <>
                  {" "}
                  <button type="button" onClick={clearFilters} className={`font-medium text-brand-700 underline ${ring}`}>
                    Clear filters
                  </button>
                </>
              )}
            </p>
          ) : (
            <>
              {/* Phones: one card per finding */}
              <ul className="mt-4 space-y-3 md:hidden">
                {filtered.map(({ f, a, key, item }) => {
                  const isOpen = open === key;
                  const status = String(item?.status ?? "unknown");
                  return (
                    <li key={key} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Pill className={SEV_STYLE[f.severity]}>{cap(f.severity)}</Pill>
                        <Pill className={STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}>{label(status)}</Pill>
                      </div>
                      <p className="mt-2 text-sm font-medium">{f.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{f.itemDescription}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">Owner</dt>
                          <dd className="mt-0.5">
                            {item?.owner ? item.owner : <Pill className="bg-red-50 text-red-600">Not documented</Pill>}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Due date</dt>
                          <dd className="mt-0.5">
                            {item?.dueDate ? item.dueDate : <Pill className="bg-red-50 text-red-600">Not documented</Pill>}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : key)}
                          className={`h-9 flex-1 rounded-md border text-sm font-medium ${ring} ${
                            isOpen ? "border-brand-700 bg-brand-700 text-white" : "border-brand-500 bg-white text-brand-700 hover:bg-brand-50"
                          }`}
                        >
                          {isOpen ? "Hide details" : "Needs Review"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Read aloud: ${f.title}`}
                          title="Read aloud"
                          onClick={() => {
                            stopSpeaking();
                            speak(findingToSpeech(f));
                          }}
                          className={iconBtn}
                        >
                          <Volume2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <FindingCard f={f} auditTitle={a.title} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Tablet and up: table */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="text-xs font-medium text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th scope="col" className="py-2 pr-3 font-medium">Action</th>
                      <th scope="col" className="px-3 font-medium">Owner</th>
                      <th scope="col" className="px-3 font-medium">Due Date</th>
                      <th scope="col" className="px-3 font-medium">Status</th>
                      <th scope="col" className="px-3 font-medium">Finding</th>
                      <th scope="col" className="px-3 font-medium">Priority</th>
                      <th scope="col" className="px-3 font-medium">Review</th>
                      <th scope="col" className="w-8"><span className="sr-only">More</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ f, a, key, item }) => {
                      const isOpen = open === key;
                      const status = String(item?.status ?? "unknown");
                      return (
                        <Fragment key={key}>
                          <tr className="border-b border-slate-100 align-middle">
                            <td className="max-w-[240px] py-3 pr-3">{f.itemDescription}</td>
                            <td className="px-3">
                              {item?.owner ? item.owner : <Pill className="bg-red-50 text-red-600">Not documented</Pill>}
                            </td>
                            <td className="px-3">
                              {item?.dueDate ? item.dueDate : <Pill className="bg-red-50 text-red-600">Not documented</Pill>}
                            </td>
                            <td className="px-3">
                              <Pill className={STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}>{label(status)}</Pill>
                            </td>
                            <td className="px-3">{f.title}</td>
                            <td className="px-3">
                              <Pill className={SEV_STYLE[f.severity]}>{cap(f.severity)}</Pill>
                            </td>
                            <td className="px-3">
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpen(isOpen ? null : key)}
                                className={`whitespace-nowrap rounded-md border px-3 py-1 text-xs font-medium ${ring} ${
                                  isOpen
                                    ? "border-brand-700 bg-brand-700 text-white"
                                    : "border-brand-500 bg-white text-brand-700 hover:bg-brand-50"
                                }`}
                              >
                                Needs Review
                              </button>
                            </td>
                            <td className="pr-1">
                              <button
                                type="button"
                                aria-label={`Read aloud: ${f.title}`}
                                title="Read aloud"
                                onClick={() => {
                                  stopSpeaking();
                                  speak(findingToSpeech(f));
                                }}
                                className={`rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${ring}`}
                              >
                                <MoreVertical className="h-4 w-4" aria-hidden />
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <td colSpan={8} className="px-4 py-4">
                                <FindingCard f={f} auditTitle={a.title} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <p className="text-xs text-slate-500">
          LoopCare is a prototype built on synthetic data. It is not clinically validated, not a medical device, and not HIPAA compliant. Findings flag text that may need a second look; they are not conclusions about care.
        </p>
      </main>
    </div>
  );
}