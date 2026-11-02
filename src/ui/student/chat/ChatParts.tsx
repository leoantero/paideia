"use client";

import type { ReactNode } from "react";
import { RichText } from "@/src/ui/RichText";
import { ArrowRightIcon, OwlLineIcon } from "@/src/ui/paideia/line-icons";

/** Peças do chat com a coruja, compartilhadas pelo Tutor e pelo sheet das questões. */

export function StudentLine({
  name,
  children,
}: {
  name: string;
  children: string;
}) {
  return (
    <li className="flex flex-col items-end gap-1">
      <span className="text-xs font-bold text-lavender-ink">{name}</span>
      <p className="max-w-[82%] whitespace-pre-wrap rounded-[12px_2px_12px_12px] bg-lavender px-3.5 py-2.5 text-[15px] leading-[1.45] text-on-lavender">
        {children}
      </p>
    </li>
  );
}

export function TutorLine({
  children,
  label = "Tutor",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel text-glauco">
        <OwlLineIcon size={17} strokeWidth={1.9} />
      </span>
      <div className="flex max-w-[86%] flex-col gap-[3px]">
        <span className="text-xs font-bold text-glauco-deep">{label}</span>
        <div className="whitespace-pre-wrap text-[15px] leading-[1.55]">
          {children}
        </div>
      </div>
    </li>
  );
}

export function ThinkingDots() {
  return (
    <span className="flex gap-1 py-2" aria-label="Pensando">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-glauco-mid"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Destaca a última pergunta do tutor, a que o aluno precisa responder. Só
 * destaca quando o corte não quebra um negrito/itálico ao meio.
 */
export function HighlightLastQuestion({ text }: { text: string }) {
  const q = text.lastIndexOf("?");
  if (q === -1) return <RichText text={text} />;
  const head = text.slice(0, q);
  const start =
    Math.max(
      head.lastIndexOf(". "),
      head.lastIndexOf("! "),
      head.lastIndexOf("? "),
      head.lastIndexOf("\n")
    ) + 1;
  const before = text.slice(0, start);
  const question = text.slice(start, q + 1).trimStart();
  const after = text.slice(q + 1);
  const balanced = (s: string) => (s.match(/\*/g)?.length ?? 0) % 2 === 0;
  if (question.length > 240 || !balanced(before) || !balanced(question)) {
    return <RichText text={text} />;
  }
  return (
    <>
      <RichText text={before} />
      {before && !before.endsWith(" ") && !before.endsWith("\n") ? " " : null}
      <mark className="rounded-[3px] bg-glauco-soft px-[3px] py-px text-inherit">
        <RichText text={question} />
      </mark>
      <RichText text={after} />
    </>
  );
}

export function ChatComposer({
  id,
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <form
      className="flex gap-2 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Sua resposta ou dúvida
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 min-w-0 flex-1 rounded-sm border-[1.5px] border-input bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint focus:border-night focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Enviar"
        disabled={!value.trim() || disabled}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-night text-on-night disabled:opacity-40"
      >
        <ArrowRightIcon size={22} />
      </button>
    </form>
  );
}
