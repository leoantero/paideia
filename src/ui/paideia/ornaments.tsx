import { useId } from "react";

/** Greek key (meander) band. Stretches to its container width. */
export function Meander({
  height = 14,
  color = "currentColor",
  className,
}: {
  height?: number;
  color?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <svg width="100%" height={height} className={className} aria-hidden>
      <defs>
        <pattern
          id={id}
          width={height}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={meanderUnit(height)}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1.2, height / 10)}
            strokeLinecap="square"
          />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

function meanderUnit(s: number) {
  const u = s / 10;
  // A single key: runs along the base, climbs, and spirals inward.
  return [
    `M0 ${9 * u} H${10 * u}`,
    `M${u} ${9 * u} V${u} H${9 * u} V${7 * u} H${3 * u} V${3 * u} H${7 * u} V${5 * u} H${5 * u}`,
  ].join(" ");
}

/**
 * Daily goal as an amphora that fills with wine-dark terracotta as the
 * student studies. `progress` is 0–1.
 */
export function AmphoraGauge({
  progress,
  size = 120,
}: {
  progress: number;
  size?: number;
}) {
  const clip = useId();
  const band = useId();
  const clamped = Math.max(0, Math.min(1, progress));
  const bodyTop = 30;
  const bodyBottom = 130;
  const fillY = bodyBottom - (bodyBottom - bodyTop) * clamped;
  const silhouette =
    "M38 8 H62 L59.5 16 Q57.5 24 60 31 Q84 41 84 71 Q84 103 60 121 L63 131 H37 L40 121 Q16 103 16 71 Q16 41 40 31 Q42.5 24 40.5 16 Z";

  return (
    <svg
      width={size * (100 / 140)}
      height={size}
      viewBox="0 0 100 140"
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <path d={silhouette} />
        </clipPath>
        <pattern id={band} width="8" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0 7.2H8M.8 7.2V.8H7.2V5.6H2.4V2.4H5.6V4"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1"
            opacity="0.55"
          />
        </pattern>
      </defs>
      <path
        d="M40 30 Q20 28 25 52"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M60 30 Q80 28 75 52"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d={silhouette} fill="var(--terracotta-soft)" />
      <g clipPath={`url(#${clip})`}>
        <rect
          x="0"
          y={fillY}
          width="100"
          height={140 - fillY}
          fill="var(--terracotta)"
          style={{
            transition:
              "y 0.8s cubic-bezier(0.2,0.8,0.2,1), height 0.8s cubic-bezier(0.2,0.8,0.2,1)",
          }}
        />
        {clamped > 0 && clamped < 1 && (
          <path
            d={`M0 ${fillY} Q12.5 ${fillY - 3} 25 ${fillY} T50 ${fillY} T75 ${fillY} T100 ${fillY}`}
            fill="none"
            stroke="var(--terracotta-deep)"
            strokeWidth="1.5"
          />
        )}
        <rect x="0" y="62" width="100" height="10" fill={`url(#${band})`} />
      </g>
      <path d={silhouette} fill="none" stroke="var(--ink)" strokeWidth="2.2" />
      <path
        d="M38 8 H62"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Greek capital letters used to label multiple-choice options. */
export const GREEK_LETTERS = ["Α", "Β", "Γ", "Δ", "Ε"];
