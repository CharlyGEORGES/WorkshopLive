import { NextResponse } from "next/server";
import { sessionBySlug } from "@/lib/sessions";
import { BUCKET, db } from "@/lib/supabase";

// Au-delà, on échantillonne : 900 images à 15 i/s donnent un accéléré d'une minute.
const MAX_FRAMES = 900;

/** Liste des images archivées, en URL signées, pour l'accéléré. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await sessionBySlug((await params).slug);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const store = db().storage.from(BUCKET);
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await store.list(`${session.id}/a`, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    names.push(...data.map((f) => f.name));
    if (data.length < 1000) break;
  }
  names.sort((a, b) => parseInt(a) - parseInt(b));

  const step = Math.max(1, names.length / MAX_FRAMES);
  const picked: string[] = [];
  for (let i = 0; i < names.length; i += step) picked.push(names[Math.floor(i)]);

  if (!picked.length) return NextResponse.json({ frames: [] });
  const { data, error } = await store.createSignedUrls(
    picked.map((n) => `${session.id}/a/${n}`),
    60 * 60 * 6,
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ frames: data.map((d) => d.signedUrl).filter(Boolean) });
}
