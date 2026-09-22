"use client";

import { useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/sessions";

const POLL_MS = 2000;
const HEARTBEAT_MS = 10_000;
const TIMELAPSE_FPS = 15;

type Props = {
  slug: string;
  orderName: string;
  clientName: string;
  initialStatus: Status;
  initialLastFrameAt: string | null;
};

function viewerId(): string {
  try {
    let id = localStorage.getItem("atelier-viewer");
    if (!id) {
      id = crypto.randomUUID().replaceAll("-", "");
      localStorage.setItem("atelier-viewer", id);
    }
    return id;
  } catch {
    return crypto.randomUUID().replaceAll("-", "");
  }
}

export function Viewer({ slug, orderName, clientName, initialStatus, initialLastFrameAt }: Props) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [lastFrameAt, setLastFrameAt] = useState(initialLastFrameAt);
  const [shared, setShared] = useState(false);
  const [, tick] = useState(0);

  useAudience(slug);

  // État de la session et horodatage de la dernière image.
  useEffect(() => {
    if (status === "ended") return;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch(`/api/s/${slug}/state`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const body = (await res.json()) as { status: Status; lastFrameAt: string | null };
      setStatus(body.status);
      setLastFrameAt(body.lastFrameAt);
    };
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [slug, status]);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function share() {
    const url = location.href;
    let method: "share" | "copy" = "share";
    try {
      if (navigator.share) {
        await navigator.share({ title: `La fabrication de « ${orderName} »`, url });
      } else {
        await navigator.clipboard.writeText(url);
        method = "copy";
      }
    } catch {
      return; // Partage annulé.
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
    fetch(`/api/s/${slug}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewerId: viewerId(), method }),
    }).catch(() => {});
  }

  const age = lastFrameAt ? Math.max(0, Math.round((Date.now() - Date.parse(lastFrameAt)) / 1000)) : null;
  const stale = status === "live" && (age === null || age > 20);

  return (
    <>
      <header className="viewer-head">
        <div>
          <h1>{orderName}</h1>
          <p className="muted small">Fabriqué pour {clientName}</p>
        </div>
        {status === "live" && !stale && <span className="live-dot">EN DIRECT</span>}
      </header>

      <div className="stage">
        {status === "ended" ? (
          <Timelapse slug={slug} />
        ) : lastFrameAt ? (
          <LiveFrame slug={slug} version={lastFrameAt} />
        ) : (
          <div className="stage-empty">
            <p>La fabrication n&apos;a pas encore commencé.</p>
            <p className="muted small">Gardez ce lien : l&apos;image apparaîtra ici dès que l&apos;artisan démarre.</p>
          </div>
        )}
      </div>

      <p className="caption">
        {status === "live" && !stale && `Mis à jour il y a ${age} s`}
        {status === "live" && stale && lastFrameAt && "Connexion de l'atelier interrompue, ça reprend…"}
        {status === "paused" && "L'artisan a fait une pause. Ça reprend bientôt."}
        {status === "ended" && "Fabrication terminée. Voici l'accéléré."}
      </p>

      <button className="btn secondary" onClick={share}>
        {shared ? "Merci !" : "Montrer à quelqu'un"}
      </button>
    </>
  );
}

/** Affiche la dernière image, en fondu, sans clignotement pendant le chargement. */
function LiveFrame({ slug, version }: { slug: string; version: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = `/api/s/${slug}/frame?v=${encodeURIComponent(version)}`;
    const img = new Image();
    img.onload = () => setSrc(url);
    img.src = url;
  }, [slug, version]);
  return src ? <img src={src} alt="La fabrication en direct" /> : <div className="stage-empty">Chargement…</div>;
}

function Timelapse({ slug }: { slug: string }) {
  const [frames, setFrames] = useState<HTMLImageElement[] | null>(null);
  const [total, setTotal] = useState(0);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/s/${slug}/timelapse`);
      const { frames: urls = [] } = (await res.json().catch(() => ({}))) as { frames?: string[] };
      if (cancelled) return;
      setTotal(urls.length);
      // Préchargement : la lecture démarre dès que les premières images sont là.
      const imgs = urls.map((u) => {
        const img = new Image();
        img.src = u;
        return img;
      });
      await Promise.all(imgs.slice(0, 30).map((img) => img.decode().catch(() => {})));
      if (!cancelled) setFrames(imgs);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!frames?.length || !playing) return;
    const t = setInterval(() => {
      setI((n) => {
        const next = (n + 1) % frames.length;
        return frames[next].complete ? next : n; // On attend l'image suivante si elle n'est pas prête.
      });
    }, 1000 / TIMELAPSE_FPS);
    return () => clearInterval(t);
  }, [frames, playing]);

  if (!frames) return <div className="stage-empty">Préparation de l&apos;accéléré…</div>;
  if (!total) return <div className="stage-empty">Aucune image enregistrée pour cette fabrication.</div>;

  return (
    <button className="timelapse" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Lecture"}>
      <img src={frames[i].src} alt="Accéléré de la fabrication" />
      <span className="progress" style={{ width: `${((i + 1) / total) * 100}%` }} />
      {!playing && <span className="play">▶</span>}
    </button>
  );
}

/** Ouverture du lien et temps passé onglet visible : la seule donnée qui compte. */
function useAudience(slug: string) {
  const viewRef = useRef<string | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    const vid = viewerId();
    const url = `/api/s/${slug}/view`;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : null;

    const seconds = () =>
      secondsRef.current + (visibleSince ? Math.floor((Date.now() - visibleSince) / 1000) : 0);

    const payload = () => JSON.stringify({ viewerId: vid, viewId: viewRef.current, seconds: seconds() });

    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ viewerId: vid }) })
      .then((r) => r.json())
      .then((b: { viewId?: string | null }) => (viewRef.current = b.viewId ?? null))
      .catch(() => {});

    const beat = () => {
      if (!viewRef.current) return;
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(), keepalive: true }).catch(
        () => {},
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else {
        secondsRef.current = seconds();
        visibleSince = null;
        if (viewRef.current) navigator.sendBeacon(url, new Blob([payload()], { type: "application/json" }));
      }
    };

    const t = setInterval(() => document.visibilityState === "visible" && beat(), HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
      beat();
    };
  }, [slug]);
}
