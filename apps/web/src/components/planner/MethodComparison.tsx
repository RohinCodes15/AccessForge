import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  METHOD_LABELS,
  METHOD_NOTES,
  formatNumber,
  recommended,
  repairNames,
  type Plan,
} from "@/lib/planning-api";
import { PERCENT, TD, TH } from "./result-styles";

// The comparison is a demonstration of the method, not a measured result, so its assumptions
// sit next to it in plain words. The last two notes appear only when the data calls for them.
const ASSUMPTIONS = [
  "Every method is scored with AccessForge's own access model, the same score “Best combination” is built to maximize, so it wins on this measure by design. A different measure could rank the methods differently.",
  "The other three are simplified rules written for this comparison. They are not the City of Fremont's process or any real repair program.",
  "Every method gets the same network, budget, and repair costs.",
  "A share of 0% means that method's repairs add nothing to the modeled access score under these assumptions. It is not a prediction of what would happen on real streets.",
] as const;
const TIED_SEVERITY_NOTE =
  "Here every repair has the same severity and the same cost, so “Worst severity first” has nothing to rank. It takes repairs in the order of their internal IDs, so its result here says nothing about ranking by severity in general.";
const NOTHING_ALONE_NOTE =
  "No single repair raises the modeled score on its own within this budget, so “One repair at a time” stops before choosing any. Repairs that only work together are what it cannot see.";

/** True when "Worst severity first" (B1) can only fall back to ID order: one severity, one cost. */
function severityRankIsTied(plan: Plan): boolean {
  const severity = new Map(plan.network.barriers.map((b) => [b.id, b.severity]));
  const rankKeys = new Set(
    plan.network.repairs.map((repair) => {
      const worst = Math.max(0, ...repair.barrier_ids.map((id) => severity.get(id) ?? 0));
      return `${worst}|${repair.cost}`;
    }),
  );
  return plan.network.repairs.length > 1 && rankKeys.size === 1;
}

/** True when the greedy method chose nothing although some combination gains. */
function singleRepairsGainNothing(plan: Plan, bestGain: number): boolean {
  const greedy = plan.plans.find((item) => item.method === "B3");
  return greedy !== undefined && greedy.selected_repair_ids.length === 0 && bestGain > 0;
}

export function assumptionNotes(plan: Plan): readonly string[] {
  const bestGain = recommended(plan).delta_a;
  return [
    ...ASSUMPTIONS,
    ...(severityRankIsTied(plan) ? [TIED_SEVERITY_NOTE] : []),
    ...(singleRepairsGainNothing(plan, bestGain) ? [NOTHING_ALONE_NOTE] : []),
  ];
}

type Props = {
  readonly plan: Plan;
  readonly style?: CSSProperties;
};

export function MethodComparison({ plan, style }: Props) {
  const best = recommended(plan);
  return (
    <section aria-labelledby="methods-heading" className="af-rise" style={style}>
      <Badge label="Illustrative comparison" tone="modeled" />
      <h2 id="methods-heading" className="af-h2 mt-1">
        How other ways of choosing compare
      </h2>
      <p className="mt-1 max-w-prose text-muted">
        Same network, same budget, same scoring. It shows how simple ranking rules can miss repairs
        that only help together. It is not a measured result about any real program.
      </p>
      <div className="mt-3 max-w-prose rounded-lg border border-line bg-surface p-4 text-sm">
        <h3 className="font-semibold text-ink">What this comparison assumes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {assumptionNotes(plan).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
      <div
        role="region"
        aria-label="Method comparison, scrollable table"
        tabIndex={0}
        className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface"
      >
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <caption className="sr-only">
            Illustrative comparison. Modeled gain of each selection method
          </caption>
          <thead>
            <tr>
              <th scope="col" className={TH}>
                Method
              </th>
              <th scope="col" className={TH}>
                Repairs chosen
              </th>
              <th scope="col" className={TH}>
                Cost
              </th>
              <th scope="col" className={TH}>
                Modeled gain
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.plans.map((item) => {
              const share = best.delta_a > 0 ? (item.delta_a / best.delta_a) * PERCENT : 0;
              return (
                <tr key={item.method}>
                  <th scope="row" className={`${TD} text-left text-ink`}>
                    <span className="font-semibold">{METHOD_LABELS[item.method]}</span>
                    <span className="block font-normal text-muted">
                      {METHOD_NOTES[item.method]}
                    </span>
                  </th>
                  <td className={TD}>{repairNames(plan.network, item.selected_repair_ids)}</td>
                  <td className={TD}>{formatNumber(item.total_cost)}</td>
                  <td className={TD}>
                    {formatNumber(item.delta_a)}
                    <span className="block text-muted">
                      {formatNumber(share)}% of the best plan&apos;s modeled gain
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-1 block h-2 rounded bg-accent"
                      style={{ width: `${Math.max(share, 1)}%` }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
