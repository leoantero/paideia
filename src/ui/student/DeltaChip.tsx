import { ArrowDeltaIcon } from "@/src/ui/paideia/icons";

/** Positions moved in the ranking since yesterday: ▲ gained, ▼ lost, — unchanged. */
export function DeltaChip({ delta, compact = false }: { delta: number | null; compact?: boolean }) {
  if (delta === null) {
    return compact ? null : (
      <span className="rounded-full bg-marble-deep px-2 py-0.5 text-[11px] font-semibold text-ink-soft">novo</span>
    );
  }
  if (delta === 0) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-marble-deep px-2 py-0.5 text-[11px] font-bold text-ink-soft"
        aria-label="Mesma posição de ontem"
      >
        —
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
        up ? "bg-olive-soft text-olive" : "bg-terracotta-soft text-terracotta"
      }`}
      aria-label={up ? `Subiu ${delta} posições desde ontem` : `Desceu ${-delta} posições desde ontem`}
    >
      <ArrowDeltaIcon direction={up ? "up" : "down"} size={10} />
      {Math.abs(delta)}
    </span>
  );
}
