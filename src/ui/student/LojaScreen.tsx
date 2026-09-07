import {
  REWARDS,
  type GamificationState,
} from "@/src/ui/student/gamification-data";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";

export function LojaScreen({ state }: { state: GamificationState }) {
  return (
    <ScreenBody>
      <ScreenHeader
        title="Loja"
        subtitle="Troque moedas por personalizações"
        action={
          <div className="rounded-[16px] border-2 border-gold bg-parchment px-3.5 py-1.5">
            <span className="font-display text-lg font-extrabold text-gold-deep">
              🪙 {state.coins}
            </span>
          </div>
        }
      />

      <div className="flex flex-col gap-2.5">
        {REWARDS.map((r) => {
          const canBuy = state.coins >= r.cost && r.available;
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-[14px] border-[1.5px] border-line bg-surface px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-bg text-[22px]">
                  {r.icon}
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">{r.name}</div>
                  {!r.available && (
                    <div className="text-xs text-faint">Em breve</div>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={!canBuy}
                className={`rounded-[10px] px-3.5 py-2 font-display text-xs font-bold ${
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
        Ganhe moedas completando a semana de estudos e acertando cards de
        revisão.
      </p>
    </ScreenBody>
  );
}
