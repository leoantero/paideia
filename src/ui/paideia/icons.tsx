import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

/** Bottom-nav "Ranking + Loja": one tile cut on the diagonal — trophy above, gold coin below. */
export function ArenaSplitIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {/* one rounded tile split on the diagonal, with a small gap between halves */}
      <path d="M2.5 19.7V8A5.5 5.5 0 0 1 8 2.5h11.7z" />
      <path d="M21.5 4.3V16a5.5 5.5 0 0 1-5.5 5.5H4.3z" />
      {/* upper half: trophy */}
      <path d="M4.9 4.6h5.8v2.2a2.9 2.9 0 0 1-5.8 0z" />
      <path
        d="M4.9 5.5H4a1.1 1.1 0 0 0 1.2 1.9M10.7 5.5h.9a1.1 1.1 0 0 1-1.2 1.9"
        strokeWidth={1.2}
      />
      <path d="M7.8 9.7v1.4M6.3 11.9h3" />
      {/* lower half: gold coin */}
      <circle cx="16.6" cy="16.6" r="3.8" />
      <circle cx="16.6" cy="16.6" r="1.6" strokeWidth={1.2} />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4.5a2.2 2.2 0 0 0 2.6 3.6M17 5.5h2.5a2.2 2.2 0 0 1-2.6 3.6" />
      <path d="M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" />
    </svg>
  );
}

export function TempleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9 12 4l9 5z" />
      <path d="M4.5 11h15M4 20.5h16M5 18.5h14" />
      <path d="M7 11v7.5M12 11v7.5M17 11v7.5" />
    </svg>
  );
}

export function TabletsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3.5h10a2 2 0 0 1 2 2V16" />
      <rect x="4" y="7" width="13" height="14" rx="2" />
      <path d="M7 11h7M7 14.5h5" />
    </svg>
  );
}

export function OwlIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 7.5 8 4.5l2 2h4l2-2 2.5 3V15a6.5 6.5 0 0 1-13 0z" />
      <circle cx="9.3" cy="11" r="2" />
      <circle cx="14.7" cy="11" r="2" />
      <path d="M12 13.2l-.9 1.3h1.8z" fill="currentColor" />
      <path d="M8.5 17.5h7" strokeWidth={1.1} />
    </svg>
  );
}

/** Olympic flame on a tripod brazier — the streak ("ofensiva"). */
export function FlameIcon({
  lit = true,
  ...props
}: IconProps & { lit?: boolean }) {
  return (
    <svg {...base(props)}>
      <g className={lit ? "animate-flicker" : undefined}>
        <path
          d="M12 2.8c1.6 2.4 4 3.9 4 6.7a4 4 0 0 1-8 0c0-1.5.8-2.6 1.7-3.4.2 1.1.8 1.9 1.6 2.2C10.9 6.6 11.3 4.6 12 2.8z"
          fill={lit ? "var(--terracotta)" : "none"}
          stroke={lit ? "var(--terracotta-deep)" : "currentColor"}
        />
        {lit && (
          <path
            d="M12 8.2c.8 1 1.6 1.6 1.6 2.6a1.6 1.6 0 0 1-3.2 0c0-.8.6-1.6 1.6-2.6z"
            fill="var(--gold)"
            stroke="none"
          />
        )}
      </g>
      <path d="M5.5 14.5h13l-2 3.5h-9z" />
      <path d="M9 18l-1.6 3M15 18l1.6 3M12 18v3" />
    </svg>
  );
}

export function FreezeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.5 20.2 7.2v9.6L12 21.5l-8.2-4.7V7.2z" />
      <path
        d="M12 6.5v11M7.2 9.2l9.6 5.6M16.8 9.2l-9.6 5.6"
        strokeWidth={1.3}
      />
      <path
        d="M10.6 7.5 12 8.7l1.4-1.2M10.6 16.5 12 15.3l1.4 1.2"
        strokeWidth={1.1}
      />
    </svg>
  );
}

/** Ajustes: a plain gear, drawn with the same stroke as the rest of the set. */
export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
      <circle cx="12" cy="12" r="6.6" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
    </svg>
  );
}

export function ArrowDeltaIcon({
  direction,
  ...props
}: IconProps & { direction: "up" | "down" }) {
  return (
    <svg {...base({ size: 12, ...props })} viewBox="0 0 12 12" strokeWidth={0}>
      <path
        d={direction === "up" ? "M6 2 11 9H1z" : "M6 10 1 3h10z"}
        fill="currentColor"
      />
    </svg>
  );
}

/** Athenian drachma: a gold coin stamped with Athena's owl. */
export function DrachmaCoin({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden
    >
      <circle
        cx="20"
        cy="20"
        r="18.5"
        fill="var(--gold)"
        stroke="var(--gold-deep)"
        strokeWidth="1.5"
      />
      <circle
        cx="20"
        cy="20"
        r="14.5"
        fill="none"
        stroke="var(--gold-deep)"
        strokeWidth="1"
        strokeDasharray="1.5 2"
      />
      <path
        d="M14 15.5 16 12.5l1.8 1.8h4.4L24 12.5l2 3v7a6 6 0 0 1-12 0z"
        fill="var(--gold-deep)"
        opacity="0.85"
      />
      <circle cx="17.3" cy="18.4" r="1.9" fill="var(--gold-soft)" />
      <circle cx="22.7" cy="18.4" r="1.9" fill="var(--gold-soft)" />
      <circle cx="17.3" cy="18.4" r="0.8" fill="var(--gold-deep)" />
      <circle cx="22.7" cy="18.4" r="0.8" fill="var(--gold-deep)" />
      <path
        d="M11 29.5c2.5 1.5 5.5 2.3 9 2.3s6.5-.8 9-2.3"
        fill="none"
        stroke="var(--gold-deep)"
        strokeWidth="1"
      />
    </svg>
  );
}

/** Laurel wreath — generated leaves along two arcs. */
export function Laurel({
  size = 64,
  className,
  color = "var(--olive)",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  // Rounded so server and browser render identical attributes (hydration).
  const round = (n: number) => Math.round(n * 100) / 100;
  const leaves: Array<{ x: number; y: number; angle: number }> = [];
  for (let i = 0; i < 7; i++) {
    const t = 0.12 + i * 0.12;
    const angle = Math.PI * (0.62 + t * 0.78);
    leaves.push({
      x: round(32 + 24 * Math.cos(angle)),
      y: round(34 - 24 * Math.sin(angle)),
      angle: round((angle * 180) / Math.PI),
    });
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      {[1, -1].map((side) => (
        <g
          key={side}
          transform={side === -1 ? "translate(64 0) scale(-1 1)" : undefined}
        >
          <path
            d="M30 58C14 54 7 40 9.5 22"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {leaves.map((leaf, i) => (
            <ellipse
              key={i}
              cx={leaf.x}
              cy={round(68 - leaf.y)}
              rx="5.2"
              ry="2.3"
              fill={color}
              transform={`rotate(${round(leaf.angle - 150)} ${leaf.x} ${round(68 - leaf.y)})`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
