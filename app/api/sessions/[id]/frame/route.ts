import { NextResponse } from "next/server";
import { isAtelier } from "@/lib/auth";
import { sessionById } from "@/lib/sessions";
import { BUCKET, db } from "@/lib/supabase";

const MAX_BYTES = 1_500_000;

/** Reçoit une image JPEG du téléphone de l'artisan. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAtelier())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const session = await sessionById((await params).id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Une session en pause ou fermée refuse les images : c'est le bouton "couper".
  if (session.status !== "live") return NextResponse.json({ status: session.status }, { status: 409 });

  const body = new Uint8Array(await req.arrayBuffer());
  if (!body.length || body.length > MAX_BYTES || body[0] !== 0xff || body[1] !== 0xd8) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }

  const now = new Date();
  const every = Number(process.env.ARCHIVE_EVERY_SECONDS ?? 10) * 1000;
  const archive = !session.last_archived_at || now.getTime() - Date.parse(session.last_archived_at) >= every;
  const path = archive ? `${session.id}/a/${now.getTime()}.jpg` : `${session.id}/latest.jpg`;

  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, body, { contentType: "image/jpeg", upsert: true, cacheControl: "0" });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await db()
    .from("sessions")
    .update({
      last_frame_path: path,
      last_frame_at: now.toISOString(),
      ...(archive && { last_archived_at: now.toISOString(), archived_count: session.archived_count + 1 }),
    })
    .eq("id", session.id);

  return NextResponse.json({ ok: true, archived: archive });
}
