import "server-only";
import { db } from "./supabase";
import type { Session } from "./sessions";

type View = { session_id: string; viewer_id: string; started_at: string; seconds: number };
type Share = { session_id: string; viewer_id: string };

export type SessionStats = {
  opened: boolean;
  /** Secondes regardées par le premier navigateur à avoir ouvert le lien, présumé être le client. */
  clientSeconds: number;
  clientOpens: number;
  viewers: number;
  totalSeconds: number;
  shared: boolean;
};

export type Signal = {
  label: string;
  value: string;
  go: string;
  stop: string;
  level: "go" | "stop" | "wait";
};

export async function loadStats(sessions: Session[]) {
  const ids = sessions.map((s) => s.id);
  const [views, shares] = ids.length
    ? await Promise.all([
        db().from("views").select("session_id, viewer_id, started_at, seconds").in("session_id", ids).order("started_at"),
        db().from("shares").select("session_id, viewer_id").in("session_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const perSession = new Map<string, SessionStats>();
  for (const s of sessions) {
    const sv = ((views.data ?? []) as View[]).filter((v) => v.session_id === s.id);
    const client = sv[0]?.viewer_id;
    const mine = sv.filter((v) => v.viewer_id === client);
    const viewers = new Set(sv.map((v) => v.viewer_id)).size;
    perSession.set(s.id, {
      opened: sv.length > 0,
      clientSeconds: mine.reduce((n, v) => n + v.seconds, 0),
      clientOpens: mine.length,
      viewers,
      totalSeconds: sv.reduce((n, v) => n + v.seconds, 0),
      // Un partage explicite, ou un second navigateur qui ouvre le lien.
      shared: viewers > 1 || ((shares.data ?? []) as Share[]).some((x) => x.session_id === s.id),
    });
  }

  // Ne comptent que les commandes dont la fabrication a démarré : le lien a été envoyé.
  const counted = sessions.filter((s) => s.started_at).map((s) => perSession.get(s.id)!);
  const opened = counted.filter((x) => x.opened);
  const n = counted.length;
  const avg = opened.length ? opened.reduce((t, x) => t + x.clientSeconds, 0) / opened.length : 0;
  const reopen = counted.filter((x) => x.clientOpens >= 2).length;
  const shared = counted.filter((x) => x.shared).length;

  const signals: Signal[] = [
    {
      label: "Clients qui ouvrent le lien",
      value: `${opened.length} sur ${n}`,
      go: "plus de 7 sur 10",
      stop: "moins de 4 sur 10",
      level: rate(opened.length, n, (r) => r > 0.7, (r) => r < 0.4),
    },
    {
      label: "Durée moyenne de visionnage",
      value: formatDuration(avg),
      go: "plus de 2 min",
      stop: "moins de 20 s",
      level: !opened.length ? "wait" : avg > 120 ? "go" : n >= 10 && avg < 20 ? "stop" : "wait",
    },
    {
      label: "Clients qui rouvrent le lien",
      value: `${reopen} sur ${n}`,
      go: "au moins 3 sur 10",
      stop: "aucun",
      level: rate(reopen, n, (r) => r >= 0.3, () => reopen === 0),
    },
    {
      label: "Clients qui partagent le lien",
      value: `${shared} sur ${n}`,
      go: "au moins 1 sur 10",
      stop: "aucun",
      level: rate(shared, n, (r) => r >= 0.1, () => shared === 0),
    },
  ];

  return { perSession, signals, counted: n };
}

// En dessous de 10 commandes filmées, on n'affiche pas de verdict d'arrêt.
function rate(k: number, n: number, go: (r: number) => boolean, stop: (r: number) => boolean): Signal["level"] {
  if (!n) return "wait";
  const r = k / n;
  if (go(r)) return "go";
  return n >= 10 && stop(r) ? "stop" : "wait";
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, "0")}`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}
