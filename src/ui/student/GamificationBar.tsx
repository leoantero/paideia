"use client";

import { useState } from "react";
import {
  REWARDS,
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
  const [showCoins, setShowCoins] = useState(false);
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
          <button
            type="button"
            onClick={() => setShowCoins(true)}
            className="flex items-center gap-1.5 rounded-full border-[1.5px] border-gold bg-parchment px-3 py-1"
          >
            <span className="text-sm">🪙</span>
            <span className="font-display text-[13px] font-bold text-gold-deep">
              {state.coins}
            </span>
          </button>
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
                <div key={label} className="relative flex flex-col items-center">
                  {today && (
                    <span className="absolute -top-[18px] text-sm leading-none">🏃</span>
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

      {showCoins && (
        <CoinsSheet coins={state.coins} onClose={() => setShowCoins(false)} />
      )}
    </>
  );
}

function CoinsSheet({ coins, onClose }: { coins: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/30"
      onClick={onClose}
    >
      <div
        className="max-h-[80dvh] w-full max-w-[420px] overflow-y-auto rounded-t-[20px] bg-surface px-5 pb-9 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <div className="font-display text-[20px] font-extrabold text-ink">
              Suas moedas 🪙
            </div>
            <div className="text-[13px] text-muted">Troque por personalizações</div>
          </div>
          <div className="rounded-[20px] border-2 border-gold bg-parchment px-4 py-1.5">
            <span className="font-display text-[22px] font-extrabold text-gold-deep">
              {coins}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {REWARDS.map((r) => {
            const canBuy = coins >= r.cost && r.available;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-[12px] border-[1.5px] border-line bg-bg px-3.5 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[22px]">{r.icon}</span>
                  <span className="text-sm font-semibold text-ink">{r.name}</span>
                </div>
                <button
                  type="button"
                  disabled={!canBuy}
                  className={`rounded-[10px] px-3.5 py-1.5 font-display text-xs font-bold ${
                    canBuy ? "bg-ink text-white" : "bg-line text-faint"
                  }`}
                >
                  {r.cost} 🪙
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          Ganhe moedas completando a semana de estudos e acertando cards de revisão.
        </p>
      </div>
    </div>
  );
}
