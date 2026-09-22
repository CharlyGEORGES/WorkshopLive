import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ATELIER_COOKIE = "atelier";

function expectedToken(): string {
  const password = process.env.ATELIER_PASSWORD;
  if (!password) throw new Error("ATELIER_PASSWORD est requis");
  return createHmac("sha256", password).update("atelier-v1").digest("base64url");
}

export function tokenFor(password: string): string | null {
  const expected = expectedToken();
  const given = createHmac("sha256", password).update("atelier-v1").digest("base64url");
  return safeEqual(given, expected) ? expected : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Vrai si la requête vient du téléphone (ou navigateur) de l'artisan. */
export async function isAtelier(): Promise<boolean> {
  const value = (await cookies()).get(ATELIER_COOKIE)?.value;
  return !!value && safeEqual(value, expectedToken());
}
