"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/sessions";

const INTERVAL_MS = 2000;
const MAX_WIDTH = 1280; // 720p : suffisant, et le téléphone chauffe moins.
const JPEG_QUALITY = 0.7;

type Battery = { level: number; charging: boolean };
type BatteryManager = Battery & EventTarget;

export function Capture({ id, initialStatus }: { id: string; initialStatus: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [cameraOn, setCameraOn] = useState(false);
  const [sent, setSent] = useState(0);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [failures, setFailures] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [, tick] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef(status);
  const busyRef = useRef(false);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const wantCameraRef = useRef(false);
  statusRef.current = status;

  const setRemoteStatus = useCallback(
    async (next: Status) => {
      const res = await fetch(`/api/sessions/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = (await res.json().catch(() => ({}))) as { status?: Status };
      if (body.status) setStatus(body.status);
      return res.ok;
    },
    [id],
  );

  const lockScreenOn = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeRef.current) {
        wakeRef.current = await navigator.wakeLock.request("screen");
        wakeRef.current.addEventListener("release", () => (wakeRef.current = null));
      }
    } catch {
      // Refusé (économie d'énergie) : on réessaiera au prochain retour au premier plan.
    }
  }, []);

  const stopCamera = useCallback(() => {
    wantCameraRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    wantCameraRef.current = true;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, // Pas de son : rien à y gagner, et un risque juridique.
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { max: 10 },
        },
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      // Reprise automatique si le système coupe la caméra (appel entrant, autre appli…).
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (wantCameraRef.current) setTimeout(startCamera, 2000);
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      await lockScreenOn();
    } catch (e) {
      setCameraOn(false);
      setError(`Caméra indisponible : ${(e as Error).message}`);
    }
  }, [lockScreenOn]);

  const sendFrame = useCallback(async () => {
    const video = videoRef.current;
    if (busyRef.current || statusRef.current !== "live" || !video || video.readyState < 2) return;
    busyRef.current = true;
    try {
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
      if (!blob) return;
      const res = await fetch(`/api/sessions/${id}/frame`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (res.status === 409) {
        const body = (await res.json().catch(() => ({}))) as { status?: Status };
        if (body.status) setStatus(body.status);
      } else if (res.ok) {
        setSent((n) => n + 1);
        setLastOk(Date.now());
        setFailures(0);
      } else {
        setFailures((n) => n + 1);
      }
    } catch {
      setFailures((n) => n + 1); // Réseau coupé : la boucle continue et reprendra seule.
    } finally {
      busyRef.current = false;
    }
  }, [id]);

  // Boucle d'envoi.
  useEffect(() => {
    if (!cameraOn || status !== "live") return;
    sendFrame();
    const t = setInterval(sendFrame, INTERVAL_MS);
    return () => clearInterval(t);
  }, [cameraOn, status, sendFrame]);

  // Horloge d'affichage ("il y a 3 s").
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Session déjà en cours (page rechargée, téléphone redémarré) : on relance la caméra.
  useEffect(() => {
    if (initialStatus === "live" || initialStatus === "paused") startCamera();
    return stopCamera;
  }, [initialStatus, startCamera, stopCamera]);

  // Retour au premier plan : l'écran de veille et parfois la caméra ont été relâchés.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !wantCameraRef.current) return;
      lockScreenOn();
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || track.readyState === "ended") startCamera();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [lockScreenOn, startCamera]);

  // Batterie (Chrome Android seulement) : rappeler de brancher le téléphone.
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let bm: BatteryManager | null = null;
    const update = () => bm && setBattery({ level: bm.level, charging: bm.charging });
    nav.getBattery().then((b) => {
      bm = b;
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    });
    return () => {
      bm?.removeEventListener("levelchange", update);
      bm?.removeEventListener("chargingchange", update);
    };
  }, []);

  async function start() {
    if (!cameraOn) await startCamera();
    if (streamRef.current) await setRemoteStatus("live");
  }

  async function end() {
    if (!confirm("Terminer la session ? Le client verra l'accéléré.")) return;
    if (await setRemoteStatus("ended")) stopCamera();
  }

  const since = lastOk ? Math.round((Date.now() - lastOk) / 1000) : null;

  if (status === "ended") {
    return (
      <div className="card stack">
        <p>
          Session terminée. {sent > 0 && `${sent} images envoyées. `}Le client voit maintenant l&apos;accéléré.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="preview">
        <video ref={videoRef} playsInline muted autoPlay />
        {!cameraOn && <div className="preview-empty">Caméra éteinte</div>}
        {status === "live" && cameraOn && <span className="live-dot">EN DIRECT</span>}
        {status === "paused" && <span className="live-dot paused">COUPÉ</span>}
      </div>

      {error && <p className="error">{error}</p>}
      {battery && !battery.charging && (
        <p className="warn">
          Téléphone sur batterie ({Math.round(battery.level * 100)} %). Branchez-le pour une longue session.
        </p>
      )}

      <div className="row gap">
        {status === "pending" && (
          <button className="btn big" onClick={start}>
            Démarrer
          </button>
        )}
        {status === "live" && (
          <button className="btn big secondary" onClick={() => setRemoteStatus("paused")}>
            Couper
          </button>
        )}
        {status === "paused" && (
          <button className="btn big" onClick={start}>
            Reprendre
          </button>
        )}
        {status !== "pending" && !cameraOn && (
          <button className="btn big secondary" onClick={startCamera}>
            Rallumer la caméra
          </button>
        )}
      </div>

      {status !== "pending" && (
        <div className="row between small muted">
          <span>
            {sent} image{sent > 1 ? "s" : ""} envoyée{sent > 1 ? "s" : ""}
            {since !== null && ` · dernière il y a ${since} s`}
          </span>
          {failures > 2 && <span className="error">Réseau instable, nouvel essai…</span>}
        </div>
      )}

      {status === "live" && cameraOn && (
        <button className="btn secondary" onClick={() => setDark(true)}>
          Écran noir (économise la batterie)
        </button>
      )}
      {status !== "pending" && (
        <button className="btn danger" onClick={end}>
          Terminer la session
        </button>
      )}

      <p className="muted small">
        Posez le téléphone sur un trépied, branché sur secteur, et laissez cette page ouverte. Le verrouillage de
        l&apos;écran interrompt la capture : utilisez plutôt l&apos;écran noir.
      </p>

      {dark && (
        <button className="blackout" onClick={() => setDark(false)} aria-label="Rallumer l'écran">
          <span>
            {status === "live" ? "● En direct" : "Coupé"} · {sent} images
            <br />
            Touchez pour rallumer
          </span>
        </button>
      )}
    </div>
  );
}
