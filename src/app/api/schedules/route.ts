import { NextResponse } from "next/server";
import { CATEGORIES, type Category } from "@/lib/types";
import { createSchedule, listSchedulesByDate } from "@/lib/file-db";
import { requireUser } from "@/lib/route-auth";
import { durationMinutes, isValidTime } from "@/lib/utils";

type ScheduleBody = {
  date?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  intention?: string;
  reality?: string;
};

function validateBody(body: ScheduleBody): string | null {
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return "invalid_date";
  if (!body.title || body.title.trim().length === 0) return "invalid_title";
  if (body.title.length > 80) return "title_too_long";
  if (!body.startTime || !isValidTime(body.startTime)) return "invalid_start_time";
  if (!body.endTime || !isValidTime(body.endTime)) return "invalid_end_time";
  if (durationMinutes(body.startTime, body.endTime) <= 0) return "invalid_time_range";
  if (!body.category || !CATEGORIES.includes(body.category as Category))
    return "invalid_category";
  if (!body.intention || body.intention.trim().length === 0) return "invalid_intention";
  if (body.intention.length > 300) return "intention_too_long";
  if ((body.reality ?? "").length > 500) return "reality_too_long";
  return null;
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const items = await listSchedulesByDate(auth.user.id, date);
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as ScheduleBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const item = await createSchedule(auth.user.id, {
    date: body.date!,
    title: body.title!.trim(),
    startTime: body.startTime!,
    endTime: body.endTime!,
    category: body.category as Category,
    intention: body.intention!.trim(),
    reality: body.reality?.trim() ?? ""
  });

  return NextResponse.json({ ok: true, item });
}
