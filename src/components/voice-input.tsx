"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    r.lang = "en-US"; r.continuous = true; r.interimResults = true;
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
    r.onend = () => { setListening(false); setInterim(""); };
    rec.current = r; r.start(); setListening(true);
  }

  if (!supported) return <p className="text-xs text-slate-500">Voice input isn’t supported in this browser. Type or paste instead.</p>;
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant={listening ? "default" : "outline"} size="sm"
        onClick={() => (listening ? rec.current?.stop() : start())} aria-pressed={listening}>
        {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {listening ? "Stop dictation" : "Dictate"}
      </Button>
      {interim && <p className="text-xs italic text-slate-500" aria-live="polite">Hearing: {interim}</p>}
      {err && <p className="text-xs text-red-700" role="alert">{err}</p>}
    </div>
  );
}
