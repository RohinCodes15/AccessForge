"use client";

import { useEffect, useState } from "react";
import type { ParticleButtonStatus } from "@/components/kokonutui/particle-button";

// Matches ParticleButton's own defaults: success is brief, an error stays long enough to read.
const SUCCESS_MS = 1600;
const ERROR_MS = 3200;

type Settled = "success" | "error" | null;

/**
 * Turns a form's busy flag and outcome into a ParticleButton status: pending while busy, then a
 * short success (with the particle burst) or error, then idle. A null outcome (a cancelled run)
 * and a run already busy when the form mounted (an initial load) settle quietly to idle.
 */
export function useActionStatus(isBusy: boolean, outcome: Settled): ParticleButtonStatus {
  const [previousBusy, setPreviousBusy] = useState(isBusy);
  const [isPressedRun, setIsPressedRun] = useState(false);
  const [settled, setSettled] = useState<Settled>(null);

  // Adjusting state during render on a prop change (React docs: "storing information from
  // previous renders"), so the success frame shows on the same render the run finishes.
  if (previousBusy !== isBusy) {
    setPreviousBusy(isBusy);
    setIsPressedRun(isBusy);
    setSettled(isBusy || !isPressedRun ? null : outcome);
  }

  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(() => setSettled(null), settled === "success" ? SUCCESS_MS : ERROR_MS);
    return () => clearTimeout(timer);
  }, [settled]);

  if (isBusy) return "pending";
  return settled ?? "idle";
}
