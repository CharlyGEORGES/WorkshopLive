import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAtelier } from "@/lib/auth";
import { sessionById } from "@/lib/sessions";
import { publicUrl } from "@/lib/url";
import { CopyLink } from "../CopyLink";
import { Capture } from "./Capture";

export const dynamic = "force-dynamic";

export default async function CapturePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAtelier())) redirect("/atelier");
  const session = await sessionById((await params).id);
  if (!session) notFound();
  const url = await publicUrl(`/s/${session.slug}`);

  return (
    <main className="page capture-page">
      <header className="row between">
        <Link href="/atelier" className="link">
          ← Commandes
        </Link>
        <a href={url} target="_blank" className="link">
          Voir comme le client
        </a>
      </header>
      <div>
        <h1>{session.order_name}</h1>
        <p className="muted">Pour {session.client_name}</p>
      </div>
      <CopyLink url={url} clientName={session.client_name} orderName={session.order_name} />
      <Capture id={session.id} initialStatus={session.status} />
    </main>
  );
}
