"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, ShieldCheck, Trash2 } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { BRAND } from "@shortflow/shared";
import { GOOGLE_PERMISSIONS_URL, deleteAccount } from "@/lib/account";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputClasses } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const CONFIRM_WORD = "DELETE";

/** Where to see the policies, take back Google access, and delete the account. */
export function YourDataCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      router.replace("/");
    } catch (err) {
      setError(err instanceof FirebaseError && err.code === "functions/failed-precondition" ? err.message : "We couldn't delete your account. Try again in a minute.");
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader title="Your data" description={`What ${BRAND.name} keeps, and how to take it back.`} />
      <div className="divide-y divide-line px-5 pb-2 pt-3">
        <div className="flex items-center justify-between gap-4 py-3">
          <p className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
            <FileText className="size-4 shrink-0 text-accent" />
            <span className="min-w-0">Privacy Policy and Terms of Service</span>
          </p>
          <div className="flex shrink-0 gap-1">
            <Link href="/privacy" className="rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition hover:bg-white/[0.05] hover:text-text">
              Privacy
            </Link>
            <Link href="/terms" className="rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition hover:bg-white/[0.05] hover:text-text">
              Terms
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <p className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            <span className="min-w-0">See or remove the apps that can use your Google account</span>
          </p>
          <a
            href={GOOGLE_PERMISSIONS_URL}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition hover:bg-white/[0.05] hover:text-text"
          >
            Google
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="min-w-0 max-w-md">
            <p className="text-[13.5px] font-medium text-danger">Delete account</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              Disconnects every channel and permanently deletes your videos, Shorts, banners, schedule and settings. Shorts already on YouTube stay there.
            </p>
          </div>
          <Button type="button" variant="danger" size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => (setTyped(""), setOpen(true))}>
            Delete account
          </Button>
        </div>
        {error && (
          <div className="py-3">
            <Alert tone="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        confirmLabel="Delete forever"
        loading={busy}
        confirmDisabled={typed.trim().toUpperCase() !== CONFIRM_WORD}
        onCancel={() => setOpen(false)}
        onConfirm={() => void confirm()}
        description={
          <>
            <p>This can&apos;t be undone. Everything {BRAND.name} stores for you is deleted, and queued Shorts won&apos;t be published.</p>
            <label className="mt-4 block text-[12.5px] text-text">
              Type <span className="font-mono font-semibold text-danger">{CONFIRM_WORD}</span> to confirm
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={busy}
                className={cn(inputClasses, "mt-2 h-10 font-mono")}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </>
        }
      />
    </Card>
  );
}
