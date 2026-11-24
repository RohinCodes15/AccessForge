"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Section headings and form labels ripple letter by letter, in a teal wave, as they come into
// view; a label ripples again when its field is focused. Built on anime.js (splitText, stagger).
// The Overview page has its own motion and is left alone.
//
// React owns these elements, so their text is never touched: an aria-hidden copy is laid over
// the real text for one ripple and then removed. The real text stays in place for screen
// readers, find-in-page and copying, and is all that shows whenever the effect is skipped
// (reduced motion, forced colours, no JavaScript, or the library failing to load).

type Anime = typeof import("animejs");

const TARGETS = "h2, h3, label";
// Longer headings ripple word by word; letter by letter would drag on.
const MAX_CHARS_BY_LETTER = 48;
const ENTER_RATIO = 0.9;
const LETTER_STAGGER_MS = 24;
const WORD_STAGGER_MS = 70;
// Text already in view on arrival waits for the page title's own entrance (af-word).
const FIRST_BATCH_DELAY_MS = 450;
const RISE_MS = 200;
const SETTLE_MS = 620;
const LETTER_LIFT = "-0.34em";
const WORD_LIFT = "-0.18em";
const TILT_DEG = -7;
const OVERLAY_SLACK = "-0.3em";
// --color-accent: the wave crosses each word in the site's teal (5.8:1 on canvas).
const WAVE_COLOR = "#0a6b62";
const SKIP_QUERY = "(prefers-reduced-motion: reduce), (forced-colors: active)";

export function TextRipples() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || main.querySelector('[data-page="overview"]')) return;
    // Browsers (and test DOMs) without matchMedia keep the plain text.
    if (typeof window.matchMedia !== "function" || window.matchMedia(SKIP_QUERY).matches) return;
    let stop: (() => void) | null = null;
    let isCancelled = false;
    // Loaded on demand so the animation library stays off the critical rendering path.
    import("animejs")
      .then((anime) => {
        if (!isCancelled) stop = startRipples(main, anime);
      })
      // Decorative only: the real text is already showing, so nothing else needs to change.
      .catch((error: unknown) => console.warn("Text ripples are unavailable", error));
    return () => {
      isCancelled = true;
      stop?.();
    };
  }, [pathname]);

  return null;
}

/** Watches `main` for headings and labels, rippling each once in view and labels on focus. */
function startRipples(main: HTMLElement, anime: Anime): () => void {
  const watched = new WeakSet<Element>();
  const running = new Set<() => void>();
  const firstBatchUntil = performance.now() + FIRST_BATCH_DELAY_MS;

  function play(element: HTMLElement) {
    const delay = Math.max(0, firstBatchUntil - performance.now());
    const finish = ripple(element, anime, delay, () => {
      if (finish) running.delete(finish);
    });
    if (finish) running.add(finish);
  }

  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        seen.unobserve(entry.target);
        play(entry.target);
      }
    },
    { threshold: ENTER_RATIO },
  );

  function watch() {
    for (const element of main.querySelectorAll<HTMLElement>(TARGETS)) {
      if (watched.has(element) || !isPlainText(element)) continue;
      watched.add(element);
      seen.observe(element);
    }
  }

  // Results, errors and later steps render after the page; pick them up as they arrive, at
  // most once a frame (map pages change the DOM constantly).
  let frame = 0;
  const added = new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      watch();
    });
  });
  added.observe(main, { childList: true, subtree: true });
  watch();

  function onFocus(event: FocusEvent) {
    const label = labelOf(event.target);
    if (label) play(label);
  }
  main.addEventListener("focusin", onFocus);

  return () => {
    main.removeEventListener("focusin", onFocus);
    added.disconnect();
    cancelAnimationFrame(frame);
    seen.disconnect();
    for (const finish of running) finish();
  };
}

/** Plays one ripple over `element`; returns a function that ends it early, or null if skipped. */
function ripple(
  element: HTMLElement,
  anime: Anime,
  delay: number,
  onDone: () => void,
): (() => void) | null {
  if (!isPlainText(element)) return null;
  const text = element.textContent ?? "";
  // Read now: getComputedStyle is live, and the real text turns transparent below.
  const style = getComputedStyle(element);
  const color = style.color;
  const overlay = makeOverlay(text, style, color, isOneLine(element));
  const needsPosition = style.position === "static";
  if (needsPosition) element.style.position = "relative";
  element.dataset.afRipple = "";
  element.append(overlay);

  const isByLetter = text.length <= MAX_CHARS_BY_LETTER;
  const split = anime.splitText(overlay, { words: true, chars: isByLetter, accessible: false });
  const settle = { duration: SETTLE_MS, ease: "outElastic(1, .5)" };
  const rise = { duration: RISE_MS, ease: "outQuad" };
  const animation = anime.animate(isByLetter ? split.chars : split.words, {
    y: [
      { to: isByLetter ? LETTER_LIFT : WORD_LIFT, ...rise },
      { to: 0, ...settle },
    ],
    rotate: [
      { to: TILT_DEG, ...rise },
      { to: 0, ...settle },
    ],
    color: [
      { to: WAVE_COLOR, ...rise },
      { to: color, duration: SETTLE_MS },
    ],
    delay: anime.stagger(isByLetter ? LETTER_STAGGER_MS : WORD_STAGGER_MS, { start: delay }),
    onComplete: () => finish(),
  });

  let isFinished = false;
  function finish() {
    if (isFinished) return;
    isFinished = true;
    animation.revert();
    overlay.remove();
    delete element.dataset.afRipple;
    if (needsPosition) element.style.position = "";
    onDone();
  }
  return finish;
}

/** The aria-hidden copy, laid exactly over the real text (same box, font and colour). */
function makeOverlay(
  text: string,
  style: CSSStyleDeclaration,
  color: string,
  isSingleLine: boolean,
): HTMLSpanElement {
  const overlay = document.createElement("span");
  overlay.className = "af-ripple";
  overlay.setAttribute("aria-hidden", "true");
  overlay.textContent = text;
  overlay.style.color = color;
  overlay.style.padding = style.padding;
  // Split letters lose kerning and come out a hair wider than the real text: a one-line
  // label must not wrap its last letter, and wrapped text gets a little room to match.
  if (isSingleLine) overlay.style.whiteSpace = "nowrap";
  else overlay.style.right = OVERLAY_SLACK;
  return overlay;
}

function isOneLine(element: HTMLElement): boolean {
  const range = document.createRange();
  range.selectNodeContents(element);
  const lineTops = new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top)));
  return lineTops.size <= 1;
}

/** Only elements holding nothing but visible text: anything else is left as React made it. */
function isPlainText(element: HTMLElement): boolean {
  return (
    element.childElementCount === 0 &&
    (element.textContent ?? "").trim() !== "" &&
    element.closest('.sr-only, [aria-hidden="true"]') === null
  );
}

function labelOf(target: EventTarget | null): HTMLElement | null {
  const isField =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement;
  return isField ? (target.labels?.[0] ?? null) : null;
}
