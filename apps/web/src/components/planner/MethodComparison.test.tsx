import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import corridor from "@/test/corridor-plan.json";
import { axeViolations } from "@/test/axe";
import type { Plan } from "@/lib/planning-api";
import { MethodComparison } from "./MethodComparison";

const tiedPlan = corridor as unknown as Plan;
const TIE_NOTE = /nothing to rank/;
const NOTHING_ALONE_NOTE = /No single repair raises the modeled score on its own/;

function withDistinctCostsAndGreedyPick(plan: Plan): Plan {
  const [first, ...rest] = plan.network.repairs;
  return {
    ...plan,
    network: { ...plan.network, repairs: [{ ...first, cost: first.cost + 1 }, ...rest] },
    plans: plan.plans.map((item) =>
      item.method === "B3" ? { ...item, selected_repair_ids: [first.id] } : item,
    ),
  };
}

it("labels the comparison as illustrative and states its assumptions in plain language", async () => {
  const { container } = render(<MethodComparison plan={tiedPlan} />);

  const section = screen.getByRole("region", { name: /How other ways of choosing compare/ });
  expect(within(section).getByText("Illustrative comparison")).toBeInTheDocument();
  expect(within(section).getByText(/wins on this measure by design/)).toBeInTheDocument();
  expect(within(section).getByText(/not the City of Fremont's process/)).toBeInTheDocument();
  expect(
    within(section).getByText(/not a prediction of what would happen on real streets/),
  ).toBeInTheDocument();
  expect(await axeViolations(container)).toEqual([]);
});

it("names each method's share as a share of the best plan's modeled gain", () => {
  render(<MethodComparison plan={tiedPlan} />);

  const row = screen.getByRole("row", { name: /One repair at a time/ });
  expect(within(row).getByText("0% of the best plan's modeled gain")).toBeInTheDocument();
});

it("says when severity ranking has nothing to rank and single repairs gain nothing alone", () => {
  render(<MethodComparison plan={tiedPlan} />);

  expect(screen.getByText(TIE_NOTE)).toBeInTheDocument();
  expect(screen.getByText(NOTHING_ALONE_NOTE)).toBeInTheDocument();
});

it("leaves out those notes when the data does not call for them", () => {
  render(<MethodComparison plan={withDistinctCostsAndGreedyPick(tiedPlan)} />);

  expect(screen.queryByText(TIE_NOTE)).not.toBeInTheDocument();
  expect(screen.queryByText(NOTHING_ALONE_NOTE)).not.toBeInTheDocument();
});
