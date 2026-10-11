import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

/** Placeholder for routes delivered in later build phases. */
export function ComingSoon({ icon, title, description, phase }: { icon: ReactNode; title: string; description: string; phase: number }) {
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-accent/10 blur-[90px]" />
      <div className="relative flex flex-col items-center px-6 py-20 text-center">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-accent">{icon}</div>
        <Badge tone="accent">Arrives in phase {phase}</Badge>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
        <ButtonLink href="/dashboard" variant="secondary" className="mt-7" icon={<ArrowLeft className="size-4" />}>
          Back to dashboard
        </ButtonLink>
      </div>
    </Card>
  );
}
