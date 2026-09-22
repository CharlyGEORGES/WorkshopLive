import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sessionBySlug } from "@/lib/sessions";
import { Viewer } from "./Viewer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await sessionBySlug((await params).slug);
  return {
    title: session ? `${session.order_name} : la fabrication` : "Le direct de l'atelier",
    robots: { index: false, follow: false },
  };
}

export default async function ViewPage({ params }: Props) {
  const { slug } = await params;
  const session = await sessionBySlug(slug);
  if (!session) notFound();

  return (
    <main className="viewer">
      <Viewer
        slug={slug}
        orderName={session.order_name}
        clientName={session.client_name}
        initialStatus={session.status}
        initialLastFrameAt={session.last_frame_at}
      />
    </main>
  );
}
