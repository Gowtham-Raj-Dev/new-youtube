import Link from "next/link";
import { BRAND } from "@shortflow/shared";
import { Logo } from "@/components/ui/brand-icons";
import { SAMPLE_CREDIT } from "@/components/ui/sample-short";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#features", label: "Features" },
      { href: "/#faq", label: "FAQ" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "https://www.youtube.com/t/terms", label: "YouTube Terms" },
      { href: "https://policies.google.com/privacy", label: "Google Privacy Policy" },
    ],
  },
];

/** The public pages' footer: links, contact, and the YouTube API Services notice. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted">{BRAND.tagline} Upload once, and your channel keeps posting on schedule.</p>
          <a href={`mailto:${BRAND.supportEmail}`} className="mt-4 inline-block text-[13px] text-accent hover:underline">
            {BRAND.supportEmail}
          </a>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("http") ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className="text-[13.5px] text-muted transition hover:text-text">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-[13.5px] text-muted transition hover:text-text">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[12px] leading-relaxed text-faint sm:px-6">
          <p>
            {BRAND.name} uses YouTube API Services to upload Shorts to channels you connect. {BRAND.name} is not affiliated with or endorsed by YouTube or
            Google. YouTube is a trademark of Google LLC.
          </p>
          <p>
            © {new Date().getFullYear()} {BRAND.name} · {SAMPLE_CREDIT}
          </p>
        </div>
      </div>
    </footer>
  );
}
