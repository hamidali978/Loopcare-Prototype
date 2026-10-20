import { NextResponse } from "next/server";
import { AuditRequestSchema } from "@/lib/schema";
import { extractItems } from "@/lib/gemini";
import { buildAudit, titleFrom } from "@/lib/audit";
import { DEMO_DOCS, demoAudit } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 30;

// Privacy: the submitted document is never logged or stored.
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = AuditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const text = parsed.data.text;

  const fallback = (reason: string) => {
    const doc = DEMO_DOCS.find((d) => d.text.trim() === text) ?? DEMO_DOCS[0];
    const note = doc.text.trim() === text ? reason : `${reason} Showing predefined sample results; they are NOT derived from your pasted text.`;
    return NextResponse.json(demoAudit(doc, note));
  };

  if (!process.env.GEMINI_API_KEY) return fallback("Demo mode: GEMINI_API_KEY is not configured on the server.");

  try {
    const items = await extractItems(text);
    return NextResponse.json(buildAudit({ title: titleFrom(text), items, sourceText: text, source: "gemini" }));
  } catch (e) {
    // Log only a generic error class, never document content.
    console.error("audit extraction failed:", e instanceof Error ? e.name : "unknown");
    return fallback("Demo mode: the Gemini request failed or returned unusable output.");
  }
}
