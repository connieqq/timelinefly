"use client";

import { FormEvent, useEffect, useState } from "react";
import { CATEGORIES, type Category, type ScheduleEntryWithColor } from "@/lib/types";
import { categoryText } from "@/lib/utils";

export type ScheduleDraft = {
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  category: Category;
  colorHex: string;
  intention: string;
  reality: string;
};

type Props = {
  open: boolean;
  date: string;
  styles: Record<Category, string>;
  editing: ScheduleEntryWithColor | null;
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft, editingId?: string) => Promise<void>;
};

export function ScheduleModal({
  open,
  date,
  styles,
  editing,
  onClose,
  onSubmit
}: Props) {
  const [draft, setDraft] = useState<ScheduleDraft>({
    date,
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    category: "work",
    colorHex: styles.work,
    intention: "",
    reality: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDraft({
        date: editing.date,
        title: editing.title,
        startTime: editing.startTime,
        endTime: editing.endTime,
        category: editing.category,
        colorHex: styles[editing.category] ?? editing.categoryColorHex,
        intention: editing.intention,
        reality: editing.reality
      });
      return;
    }

    setDraft((prev) => ({
      ...prev,
      date,
      title: "",
      category: "work",
      colorHex: styles.work,
      intention: "",
      reality: ""
    }));
  }, [open, editing, date, styles]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (draft.title.trim().length === 0) {
      setError("请填写日程标题。");
      return;
    }
    if (draft.intention.trim().length === 0) {
      setError("请填写 INTENTION。");
      return;
    }
    if (draft.startTime >= draft.endTime) {
      setError("结束时间必须晚于开始时间。");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          ...draft,
          title: draft.title.trim(),
          intention: draft.intention.trim(),
          reality: draft.reality.trim()
        },
        editing?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-mask" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-head">
          <h3>{editing ? "编辑日程" : "新建日程"}</h3>
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
        </div>

        <div className="form-grid">
          <label>
            日程标题
            <input
              type="text"
              value={draft.title}
              maxLength={80}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="例如：深度工作 - 需求分析"
              required
            />
          </label>
          <label>
            日期
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, date: event.target.value }))
              }
              required
            />
          </label>
          <label>
            类型
            <select
              value={draft.category}
              onChange={(event) => {
                const next = event.target.value as Category;
                setDraft((prev) => ({
                  ...prev,
                  category: next,
                  colorHex: styles[next]
                }));
              }}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryText(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            开始
            <input
              type="time"
              value={draft.startTime}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, startTime: event.target.value }))
              }
              required
            />
          </label>
          <label>
            结束
            <input
              type="time"
              value={draft.endTime}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, endTime: event.target.value }))
              }
              required
            />
          </label>
          <label>
            类型颜色
            <div className="color-input-row">
              <input
                type="color"
                value={draft.colorHex}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, colorHex: event.target.value }))
                }
              />
              <input
                type="text"
                value={draft.colorHex}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, colorHex: event.target.value }))
                }
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </label>
        </div>

        <label>
          INTENTION（计划）
          <textarea
            value={draft.intention}
            maxLength={300}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, intention: event.target.value }))
            }
            required
          />
        </label>

        <label>
          REALITY（执行结果）
          <textarea
            value={draft.reality}
            maxLength={500}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, reality: event.target.value }))
            }
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="modal-foot">
          <button type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存日程"}
          </button>
        </div>
      </form>
    </div>
  );
}
