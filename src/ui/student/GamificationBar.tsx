import Link from "next/link";
import {
  WEEK_LABELS,
  type GamificationState,
} from "@/src/ui/student/gamification-data";

function Check() {
  return (
    <svg width="10" height="10" fill="white" viewBox="0 0 20 20" aria-hidden>
      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
    </svg>
  );
}

export function GamificationBar({ state }: { state: GamificationState }) {
  const days = state.week.filter(Boolean).length;
  const progress = ((state.todayIndex + 1) / 7) * 100;

  return (
    <>
      <div className="mb-3.5 rounded-[var(--radius-lg)] border-[1.5px] border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="font-display text-[13px] font-bold text-ink">
              🔥 {days} dias seguidos
            </span>
            <span className="ml-1.5 text-[11px] text-faint">esta semana</span>
          </div>
          <Link
            href="/student/loja"
            className="flex items-center gap-1.5 rounded-full border-[1.5px] border-gold bg-parchment px-3 py-1"
          >
            <span className="text-sm">🪙</span>
            <span className="font-display text-[13px] font-bold text-gold-deep">
              {state.coins}
            </span>
          </Link>
        </div>

        {/* Pista da semana */}
        <div className="relative h-[52px]">
          <div className="absolute inset-x-4 top-[30px] h-1 rounded bg-line" />
          <div
            className="absolute left-4 top-[30px] h-1 rounded bg-ink transition-[width]"
            style={{ width: `calc(${progress}% - 2rem)` }}
          />
          <div className="absolute inset-x-4 top-[22px] flex justify-between">
            {WEEK_LABELS.map((label, i) => {
              const done = state.week[i];
              const today = i === state.todayIndex;
              return (
                <div
                  key={label}
                  className="relative flex flex-col items-center"
                >
                  {today && (
                    <span className="absolute -top-[18px] text-sm leading-none">
                      🏃
                    </span>
                  )}
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      done
                        ? "border-transparent bg-ink"
                        : today
                          ? "border-gold bg-gold"
                          : "border-transparent bg-line"
                    }`}
                  >
                    {done && <Check />}
                  </span>
                  <span
                    className={`mt-[3px] text-[9px] ${
                      i <= state.todayIndex ? "text-ink" : "text-faint"
                    } ${today ? "font-bold" : ""}`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-0.5 flex justify-end">
          <span className="text-[10px] text-faint">
            🏁 Complete a semana e ganhe +{state.weekBonus} 🪙
          </span>
        </div>
      </div>
    </>
  );
}
