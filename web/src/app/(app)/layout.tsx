"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LogoMark } from "@/components/ui/brand-icons";
import { UploadProvider } from "@/lib/uploads/upload-provider";
import { UploadTray } from "@/components/video/upload-tray";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <LogoMark className="size-10 animate-pulse" />
          <div className="h-0.5 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] bg-[length:200%_100%]" />
          </div>
        </div>
      </div>
    );
  }

  // Uploads live above the page tree so they survive navigation between pages.
  return (
    <UploadProvider>
      <AppShell>{children}</AppShell>
      <UploadTray />
    </UploadProvider>
  );
}
