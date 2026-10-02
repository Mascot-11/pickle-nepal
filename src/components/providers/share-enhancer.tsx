"use client";

import { useEffect } from "react";

/**
 * Wires the declarative share/copy buttons rendered by server components.
 * Keeps the markup free of client-only handlers while remaining accessible.
 */
export function ShareEnhancer() {
  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      const copyButton = target?.closest<HTMLElement>("[data-copy-url]");
      if (copyButton) {
        event.preventDefault();
        const url = new URL(copyButton.dataset.copyUrl ?? "", window.location.origin).toString();
        try {
          await navigator.clipboard.writeText(url);
          const label = copyButton.dataset.copyLabel ?? "Copy link";
          const original = copyButton.textContent;
          copyButton.textContent = "✓ Copied";
          setTimeout(() => {
            copyButton.textContent = original;
          }, 1800);
          void label;
        } catch {
          window.prompt("Copy this link", url);
        }
        return;
      }

      const shareButton = target?.closest<HTMLElement>('[data-share-kind="native"]');
      if (shareButton && "share" in navigator) {
        event.preventDefault();
        try {
          await (navigator as Navigator & {
            share: (data: { title?: string; url?: string }) => Promise<void>;
          }).share({
            title: document.title,
            url: window.location.href,
          });
        } catch {
          // User dismissed the share sheet — nothing to do.
        }
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}