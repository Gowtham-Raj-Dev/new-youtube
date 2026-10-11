"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { LogoMark } from "@/components/ui/brand-icons";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}
