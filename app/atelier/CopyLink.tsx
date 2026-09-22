"use client";

import { useState } from "react";

/** Envoie le lien au client : feuille de partage du téléphone, ou copie à défaut. */
export function CopyLink({ url, clientName, orderName }: { url: string; clientName: string; orderName: string }) {
  const [done, setDone] = useState(false);

  async function send() {
    const text = `Bonjour ${clientName}, vous pouvez suivre la fabrication de votre commande « ${orderName} » en direct ici :`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Votre commande en fabrication", text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button type="button" className="btn secondary" onClick={send}>
      {done ? "Lien copié" : "Envoyer le lien au client"}
    </button>
  );
}
