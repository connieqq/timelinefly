import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { findUserByEmail } from "@/lib/file-db";

export async function requireUser() {
  const email = getSessionEmail();
  if (!email) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const user = await findUserByEmail(email);
  if (!user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user };
}
