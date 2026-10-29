"use client";

import { useEffect } from "react";

const SELECTOR = ".reveal, .reveal-left, .reveal-right, .reveal-pop, .reveal-screen";

/** Runs before first paint so elements below the fold start hidden instead of flashing. */
export const REVEAL_BOOT = `if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("reveal-ready")`;

/**
 * Marks each landing-page element with .in-view the first time it scrolls into
 * view. IntersectionObserver works in every current browser, phones and tablets included.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const items = document.querySelectorAll<HTMLElement>(SELECTOR);
    if (!root.classList.contains("reveal-ready") || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
