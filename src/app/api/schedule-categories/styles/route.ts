import { NextResponse } from "next/server";
import { getCategoryStyles } from "@/lib/file-db";
import { requireUser } from "@/lib/route-auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const styles = await getCategoryStyles(auth.user.id);
  return NextResponse.json({ ok: true, styles });
}
