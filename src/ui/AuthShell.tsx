import type { ReactNode } from "react";
import { Wordmark } from "@/src/ui/Wordmark";
import { Card } from "@/src/ui/kit";

/** Centered card layout shared by the login and signup pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="flex justify-center">
        <Wordmark />
      </div>
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </Card>
    </main>
  );
}
