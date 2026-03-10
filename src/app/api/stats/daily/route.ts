import { NextResponse } from "next/server";
import { computeDailyStats } from "@/lib/file-db";
import { requireUser } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const stats = await computeDailyStats(auth.user.id, date);
  return NextResponse.json({ ok: true, stats });
}
