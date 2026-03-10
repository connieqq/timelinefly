"use client";

import type { CategoryBreakdown } from "@/lib/types";
import { categoryText } from "@/lib/utils";

type Props = {
  totalMinutes: number;
  items: CategoryBreakdown[];
};

function formatMinutes(value: number): string {
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function CategoryDonut({ totalMinutes, items }: Props) {
  if (items.length === 0) {
    return (
      <section className="stat-card">
        <h3>类型分布</h3>
        <p className="muted">暂无复盘数据</p>
      </section>
    );
  }

  let cursor = 0;
  const segments = items.map((item) => {
    const start = cursor;
    cursor += item.percentage;
    return {
      ...item,
      start,
      end: cursor
    };
  });

  const chart = `conic-gradient(${segments
    .map((segment) => {
      return `${segment.colorHex} ${segment.start}% ${segment.end}%`;
    })
    .join(", ")})`;

  return (
    <section className="stat-card">
      <h3>类型分布</h3>
      <div className="donut-layout">
        <div className="donut" style={{ backgroundImage: chart }}>
          <div className="donut-core">
            <p>总计</p>
            <strong>{formatMinutes(totalMinutes)}</strong>
          </div>
        </div>
        <ul className="legend-list">
          {items.map((item) => (
            <li key={item.category}>
              <span
                className="legend-dot"
                style={{ backgroundColor: item.colorHex }}
              />
              <span>{categoryText(item.category)}</span>
              <span className="legend-value">
                {formatMinutes(item.minutes)} · {item.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
