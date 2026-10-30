import type { SVGProps } from "react";

/**
 * Ícones de traço do redesign Glaukópis (design/redesign-glaukopis/telas/).
 * Os caminhos são os das pranchas; o traço herda a cor do texto.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
  strokeWidth?: number;
};

function lineIcon(d: string, defaultStroke = 1.6) {
  return function LineIcon({
    size = 22,
    strokeWidth = defaultStroke,
    ...rest
  }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...rest}
      >
        <path d={d} />
      </svg>
    );
  };
}

/** Início: o frontão do templo. */
export const PedimentIcon = lineIcon(
  "M3 9 12 4l9 5zM4.5 11h15M4 20.5h16M5 18.5h14M7 11v7.5M12 11v7.5M17 11v7.5"
);
/** Tutor: a coruja de Atena. */
export const OwlLineIcon = lineIcon(
  "M5 9c0-3.3 3-5.5 7-5.5S19 5.7 19 9v5.5c0 3.6-3.1 6.5-7 6.5s-7-2.9-7-6.5zM7.2 10.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12.8 10.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M11.2 14l.8 1.2.8-1.2"
);
/** Revisar: dois cards sobrepostos. */
export const CardsIcon = lineIcon(
  "M4 5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4 17.5zM14 7h4.5A1.5 1.5 0 0 1 20 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5V19M7 8h4M7 11h4"
);
/** Questões: folha com visto. */
export const QuestionsIcon = lineIcon(
  "M6 3.5h9l3 3v14H6zM15 3.5v3h3M9 11l1.6 1.6L14 9.2M9 16.5h6"
);
/** Simulação: tela com play. */
export const SimulationIcon = lineIcon(
  "M3.5 5.5h17v13h-17zM10 9.2v5.6l4.8-2.8z"
);
/** Pódio: a taça. */
export const CupIcon = lineIcon(
  "M7 4h10v5a5 5 0 0 1-10 0zM7 5.5H4.5a2.2 2.2 0 0 0 2.6 3.6M17 5.5h2.5a2.2 2.2 0 0 1-2.6 3.6M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z"
);
export const GearLineIcon = lineIcon(
  "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
  1.7
);
/** Ofensiva: a chama. */
export const FlameLineIcon = lineIcon(
  "M12 3c.8 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2.2-4.8.1 1.9.9 3 2 3.3-.3-3 .1-5.6.8-8.5z",
  1.7
);
/** Responsável · Painel. */
export const GridIcon = lineIcon(
  "M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z"
);
/** Responsável · Conselheiro: a lamparina. */
export const LampIcon = lineIcon(
  "M3 13c2.5 3 6 4 9.5 4H17c2 0 3.5-1.5 3.5-3.5 0-.8-.6-1.5-1.5-1.5H12C9 12 5.5 11 3 13zM12.5 12V9.5M12.5 9.5c-1.2-1-1.2-3 0-5 1.2 2 1.2 4 0 5zM9 20.5h7"
);
/** Professor · Turma. */
export const PeopleIcon = lineIcon(
  "M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.5c1.6.8 2.7 3 3 5.5"
);
/** Professor · Construtor: prancheta com visto. */
export const ClipboardIcon = lineIcon(
  "M9 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15M9 3.5h6v3H9zM9 13l2 2 4-4"
);
/** Gestor · Insights. */
export const InsightIcon = lineIcon(
  "M4 5.5h16v10H9l-4.5 4v-4H4zM12 8v4.5M9.75 10.25h4.5"
);
/** Gestor · Dashboard. */
export const BarsIcon = lineIcon(
  "M3.5 20.5h17M6 17v-6M10.5 17V6M15 17V8M19.5 17v-4"
);
export const ArrowRightIcon = lineIcon("M5 12h13M12.5 6.5 18 12l-5.5 5.5", 2);
export const ChevronRightIcon = lineIcon("M9 6l6 6-6 6", 2);
export const ChevronLeftIcon = lineIcon("M15 6l-6 6 6 6", 2);
/** Clepsidra: quando o card volta. */
export const HourglassIcon = lineIcon(
  "M7 3.5h10M7 20.5h10M8 3.5c0 4.5 4 5.5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5.5-4 8.5s4 4 4 8.5",
  2
);
export const CloseIcon = lineIcon("M6 6l12 12M18 6 6 18", 2);
export const PlusIcon = lineIcon("M12 5v14M5 12h14", 2);
export const MenuIcon = lineIcon("M4 7h16M4 12h16M4 17h10", 1.8);
export const CheckIcon = lineIcon("M5 12.5l4.5 4.5L19 7.5", 2);
export const LogoutIcon = lineIcon(
  "M14 4.5h4A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16l-4-4 4-4M6 12h9",
  1.7
);

/** Ânfora com água: a meta do dia. */
export function AmphoraLineIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M6.3 14.5h11.4c-.4 3.4-2.8 6-5.7 6s-5.3-2.6-5.7-6z"
        fill="var(--p-glauco)"
        stroke="none"
      />
      <path d="M9.5 3.5h5M10.5 3.5v2.5c-3 1.2-4.5 3.8-4.5 7 0 4 2.7 7.5 6 7.5s6-3.5 6-7.5c0-3.2-1.5-5.8-4.5-7V3.5" />
    </svg>
  );
}

/** A dracma, no traço simples das pranchas: disco dourado com anel claro. */
export function CoinDot({ size = 15 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full bg-coin"
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 ${Math.max(2, size / 6)}px var(--p-coin-ring)`,
      }}
    />
  );
}
