import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";

type SessionPayload = {
  email: string;
};

function encodeSession(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeSession(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as SessionPayload;
    if (!parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionEmail(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return decodeSession(token)?.email ?? null;
}

export function createSessionToken(email: string): string {
  return encodeSession({ email });
}
