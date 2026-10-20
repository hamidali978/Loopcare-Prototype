"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function VoiceInput({ onFinal }: { onFinal: (t: string) => void }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) setSupported(false);
    return () => rec.current?.abort?.();
  }, []);

  function start() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setErr(null);
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onFinal(res[0].transcript.trim() + " ");
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e: any) => setErr(`Voice input error: ${e.error}. You can type instead.`);
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    r.start();
    setListening(true);
  }

  if (!supported) {
    return (
      <p className="flex items-center text-xs text-slate-500">
        Voice input isn’t supported in this browser. Type or paste instead.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={listening}
        onClick={() => (listening ? rec.current?.stop() : start())}
        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          listening
            ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
            : "border-brand-500 bg-white text-brand-700 hover:bg-brand-50"
        }`}
      >
        {listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
        {listening ? "Stop" : "Speak to Audit"}
      </button>
      {interim && (
        <p className="text-xs italic text-slate-500" aria-live="polite">
          Hearing: {interim}
        </p>
      )}
      {err && (
        <p className="text-xs text-red-700" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}