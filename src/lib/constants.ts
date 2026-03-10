import type { Category } from "@/lib/types";

export const CATEGORY_META: Record<
  Category,
  { label: string; defaultColor: string }
> = {
  work: { label: "工作", defaultColor: "#14532d" },
  study: { label: "学习", defaultColor: "#1d4ed8" },
  life: { label: "生活", defaultColor: "#9a3412" },
  entertainment: { label: "娱乐", defaultColor: "#be123c" },
  exercise: { label: "运动", defaultColor: "#0369a1" },
  other: { label: "其他", defaultColor: "#4b5563" }
};

export const DEFAULT_TIMEZONE = "Asia/Shanghai";
export const MOCK_LOGIN_CODE = "123456";
export const SESSION_COOKIE = "timelinefly_session";
