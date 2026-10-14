"use client";

import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ButtonLink } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/brand-icons";

/** The main call to action: start for free, or straight back to work once signed in. */
export function StartCta({ className }: { className?: string }) {
  const { user } = useAuth();
  if (user) {
    return (
      <ButtonLink href="/dashboard" size="lg" className={className}>
        Open your dashboard
        <ArrowRight className="size-4" />
      </ButtonLink>
    );
  }
  return (
    <ButtonLink href="/login" size="lg" className={className} icon={<GoogleIcon className="size-[18px] rounded-full bg-white p-[2px]" />}>
      Start free with Google
      <ArrowRight className="size-4" />
    </ButtonLink>
  );
}
