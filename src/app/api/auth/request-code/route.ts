import { NextResponse } from "next/server";
import { MOCK_LOGIN_CODE } from "@/lib/constants";
import { isValidEmail } from "@/lib/utils";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    devHint: `开发环境验证码: ${MOCK_LOGIN_CODE}`
  });
}
