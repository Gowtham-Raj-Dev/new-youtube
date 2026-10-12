"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { canRenderInBrowser } from "@/lib/browser-render";
import { HELPER_DOWNLOAD, checkHelper } from "@/lib/local-splitter";

/**
 * Shown where work needs rendering: says nothing while the PC helper is running.
 * Without it, the work is done in the browser if the browser can, and the helper
 * is offered as the faster way; if it can't, the helper is the only way. Looks
 * again every few seconds, so it goes away by itself once the helper is opened.
 */
export function HelperNotice() {
  const [offline, setOffline] = useState(false);
  const [inBrowser, setInBrowser] = useState(false);

  const look = useCallback(
    () =>
      checkHelper().then(
        () => setOffline(false),
        () => setOffline(true),
      ),
    [],
  );

  useEffect(() => {
    void look();
    void canRenderInBrowser().then(setInBrowser);
    const timer = setInterval(() => void look(), 4000);
    return () => clearInterval(timer);
  }, [look]);

  if (!offline) return null;
  return (
    <div className={inBrowser ? "rounded-xl border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed" : "rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] leading-relaxed"}>
      <p className="font-medium">{inBrowser ? "This will be done in your browser." : "This browser can't do this by itself — it needs the PC helper."}</p>
      <p className="mt-1 text-muted">
        {inBrowser
          ? "Nothing to install: keep this tab open and in front while it works. On a Windows PC the free helper is usually faster — worth it for long videos or many Shorts."
          : "Use Chrome or Edge, or get the free helper for Windows."}{" "}
        To use the helper, download it once, unzip it and open <span className="text-text">ShortFlowHelper.exe</span>, then leave its window open. If your browser asks whether this site may reach apps on your device, choose Allow.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <a href={HELPER_DOWNLOAD} download className="flex h-9 items-center gap-1.5 rounded-lg border border-accent/50 bg-accent-soft px-3.5 text-[13px] font-medium text-text transition hover:border-accent">
          <Download className="size-3.5" />
          Download helper for Windows
        </a>
        <button type="button" onClick={() => void look()} className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[13px] font-medium text-muted transition hover:border-line-strong hover:text-text">
          <RefreshCw className="size-3.5" />
          Check again
        </button>
      </div>
    </div>
  );
}
