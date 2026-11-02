"use client";

import Image from "next/image";
import { useState } from "react";
import type {
  Alternative,
  Letter,
  QuestionImage,
  StemBlock,
} from "@/src/features/questions/types";
import { RichText } from "@/src/ui/RichText";
import { CloseIcon } from "@/src/ui/paideia/line-icons";

/**
 * Imagens moram no bucket público `question-media` (cópia nossa, sem hotlink).
 * Caminho começando com "/" é arquivo local de /public (fixtures do /preview).
 */
export function questionMediaUrl(path: string): string {
  if (path.startsWith("/")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/question-media/${path}`;
}

function QuestionFigure({ image }: { image: QuestionImage }) {
  const [zoomed, setZoomed] = useState(false);
  const src = questionMediaUrl(image.path);
  const svg = src.endsWith(".svg");
  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`Ampliar figura: ${image.alt}`}
        className="block w-full overflow-hidden rounded-sm bg-surface"
      >
        <Image
          src={src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 640px) 100vw, 576px"
          unoptimized={svg}
          className="h-auto w-full"
        />
      </button>
      {zoomed && (
        <div
          role="dialog"
          aria-label="Figura ampliada"
          className="fixed inset-0 z-[70] flex flex-col bg-panel/95"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            aria-label="Fechar figura"
            className="ml-auto grid h-12 w-12 place-items-center text-on-panel"
          >
            <CloseIcon size={22} />
          </button>
          <div className="flex flex-1 items-center overflow-auto p-3">
            <Image
              src={src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="100vw"
              unoptimized={svg}
              className="h-auto w-full min-w-[640px] max-w-none bg-surface sm:min-w-0"
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Enunciado em blocos. Texto corrido em Manrope (enunciado de prova é longo);
 * só o enunciado curto e sem figura ganha a serifada de título da prancha.
 */
export function QuestionStem({ blocks }: { blocks: StemBlock[] }) {
  const onlyText = blocks.every((b) => b.type === "text");
  const length = blocks.reduce(
    (n, b) => n + (b.type === "text" ? b.text.length : 0),
    0
  );
  const display = onlyText && length <= 140;

  return (
    <div className="flex flex-col gap-3.5">
      {blocks.map((b, i) =>
        b.type === "text" ? (
          <p
            key={i}
            className={
              display
                ? "font-display text-[24px] leading-[1.3]"
                : "whitespace-pre-line text-[16.5px] leading-[1.6]"
            }
          >
            <RichText text={b.text} />
          </p>
        ) : (
          <QuestionFigure key={i} image={b} />
        )
      )}
    </div>
  );
}

export type AlternativeState =
  "idle" | "selected" | "right" | "wrong" | "muted";

export function AlternativeList({
  alternatives,
  stateOf,
  onSelect,
  disabled,
}: {
  alternatives: Alternative[];
  stateOf: (letter: Letter) => AlternativeState;
  onSelect?: (letter: Letter) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Alternativas"
      className="flex flex-col gap-2.5"
    >
      {alternatives.map((alt) => {
        const state = stateOf(alt.letter);
        return (
          <button
            key={alt.letter}
            type="button"
            disabled={disabled}
            aria-pressed={state === "selected"}
            onClick={() => onSelect?.(alt.letter)}
            className={`flex min-h-14 w-full items-start gap-3 rounded-sm border-[1.5px] px-3 py-2.5 text-left transition-colors ${
              state === "selected"
                ? "border-night bg-lavender-soft"
                : state === "right"
                  ? "border-glauco-mid bg-glauco-soft"
                  : state === "wrong"
                    ? "border-coral-mid bg-coral-soft"
                    : state === "muted"
                      ? "border-line text-muted"
                      : "border-line-strong bg-surface hover:border-night"
            }`}
          >
            <span
              className={`grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[8px] text-[15px] font-extrabold ${
                state === "selected"
                  ? "bg-night text-on-night"
                  : state === "right"
                    ? "bg-glauco text-on-glauco"
                    : state === "wrong"
                      ? "bg-coral text-on-coral"
                      : "bg-line text-ink"
              }`}
            >
              {alt.letter}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2 pt-[5px] text-[15.5px] leading-[1.45] font-semibold">
              {alt.text && <RichText text={alt.text} />}
              {alt.image && (
                <Image
                  src={questionMediaUrl(alt.image.path)}
                  alt={alt.image.alt}
                  width={alt.image.width}
                  height={alt.image.height}
                  sizes="(max-width: 640px) 80vw, 480px"
                  unoptimized={alt.image.path.endsWith(".svg")}
                  className="h-auto max-w-full rounded-[6px]"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
