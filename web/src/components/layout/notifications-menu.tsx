"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { Bell, CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { COLLECTIONS, type NotificationDoc } from "@shortflow/shared";
import { firebase } from "@/lib/firebase/client";
import { useNotifications, type WithId } from "@/lib/firebase/hooks";
import { timeAgo, toDate } from "@/lib/time";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/empty-state";

const KIND_ICON = {
  success: <CircleCheck className="size-4 text-success" />,
  info: <Info className="size-4 text-accent" />,
  warning: <TriangleAlert className="size-4 text-warning" />,
  error: <CircleX className="size-4 text-danger" />,
};

export function NotificationsMenu({ uid }: { uid: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: items } = useNotifications(uid);
  const unread = items.filter((n) => !n.read);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !panelRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function openItem(item: WithId<NotificationDoc>) {
    setOpen(false);
    if (!item.read) void updateDoc(doc(firebase().db, COLLECTIONS.notifications, item.id), { read: true });
    if (item.link) router.push(item.link);
  }

  async function markAllRead() {
    const batch = writeBatch(firebase().db);
    unread.forEach((n) => batch.update(doc(firebase().db, COLLECTIONS.notifications, n.id), { read: true }));
    await batch.commit();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-9 place-items-center rounded-xl border border-line bg-surface-2/60 text-muted transition hover:border-line-strong hover:text-text"
        aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ""}`}
      >
        <Bell className="size-[17px]" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white ring-2 ring-bg">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] origin-top-right animate-enter overflow-hidden rounded-2xl border border-line-strong bg-surface-2/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-[12px] font-medium text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <EmptyState icon={<Bell className="size-5" />} title="You're all caught up" description="Processing, scheduling and upload updates will show up here." />
          ) : (
            <ul className="max-h-[400px] overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => openItem(item)}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]", !item.read && "bg-accent/[0.04]")}
                  >
                    <span className="mt-0.5">{KIND_ICON[item.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium">{item.title}</span>
                        {!item.read && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-muted">{item.body}</span>
                      <span className="mt-1 block text-[11px] text-faint">{timeAgo(toDate(item.createdAt))}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
