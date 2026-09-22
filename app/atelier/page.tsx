import Link from "next/link";
import { isAtelier } from "@/lib/auth";
import type { Session } from "@/lib/sessions";
import { formatDuration, loadStats } from "@/lib/stats";
import { db } from "@/lib/supabase";
import { createSession, login, logout } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Session["status"], string> = {
  pending: "Pas démarrée",
  live: "En direct",
  paused: "En pause",
  ended: "Terminée",
};

export default async function Atelier({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (!(await isAtelier())) {
    const { erreur } = await searchParams;
    return (
      <main className="page narrow">
        <h1>L&apos;atelier</h1>
        <form action={login} className="card stack">
          <label>
            Mot de passe
            <input name="password" type="password" autoComplete="current-password" required autoFocus />
          </label>
          {erreur && <p className="error">Mot de passe incorrect.</p>}
          <button className="btn">Entrer</button>
        </form>
      </main>
    );
  }

  const { data } = await db().from("sessions").select("*").order("created_at", { ascending: false }).limit(200);
  const sessions = (data ?? []) as Session[];
  const { perSession, signals, counted } = await loadStats(sessions);

  return (
    <main className="page">
      <header className="row between">
        <h1>L&apos;atelier</h1>
        <form action={logout}>
          <button className="link">Se déconnecter</button>
        </form>
      </header>

      <form action={createSession} className="card stack">
        <h2>Nouvelle commande</h2>
        <label>
          Commande
          <input name="order" placeholder="Bol en grès, émail céladon" required maxLength={120} />
        </label>
        <label>
          Client
          <input name="client" placeholder="Camille" required maxLength={120} />
        </label>
        <button className="btn">Créer la session</button>
      </form>

      <section className="card">
        <h2>Est-ce que les clients regardent ?</h2>
        <p className="muted">
          {counted} commande{counted > 1 ? "s" : ""} filmée{counted > 1 ? "s" : ""}. Verdict d&apos;arrêt affiché à
          partir de 10.
        </p>
        <table className="signals">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Mesure</th>
              <th>Encourageant</th>
              <th>Arrêt</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.label} className={s.level}>
                <td>{s.label}</td>
                <td className="value">{s.value}</td>
                <td>{s.go}</td>
                <td>{s.stop}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          Le client est présumé être le premier navigateur à ouvrir le lien. Seul le temps passé onglet visible est
          compté. Vos propres visites ne sont pas comptées.
        </p>
      </section>

      <section className="stack">
        <h2>Commandes</h2>
        {sessions.length === 0 && <p className="muted">Aucune session pour l&apos;instant.</p>}
        {sessions.map((s) => {
          const st = perSession.get(s.id)!;
          return (
            <Link key={s.id} href={`/atelier/${s.id}`} className="card session">
              <div className="row between">
                <strong>{s.order_name}</strong>
                <span className={`badge ${s.status}`}>{STATUS_LABEL[s.status]}</span>
              </div>
              <div className="muted small">
                {s.client_name} · {new Date(s.created_at).toLocaleDateString("fr-FR")}
              </div>
              <div className="small">
                {st.opened
                  ? `Client : ${formatDuration(st.clientSeconds)} en ${st.clientOpens} visite${st.clientOpens > 1 ? "s" : ""}` +
                    (st.viewers > 1 ? ` · ${st.viewers} spectateurs` : "") +
                    (st.shared ? " · partagé" : "")
                  : "Lien pas encore ouvert"}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
