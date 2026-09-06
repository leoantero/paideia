import Link from "next/link";

/**
 * The Paideia wordmark. A small gold "keystone" mark beside the name — a nod
 * to classical architecture and to the idea of education as the keystone of
 * a person's formation.
 */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-md bg-ink text-sm font-semibold text-gold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Π
      </span>
      <span
        className="text-lg font-semibold text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Paideia
      </span>
    </Link>
  );
}
