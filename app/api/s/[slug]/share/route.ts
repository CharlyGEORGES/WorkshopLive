import { NextResponse } from "next/server";
import { isAtelier } from "@/lib/auth";
import { sessionBySlug } from "@/lib/sessions";
import { db } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await sessionBySlug((await params).slug);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (await isAtelier()) return NextResponse.json({ ok: true });

  const { viewerId, method } = (await req.json().catch(() => ({}))) as { viewerId?: string; method?: string };
  if (!viewerId || !/^[A-Za-z0-9_-]{8,64}$/.test(viewerId) || !["share", "copy"].includes(method ?? "")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  await db().from("shares").insert({ session_id: session.id, viewer_id: viewerId, method });
  return NextResponse.json({ ok: true });
}
