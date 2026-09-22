import { NextResponse } from "next/server";
import { isAtelier } from "@/lib/auth";
import { sessionBySlug } from "@/lib/sessions";
import { db } from "@/lib/supabase";

type Body = { viewerId?: string; viewId?: string; seconds?: number };

const VIEWER_RE = /^[A-Za-z0-9_-]{8,64}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Sans viewId : enregistre une ouverture du lien et renvoie son identifiant.
 * Avec viewId : met à jour le temps passé onglet visible (appelé toutes les 10 s et à la fermeture).
 * Les visites de l'artisan ne sont pas comptées.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await sessionBySlug((await params).slug);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (await isAtelier()) return NextResponse.json({ viewId: null });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.viewerId || !VIEWER_RE.test(body.viewerId)) {
    return NextResponse.json({ error: "bad_viewer" }, { status: 400 });
  }

  if (!body.viewId) {
    const { data, error } = await db()
      .from("views")
      .insert({ session_id: session.id, viewer_id: body.viewerId, mode: session.status })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ viewId: data.id });
  }

  if (!UUID_RE.test(body.viewId)) return NextResponse.json({ error: "bad_view" }, { status: 400 });
  const seconds = Math.max(0, Math.floor(Number(body.seconds) || 0));
  const { data: view } = await db()
    .from("views")
    .select("started_at, seconds")
    .eq("id", body.viewId)
    .eq("session_id", session.id)
    .eq("viewer_id", body.viewerId)
    .maybeSingle();
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Le compteur ne peut ni reculer ni dépasser le temps écoulé depuis l'ouverture.
  const elapsed = Math.ceil((Date.now() - Date.parse(view.started_at)) / 1000) + 5;
  const next = Math.min(seconds, elapsed);
  if (next > view.seconds) {
    await db()
      .from("views")
      .update({ seconds: next, last_seen_at: new Date().toISOString() })
      .eq("id", body.viewId);
  }
  return NextResponse.json({ ok: true });
}
