"use client";
import { useState } from "react";
import { AlertTriangle, Volume2, VolumeX } from "lucide-react";
import type { Finding } from "@/lib/types";

export function speak(text: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}

export const stopSpeaking = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.cancel();

export const findingToSpeech = (f: Finding) =>
  `${f.severity} priority. ${f.title}. ${f.itemDescription}. ${f.explanation} A human should verify: ${f.verify.join(" ")}`;

export function FindingCard({ f, auditTitle }: { f: Finding; auditTitle: string }) {
  const [talking, setTalking] = useState(false);

  function toggleSpeech() {
    if (talking) {
      stopSpeaking();
      setTalking(false);
    } else {
      setTalking(speak(findingToSpeech(f), () => setTalking(false)));
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <p className="text-xs text-slate-500">Source: {auditTitle}</p>
        <blockquote className="mt-2 rounded-r-md border-l-4 border-brand-400 bg-brand-50 px-3 py-2 text-sm text-slate-800">
          {f.excerpt}
        </blockquote>
        {!f.excerptVerified && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            This excerpt was not found word-for-word in the source. Check the original document.
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{f.explanation}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-brand-900">A human should verify</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {f.verify.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={toggleSpeech}
          aria-label={talking ? "Stop reading" : `Read finding aloud: ${f.title}`}
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md border border-brand-500 bg-white px-3 text-xs font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {talking ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
          {talking ? "Stop" : "Read aloud"}
        </button>
      </div>
    </div>
  );
}