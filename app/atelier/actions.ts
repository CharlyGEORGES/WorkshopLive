"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATELIER_COOKIE, isAtelier, tokenFor } from "@/lib/auth";
import { newSlug } from "@/lib/sessions";
import { db } from "@/lib/supabase";

export async function login(formData: FormData) {
  const token = tokenFor(String(formData.get("password") ?? ""));
  if (!token) redirect("/atelier?erreur=1");
  (await cookies()).set(ATELIER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/atelier");
}

export async function logout() {
  (await cookies()).delete(ATELIER_COOKIE);
  redirect("/atelier");
}

export async function createSession(formData: FormData) {
  if (!(await isAtelier())) redirect("/atelier");
  const order = String(formData.get("order") ?? "").trim().slice(0, 120);
  const client = String(formData.get("client") ?? "").trim().slice(0, 120);
  if (!order || !client) redirect("/atelier");

  const { data, error } = await db()
    .from("sessions")
    .insert({ slug: newSlug(), order_name: order, client_name: client })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/atelier/${data.id}`);
}
