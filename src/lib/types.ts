export const CATEGORIES = [
  "work",
  "study",
  "life",
  "entertainment",
  "exercise",
  "other"
] as const;

export type Category = (typeof CATEGORIES)[number];

export type User = {
  id: string;
  email: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleEntry = {
  id: string;
  userId: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  category: Category;
  intention: string;
  reality: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryStyle = {
  userId: string;
  category: Category;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
};

export type DataStore = {
  users: User[];
  schedules: ScheduleEntry[];
  styles: CategoryStyle[];
};

export type ScheduleEntryWithColor = ScheduleEntry & {
  categoryColorHex: string;
};

export type CategoryBreakdown = {
  category: Category;
  minutes: number;
  percentage: number;
  colorHex: string;
};

export type DailyStats = {
  totalMinutes: number;
  plannedMinutes: number;
  realityFilledCount: number;
  categoryBreakdown: CategoryBreakdown[];
};
