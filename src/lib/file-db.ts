import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CATEGORY_META, DEFAULT_TIMEZONE } from "@/lib/constants";
import { CATEGORIES, type Category, type DailyStats, type DataStore, type ScheduleEntry, type ScheduleEntryWithColor, type User } from "@/lib/types";
import { durationMinutes, isValidColorHex } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "app-data.json");

const EMPTY_DATA: DataStore = {
  users: [],
  schedules: [],
  styles: []
};

function sanitizeScheduleEntry(input: Partial<ScheduleEntry>): ScheduleEntry | null {
  if (
    !input.id ||
    !input.userId ||
    !input.date ||
    !input.startTime ||
    !input.endTime ||
    !input.createdAt ||
    !input.updatedAt
  ) {
    return null;
  }

  const category = CATEGORIES.includes(input.category as Category)
    ? (input.category as Category)
    : "other";

  const trimmedTitle = input.title?.trim() ?? "";
  const fallbackTitle = input.intention?.trim() || "未命名日程";

  return {
    id: input.id,
    userId: input.userId,
    date: input.date,
    title: trimmedTitle.length > 0 ? trimmedTitle : fallbackTitle,
    startTime: input.startTime,
    endTime: input.endTime,
    category,
    intention: input.intention ?? "",
    reality: input.reality ?? "",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2), "utf8");
  }
}

async function readData(): Promise<DataStore> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");
  try {
    const data = JSON.parse(raw) as DataStore;
    const schedules = Array.isArray(data.schedules)
      ? data.schedules
          .map((entry) => sanitizeScheduleEntry(entry))
          .filter((entry): entry is ScheduleEntry => entry !== null)
      : [];
    return {
      users: Array.isArray(data.users) ? data.users : [],
      schedules,
      styles: Array.isArray(data.styles) ? data.styles : []
    };
  } catch {
    return { ...EMPTY_DATA };
  }
}

async function writeData(data: DataStore): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const data = await readData();
  return data.users.find((user) => user.email === email) ?? null;
}

export async function upsertUserByEmail(email: string, timezone?: string): Promise<User> {
  const data = await readData();
  const now = new Date().toISOString();
  const existing = data.users.find((user) => user.email === email);

  if (existing) {
    existing.timezone = timezone ?? existing.timezone;
    existing.updatedAt = now;
    await writeData(data);
    return existing;
  }

  const user: User = {
    id: randomUUID(),
    email,
    timezone: timezone ?? DEFAULT_TIMEZONE,
    createdAt: now,
    updatedAt: now
  };
  data.users.push(user);
  await writeData(data);
  return user;
}

export async function getCategoryStyles(userId: string): Promise<Record<Category, string>> {
  const data = await readData();
  const map = {} as Record<Category, string>;
  for (const category of CATEGORIES) {
    map[category] = CATEGORY_META[category].defaultColor;
  }

  const userStyles = data.styles.filter((style) => style.userId === userId);
  for (const style of userStyles) {
    map[style.category] = style.colorHex;
  }
  return map;
}

export async function setCategoryStyle(
  userId: string,
  category: Category,
  colorHex: string
): Promise<string> {
  if (!isValidColorHex(colorHex)) {
    throw new Error("invalid_color");
  }

  const data = await readData();
  const now = new Date().toISOString();
  const existing = data.styles.find(
    (style) => style.userId === userId && style.category === category
  );
  if (existing) {
    existing.colorHex = colorHex;
    existing.updatedAt = now;
  } else {
    data.styles.push({
      userId,
      category,
      colorHex,
      createdAt: now,
      updatedAt: now
    });
  }
  await writeData(data);
  return colorHex;
}

export async function listSchedulesByDate(
  userId: string,
  date: string
): Promise<ScheduleEntryWithColor[]> {
  const data = await readData();
  const styles = await getCategoryStyles(userId);
  return data.schedules
    .filter((entry) => entry.userId === userId && entry.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((entry) => ({
      ...entry,
      categoryColorHex: styles[entry.category]
    }));
}

export type UpsertScheduleInput = {
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  category: Category;
  intention: string;
  reality?: string;
};

export async function createSchedule(
  userId: string,
  input: UpsertScheduleInput
): Promise<ScheduleEntry> {
  const data = await readData();
  const now = new Date().toISOString();
  const entry: ScheduleEntry = {
    id: randomUUID(),
    userId,
    date: input.date,
    title: input.title,
    startTime: input.startTime,
    endTime: input.endTime,
    category: input.category,
    intention: input.intention,
    reality: input.reality ?? "",
    createdAt: now,
    updatedAt: now
  };
  data.schedules.push(entry);
  await writeData(data);
  return entry;
}

export async function updateSchedule(
  userId: string,
  scheduleId: string,
  input: UpsertScheduleInput
): Promise<ScheduleEntry | null> {
  const data = await readData();
  const existing = data.schedules.find(
    (entry) => entry.id === scheduleId && entry.userId === userId
  );
  if (!existing) {
    return null;
  }
  existing.date = input.date;
  existing.title = input.title;
  existing.startTime = input.startTime;
  existing.endTime = input.endTime;
  existing.category = input.category;
  existing.intention = input.intention;
  existing.reality = input.reality ?? "";
  existing.updatedAt = new Date().toISOString();
  await writeData(data);
  return existing;
}

export async function deleteSchedule(userId: string, scheduleId: string): Promise<boolean> {
  const data = await readData();
  const next = data.schedules.filter(
    (entry) => !(entry.id === scheduleId && entry.userId === userId)
  );
  if (next.length === data.schedules.length) {
    return false;
  }
  data.schedules = next;
  await writeData(data);
  return true;
}

export async function computeDailyStats(userId: string, date: string): Promise<DailyStats> {
  const list = await listSchedulesByDate(userId, date);
  const totalMinutes = list.reduce(
    (sum, entry) => sum + Math.max(0, durationMinutes(entry.startTime, entry.endTime)),
    0
  );
  const realityFilledCount = list.filter((entry) => entry.reality.trim().length > 0).length;

  const byCategory = new Map<Category, number>();
  for (const category of CATEGORIES) {
    byCategory.set(category, 0);
  }
  for (const entry of list) {
    byCategory.set(
      entry.category,
      (byCategory.get(entry.category) ?? 0) +
        Math.max(0, durationMinutes(entry.startTime, entry.endTime))
    );
  }

  const categoryBreakdown = CATEGORIES.map((category) => {
    const minutes = byCategory.get(category) ?? 0;
    const percentage = totalMinutes === 0 ? 0 : Number(((minutes / totalMinutes) * 100).toFixed(1));
    return {
      category,
      minutes,
      percentage,
      colorHex: list.find((entry) => entry.category === category)?.categoryColorHex ?? CATEGORY_META[category].defaultColor
    };
  }).filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMinutes,
    plannedMinutes: totalMinutes,
    realityFilledCount,
    categoryBreakdown
  };
}
