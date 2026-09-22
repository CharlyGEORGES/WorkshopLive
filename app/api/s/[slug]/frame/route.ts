import { NextResponse } from "next/server";
import { sessionBySlug } from "@/lib/sessions";
import { BUCKET, db } from "@/lib/supabase";

/** Dernière image reçue, servie sans cache. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await sessionBySlug((await params).slug);
  if (!session?.last_frame_path) return new NextResponse(null, { status: 404 });

  const { data, error } = await db().storage.from(BUCKET).download(session.last_frame_path);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(data, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}
