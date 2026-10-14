"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/brand-icons";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#trust", label: "Privacy" },
  { href: "/#faq", label: "FAQ" },
];

/** The public pages' top bar. Turns solid once the page scrolls. */
export function SiteHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 border-b transition-colors duration-300", scrolled ? "border-line bg-bg/80 backdrop-blur-xl" : "border-transparent")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={`${BRAND.name} home`}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted transition hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Nothing until auth is known, so a signed-in visitor never sees "Sign in" flash. */}
        <div className={cn("flex items-center gap-2 transition-opacity", loading ? "opacity-0" : "opacity-100")}>
          {user ? (
            <ButtonLink href="/dashboard" size="sm">
              Open dashboard
              <ArrowRight className="size-3.5" />
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-[13.5px] font-medium text-muted transition hover:text-text sm:block">
                Sign in
              </Link>
              <ButtonLink href="/login" size="sm">
                Get started free
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
