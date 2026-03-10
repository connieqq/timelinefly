import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { findUserByEmail } from "@/lib/file-db";

export async function GET() {
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      timezone: user.timezone
    }
  });
}
