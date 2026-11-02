import Link from "next/link";
import {
  SIMULATIONS,
  type SimulationMeta,
  type SimulationTone,
} from "@/src/features/simulations/catalog";
import { CheckIcon, ChevronRightIcon } from "@/src/ui/paideia/line-icons";

const TILE: Record<SimulationTone, string> = {
  lamp: "bg-lamp",
  lavender: "bg-lavender",
  glauco: "bg-glauco",
  coral: "bg-coral",
};

/** Miniaturas em SVG, no espírito das pranchas: um desenho por simulação. */
function Thumb({ slug }: { slug: string }) {
  const common = {
    viewBox: "0 0 84 64",
    className: "h-full w-full",
    "aria-hidden": true,
  };
  switch (slug) {
    case "fracoes-pizza":
      return (
        <svg {...common}>
          <circle cx={42} cy={32} r={24} fill="#e2a23a" />
          <circle cx={42} cy={32} r={21} fill="#fbe8bd" />
          <path d="M42 32 L42 11 A21 21 0 0 1 63 32 Z" fill="#e48e78" />
          <path d="M42 11 V53 M21 32 H63" stroke="#fff4d9" strokeWidth={2} />
        </svg>
      );
    case "termometro-elevador":
      return (
        <svg {...common}>
          <rect
            x={22}
            y={6}
            width={22}
            height={52}
            rx={3}
            fill="#f3f2ee"
            stroke="#2f3f74"
            strokeWidth={2}
          />
          <path d="M22 34 H44" stroke="#2f3f74" strokeWidth={2} />
          <rect x={27} y={40} width={12} height={10} rx={2} fill="#1c2a4a" />
          <rect
            x={56}
            y={8}
            width={8}
            height={40}
            rx={4}
            fill="#f3f2ee"
            stroke="#2f3f74"
            strokeWidth={2}
          />
          <circle cx={60} cy={52} r={7} fill="#7f93d4" />
          <rect x={58} y={30} width={4} height={20} fill="#7f93d4" />
        </svg>
      );
    case "balanca-equacao":
      return (
        <svg {...common}>
          <path d="M42 18 L36 56 H48 Z" fill="#1f4f4c" />
          <rect x={12} y={16} width={60} height={4} rx={2} fill="#1c2a4a" />
          <rect x={14} y={30} width={10} height={10} rx={2} fill="#1c2a4a" />
          <circle cx={32} cy={35} r={5} fill="#e2a23a" />
          <circle cx={56} cy={35} r={5} fill="#e2a23a" />
          <circle cx={67} cy={35} r={5} fill="#e2a23a" />
          <path
            d="M10 42 Q22 48 36 42 M48 42 Q62 48 74 42"
            stroke="#1f4f4c"
            strokeWidth={2}
            fill="none"
          />
        </svg>
      );
    case "receita-proporcao":
      return (
        <svg {...common}>
          <path
            d="M18 30 H66 L60 54 H24 Z"
            fill="#f3f2ee"
            stroke="#8a2f1c"
            strokeWidth={2}
          />
          <circle
            cx={34}
            cy={24}
            r={7}
            fill="#fbefd3"
            stroke="#8a2f1c"
            strokeWidth={1.5}
          />
          <circle
            cx={50}
            cy={22}
            r={7}
            fill="#fbefd3"
            stroke="#8a2f1c"
            strokeWidth={1.5}
          />
          <path d="M28 40 H56" stroke="#8a2f1c" strokeWidth={2} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect
            x={10}
            y={10}
            width={64}
            height={44}
            fill="none"
            stroke="#e4e8e6"
            strokeWidth={1}
          />
          <rect
            x={16}
            y={18}
            width={30}
            height={30}
            fill="#d8eeea"
            stroke="#1f4f4c"
            strokeWidth={2.5}
            strokeDasharray="4 3"
          />
          <rect
            x={52}
            y={30}
            width={18}
            height={18}
            fill="none"
            stroke="#2a6663"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        </svg>
      );
  }
}

/** Lista de simulações (prancha `TelaSimulacoes`). */
export function SimulacoesView({
  completed,
  basePath = "/student",
}: {
  completed: string[];
  basePath?: string;
}) {
  const [featured, ...rest] = SIMULATIONS;
  const done = new Set(completed);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] leading-tight">Simulações</h1>
        <p className="text-sm leading-[1.45] text-muted">
          Mexa, teste, quebre. Enxergue o conceito antes de fazer a conta.
        </p>
      </div>

      <Link
        href={`${basePath}/simulacoes/${featured.slug}`}
        className="overflow-hidden rounded-[16px] bg-surface"
      >
        <div
          className={`relative grid h-[180px] place-items-center ${TILE[featured.tone]}`}
        >
          <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em]">
            {done.has(featured.slug) ? "Concluída" : "Interativa"}
          </span>
          <div className="h-[140px] w-[180px]">
            <Thumb slug={featured.slug} />
          </div>
        </div>
        <div className="flex flex-col gap-1 px-4 py-4">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
            {featured.grade} · {featured.topic}
          </span>
          <span className="font-display text-[21px]">{featured.title}</span>
          <span className="text-[14px] leading-snug text-muted">
            {featured.description}
          </span>
        </div>
      </Link>

      <ul className="flex flex-col gap-3">
        {rest.map((sim) => (
          <SimRow
            key={sim.slug}
            sim={sim}
            done={done.has(sim.slug)}
            basePath={basePath}
          />
        ))}
      </ul>
    </div>
  );
}

function SimRow({
  sim,
  done,
  basePath,
}: {
  sim: SimulationMeta;
  done: boolean;
  basePath: string;
}) {
  return (
    <li>
      <Link
        href={`${basePath}/simulacoes/${sim.slug}`}
        className="flex items-center gap-3.5 rounded-[14px] bg-surface p-3"
      >
        <span
          className={`relative h-16 w-[84px] shrink-0 overflow-hidden rounded-[10px] ${TILE[sim.tone]}`}
        >
          <Thumb slug={sim.slug} />
          {done && (
            <span
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-glauco text-on-glauco"
              aria-label="Concluída"
            >
              <CheckIcon size={12} strokeWidth={3} />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted">
            {sim.grade} · {sim.topic}
          </span>
          <span className="text-[15px] font-bold leading-snug">
            {sim.title}
          </span>
          <span className="line-clamp-2 text-[13px] leading-snug text-muted">
            {sim.description}
          </span>
        </span>
        <ChevronRightIcon size={18} className="shrink-0 text-faint" />
      </Link>
    </li>
  );
}
