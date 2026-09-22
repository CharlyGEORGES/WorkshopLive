import { NextResponse } from "next/server";
import { isAtelier } from "@/lib/auth";
import { sessionById, type Status } from "@/lib/sessions";
import { db } from "@/lib/supabase";

const ALLOWED: Record<Status, Status[]> = {
  pending: ["live", "ended"],
  live: ["paused", "ended"],
  paused: ["live", "ended"],
  ended: [],
};

/** Démarrer, couper, reprendre ou fermer une session. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAtelier())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const session = await sessionById((await params).id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { status } = (await req.json().catch(() => ({}))) as { status?: Status };
  if (!status || !ALLOWED[session.status].includes(status)) {
    return NextResponse.json({ error: "bad_transition", status: session.status }, { status: 409 });
  }

  const now = new Date().toISOString();
  await db()
    .from("sessions")
    .update({
      status,
      ...(status === "live" && !session.started_at && { started_at: now }),
      ...(status === "ended" && { ended_at: now }),
    })
    .eq("id", session.id);

  return NextResponse.json({ status });
}
