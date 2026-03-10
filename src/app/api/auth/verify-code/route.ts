import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { MOCK_LOGIN_CODE, SESSION_COOKIE } from "@/lib/constants";
import { upsertUserByEmail } from "@/lib/file-db";
import { isValidEmail } from "@/lib/utils";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; code?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const code = body?.code?.trim() ?? "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (code !== MOCK_LOGIN_CODE) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const user = await upsertUserByEmail(email);
  const response = NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      timezone: user.timezone
    }
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
