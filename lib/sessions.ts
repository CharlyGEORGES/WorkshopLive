import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./supabase";

export type Status = "pending" | "live" | "paused" | "ended";

export type Session = {
  id: string;
  slug: string;
  order_name: string;
  client_name: string;
  status: Status;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_frame_path: string | null;
  last_frame_at: string | null;
  last_archived_at: string | null;
  archived_count: number;
};

/** 128 bits aléatoires : le lien fait office de clé. */
export function newSlug(): string {
  return randomBytes(16).toString("base64url");
}

const SLUG_RE = /^[A-Za-z0-9_-]{22}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function sessionBySlug(slug: string): Promise<Session | null> {
  if (!SLUG_RE.test(slug)) return null;
  const { data } = await db().from("sessions").select("*").eq("slug", slug).maybeSingle();
  return data as Session | null;
}

export async function sessionById(id: string): Promise<Session | null> {
  if (!UUID_RE.test(id)) return null;
  const { data } = await db().from("sessions").select("*").eq("id", id).maybeSingle();
  return data as Session | null;
}
