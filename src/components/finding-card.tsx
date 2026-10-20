"use client";
import { useState } from "react";
import { AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Finding } from "@/lib/types";

export function speak(text: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.onend = () => onEnd?.(); u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.cancel();

export const findingToSpeech = (f: Finding) =>
  `${f.severity} priority. ${f.title}. ${f.itemDescription}. ${f.explanation} A human should verify: ${f.verify.join(" ")}`;

const tone = { high: "red", medium: "amber", low: "neutral" } as const;

export function FindingCard({ f, auditTitle }: { f: Finding; auditTitle: string }) {
  const [talking, setTalking] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone[f.severity]}>{f.severity}</Badge>
            <h3 className="font-semibold text-brand-900">{f.title}</h3>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{f.itemDescription} <span className="text-slate-400">· {auditTitle}</span></p>
        </div>
        <Button size="sm" variant="ghost" aria-label={talking ? "Stop reading" : `Read finding aloud: ${f.title}`}
          onClick={() => { if (talking) { stopSpeaking(); setTalking(false); } else setTalking(speak(findingToSpeech(f), () => setTalking(false))); }}>
          {talking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {talking ? "Stop" : "Read aloud"}
        </Button>
      </div>
      <blockquote className="mt-3 border-l-4 border-brand-400 bg-brand-50 px-3 py-2 text-sm text-slate-800">
        {f.excerpt}
      </blockquote>
      {!f.excerptVerified && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5" /> This excerpt was not found word-for-word in the source. Check the original document.
        </p>
      )}
      <p className="mt-3 text-sm text-slate-700">{f.explanation}</p>
      <div className="mt-3">
        <p className="text-sm font-medium text-brand-900">A human should verify</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
          {f.verify.map((v) => <li key={v}>{v}</li>)}
        </ul>
      </div>
    </Card>
  );
}
