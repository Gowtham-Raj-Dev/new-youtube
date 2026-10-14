import type { ReactNode } from "react";
import { BRAND, LEGAL_UPDATED } from "@shortflow/shared";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** A Privacy Policy or Terms page: a contents list beside numbered sections. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: Array<{ id: string; title: string; body: ReactNode }> }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{BRAND.name}</p>
          <h1 className="mt-3 text-[34px] font-semibold tracking-tight sm:text-[44px]">{title}</h1>
          <p className="mt-3 text-[13px] text-faint">Last updated {LEGAL_UPDATED}</p>
          <div className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted">{intro}</div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
            <nav aria-label="Contents" className="hidden lg:block">
              <ol className="sticky top-24 space-y-2 border-l border-line pl-4 text-[13px]">
                {sections.map((section, i) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-muted transition hover:text-text">
                      {i + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="min-w-0 space-y-12">
              {sections.map((section, i) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-[20px] font-semibold tracking-tight">
                    <span className="mr-2 font-mono text-[15px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {section.title}
                  </h2>
                  <div className="legal mt-4 space-y-4 text-[14.5px] leading-relaxed text-muted">{section.body}</div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** An outside link that opens in a new tab. */
export function Ext({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
      {children ?? href.replace(/^https?:\/\//, "")}
    </a>
  );
}
