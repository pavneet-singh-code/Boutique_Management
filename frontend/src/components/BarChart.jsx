"use client";

import { useState } from "react";
import { cx } from "./ui";

function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    if (value <= step * power) return step * power;
  }
  return 10 * power;
}

/**
 * Single-series column chart (one hue, so no legend — the title names it).
 * data: [{ key, label, tick, value }]
 * format: value -> display string
 */
export default function BarChart({
  data,
  format = (v) => String(v),
  tooltip,
  height = 180,
  ariaLabel,
}) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const peak = data.reduce(
    (best, d) => (d.value > (best?.value ?? 0) ? d : best),
    null
  );
  const gridLines = [1, 0.5, 0];
  const activeItem = data.find((d) => d.key === active);

  return (
    <figure className="relative pt-3" aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {/* Recessive grid */}
        {gridLines.map((fraction) => (
          <div
            key={fraction}
            className="pointer-events-none absolute inset-x-0 flex items-center"
            style={{ bottom: `${fraction * 100}%` }}
          >
            <span className="w-10 shrink-0 -translate-y-1/2 pr-2 text-right text-[10px] tabular-nums text-muted">
              {fraction === 0 ? "0" : format(max * fraction)}
            </span>
            <span
              className={cx(
                "h-px flex-1",
                fraction === 0 ? "bg-line" : "bg-line/60"
              )}
            />
          </div>
        ))}

        {/* Columns */}
        <div
          className="absolute bottom-0 left-10 right-0 top-0 flex items-end gap-[2px]"
          onMouseLeave={() => setActive(null)}
        >
          {data.map((d) => {
            const pct = (d.value / max) * 100;
            const isActive = active === d.key;
            return (
              <button
                key={d.key}
                type="button"
                aria-label={tooltip ? tooltip(d) : `${d.label}: ${format(d.value)}`}
                onMouseEnter={() => setActive(d.key)}
                onFocus={() => setActive(d.key)}
                onClick={() => setActive(isActive ? null : d.key)}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
              >
                {d.value > 0 && (
                  <span
                    className={cx(
                      "block w-full max-w-9 rounded-t-[4px] bg-accent transition-opacity",
                      active && !isActive ? "opacity-45" : "opacity-100"
                    )}
                    style={{ height: `max(${pct}%, 3px)` }}
                  />
                )}
                {peak?.key === d.key && d.value > 0 && !active && (
                  <span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-ink"
                    style={{ bottom: `calc(${pct}% + 4px)` }}
                  >
                    {format(d.value)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticks */}
      <div className="ml-10 mt-1.5 flex gap-[2px]">
        {data.map((d) => (
          <span
            key={d.key}
            className="flex min-w-0 flex-1 justify-center whitespace-nowrap text-[10px] text-muted"
          >
            {d.tick}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none absolute right-0 top-0 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-opacity",
          activeItem ? "opacity-100" : "opacity-0"
        )}
      >
        {activeItem &&
          (tooltip
            ? tooltip(activeItem)
            : `${activeItem.label}: ${format(activeItem.value)}`)}
      </div>
    </figure>
  );
}
