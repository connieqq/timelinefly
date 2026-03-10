"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_META } from "@/lib/constants";
import { CATEGORIES, type Category, type DailyStats, type ScheduleEntryWithColor } from "@/lib/types";
import { categoryText, formatDateLabel, plusDays, toMinutes, todayISO } from "@/lib/utils";
import { CategoryDonut } from "@/components/category-donut";
import { ScheduleModal, type ScheduleDraft } from "@/components/schedule-modal";

type SessionPayload = {
  ok: boolean;
  user: {
    email: string;
    timezone: string;
  };
};

const PX_PER_MINUTE = 1;
const COMPACT_HEIGHT = 52;
const SHORT_INLINE_MINUTES = 45;
const HIDE_TIME_MINUTES = 60;
const SHOW_TIME_HEIGHT = 48;
const INTENTION_HEIGHT = 56;
const REALITY_HEIGHT = 72;

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(15, 23, 42, ${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error ?? "request_failed");
  }
  return payload;
}

export function TimelineApp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const deferredDate = useDeferredValue(selectedDate);
  const [styles, setStyles] = useState<Record<Category, string>>(
    CATEGORIES.reduce((acc, category) => {
      acc[category] = CATEGORY_META[category].defaultColor;
      return acc;
    }, {} as Record<Category, string>)
  );
  const [schedules, setSchedules] = useState<ScheduleEntryWithColor[]>([]);
  const [stats, setStats] = useState<DailyStats>({
    totalMinutes: 0,
    plannedMinutes: 0,
    realityFilledCount: 0,
    categoryBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEntryWithColor | null>(null);
  const [showIntention, setShowIntention] = useState(true);
  const [showReality, setShowReality] = useState(false);

  const fetchDailyData = async (date: string) => {
    const [scheduleRes, styleRes, statRes] = await Promise.all([
      requestJSON<{ ok: boolean; items: ScheduleEntryWithColor[] }>(
        `/api/schedules?date=${date}`
      ),
      requestJSON<{ ok: boolean; styles: Record<Category, string> }>(
        "/api/schedule-categories/styles"
      ),
      requestJSON<{ ok: boolean; stats: DailyStats }>(`/api/stats/daily?date=${date}`)
    ]);

    setSchedules(scheduleRes.items);
    setStyles(styleRes.styles);
    setStats(statRes.stats);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await requestJSON<SessionPayload>("/api/auth/me");
        setEmail(me.user.email);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [router]);

  useEffect(() => {
    if (!email) return;
    const refresh = async () => {
      try {
        await fetchDailyData(deferredDate);
        setError("");
      } catch {
        setError("数据刷新失败，请稍后再试。");
      }
    };
    void refresh();
  }, [email, deferredDate]);

  const saveSchedule = async (draft: ScheduleDraft, editingId?: string) => {
    if (styles[draft.category].toLowerCase() !== draft.colorHex.toLowerCase()) {
      await requestJSON(`/api/schedule-categories/styles/${draft.category}`, {
        method: "PATCH",
        body: JSON.stringify({ colorHex: draft.colorHex })
      });
    }

    if (editingId) {
      await requestJSON(`/api/schedules/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          date: draft.date,
          title: draft.title,
          startTime: draft.startTime,
          endTime: draft.endTime,
          category: draft.category,
          intention: draft.intention,
          reality: draft.reality
        })
      });
    } else {
      await requestJSON("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          date: draft.date,
          title: draft.title,
          startTime: draft.startTime,
          endTime: draft.endTime,
          category: draft.category,
          intention: draft.intention,
          reality: draft.reality
        })
      });
    }

    await fetchDailyData(draft.date);
    if (draft.date !== selectedDate) {
      startTransition(() => {
        setSelectedDate(draft.date);
      });
    }
  };

  const removeSchedule = async (entry: ScheduleEntryWithColor) => {
    const confirmed = window.confirm("确认删除该日程？");
    if (!confirmed) return;
    await requestJSON(`/api/schedules/${entry.id}`, { method: "DELETE" });
    await fetchDailyData(selectedDate);
  };

  const logout = async () => {
    await requestJSON("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const timelineHeight = 24 * 60 * PX_PER_MINUTE;
  const hourLines = useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);

  if (loading) {
    return <main className="center-page">TimelineFly 正在加载...</main>;
  }

  return (
    <main className="timeline-page">
      <div className="grain-overlay" />
      <header className="timeline-header glass">
        <div>
          <p className="eyebrow">TimelineFly</p>
          <h1>{formatDateLabel(selectedDate)}</h1>
          <p className="muted">登录邮箱：{email}</p>
        </div>

        <div className="header-actions">
          <div className="date-nav">
            <button
              type="button"
              onClick={() =>
                startTransition(() => setSelectedDate(plusDays(selectedDate, -1)))
              }
            >
              前一天
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                startTransition(() => setSelectedDate(event.target.value))
              }
            />
            <button
              type="button"
              onClick={() =>
                startTransition(() => setSelectedDate(plusDays(selectedDate, 1)))
              }
            >
              后一天
            </button>
          </div>
          <div className="stack-row">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              新建日程
            </button>
            <button type="button" className="ghost-button" onClick={logout}>
              退出
            </button>
          </div>
          <div className="display-toggles">
            <label>
              <input
                type="checkbox"
                checked={showIntention}
                onChange={(event) => setShowIntention(event.target.checked)}
              />
              显示 INTENTION
            </label>
            <label>
              <input
                type="checkbox"
                checked={showReality}
                onChange={(event) => setShowReality(event.target.checked)}
              />
              显示 REALITY
            </label>
          </div>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="content-grid">
        <article className="glass timeline-shell">
          <div className="timeline-axis" style={{ height: `${timelineHeight}px` }}>
            {hourLines.map((hour) => (
              <div
                key={hour}
                className="hour-line"
                style={{ top: `${hour * 60 * PX_PER_MINUTE}px` }}
              >
                <span>{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}

            {schedules.map((entry) => {
              const top = toMinutes(entry.startTime) * PX_PER_MINUTE;
              const durationMinutes =
                toMinutes(entry.endTime) - toMinutes(entry.startTime);
              const height = Math.max(28, durationMinutes * PX_PER_MINUTE);
              const isCompact = height < COMPACT_HEIGHT;
              const fillA = hexToRgba(entry.categoryColorHex, 0.16);
              const fillB = hexToRgba(entry.categoryColorHex, 0.28);
              const isShortInline = durationMinutes <= SHORT_INLINE_MINUTES;
              const hideTimeMeta = durationMinutes <= HIDE_TIME_MINUTES;
              const showTime = height >= SHOW_TIME_HEIGHT;
              const intentionThreshold = showTime ? INTENTION_HEIGHT : 44;
              const realityThreshold = showTime ? REALITY_HEIGHT : 60;
              const showIntentionDetail =
                showIntention && entry.intention && height >= intentionThreshold;
              const showRealityDetail =
                showReality && entry.reality && height >= realityThreshold;
              return (
                <button
                  type="button"
                  className={`schedule-block${isCompact ? " compact" : ""}`}
                  key={entry.id}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    borderColor: entry.categoryColorHex,
                    background: `linear-gradient(135deg, ${fillA}, ${fillB})`,
                    boxShadow: `0 10px 18px -18px ${hexToRgba(entry.categoryColorHex, 0.9)}`
                  }}
                  onClick={() => {
                    setEditing(entry);
                    setModalOpen(true);
                  }}
                >
                  {!hideTimeMeta && showTime ? (
                    <small>
                      {entry.startTime} - {entry.endTime} · {categoryText(entry.category)}
                    </small>
                  ) : null}
                  {isShortInline ? (
                    <div className="schedule-inline">
                      <span className="inline-title">{entry.title}</span>
                      {showIntention && entry.intention ? (
                        <span className="inline-detail">
                          INTENTION: {entry.intention}
                        </span>
                      ) : null}
                      {showReality && entry.reality ? (
                        <span className="inline-detail reality">
                          REALITY: {entry.reality}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <strong className="schedule-title">{entry.title}</strong>
                      {showIntentionDetail ? (
                        <p className="schedule-detail">INTENTION: {entry.intention}</p>
                      ) : null}
                      {showRealityDetail ? (
                        <p className="schedule-detail reality">REALITY: {entry.reality}</p>
                      ) : null}
                    </>
                  )}
                </button>
              );
            })}

            {schedules.length === 0 ? (
              <div className="empty-tip">今天还没有日程，先创建一条记录吧。</div>
            ) : null}
          </div>
        </article>

        <aside className="insight-column">
          <section className="stat-card glass">
            <h3>今日复盘</h3>
            <div className="metric-grid">
              <div>
                <p>计划时长</p>
                <strong>{formatMinutes(stats.plannedMinutes)}</strong>
              </div>
              <div>
                <p>已记录时长</p>
                <strong>{formatMinutes(stats.totalMinutes)}</strong>
              </div>
              <div>
                <p>未记录时长</p>
                <strong>{formatMinutes(Math.max(0, 1440 - stats.totalMinutes))}</strong>
              </div>
              <div>
                <p>已填写 REALITY</p>
                <strong>{stats.realityFilledCount} 条</strong>
              </div>
            </div>
          </section>

          <CategoryDonut
            totalMinutes={stats.totalMinutes}
            items={stats.categoryBreakdown}
          />

          <section className="stat-card glass">
            <h3>日程列表</h3>
            <ul className="schedule-list">
              {schedules.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <p>
                      <span
                        className="legend-dot"
                        style={{ backgroundColor: entry.categoryColorHex }}
                      />
                      {entry.startTime} - {entry.endTime} · {categoryText(entry.category)}
                    </p>
                    <strong>{entry.title}</strong>
                    <small>INTENTION: {entry.intention}</small>
                    {entry.reality ? <small>REALITY: {entry.reality}</small> : null}
                  </div>
                  <div className="list-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setEditing(entry);
                        setModalOpen(true);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger"
                      onClick={() => void removeSchedule(entry)}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>

      <ScheduleModal
        open={modalOpen}
        date={selectedDate}
        styles={styles}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={saveSchedule}
      />
    </main>
  );
}
