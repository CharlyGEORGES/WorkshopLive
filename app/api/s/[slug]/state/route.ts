import { NextResponse } from "next/server";
import { sessionBySlug } from "@/lib/sessions";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await sessionBySlug((await params).slug);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { status: session.status, lastFrameAt: session.last_frame_at },
    { headers: { "Cache-Control": "no-store" } },
  );
}
