import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { axeViolations } from "@/test/axe";
import AccessibilityPage from "./page";

const CONTACT = "access@example.org";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("offers an anonymous accessibility report form with the topic already chosen", async () => {
  vi.stubEnv("FEEDBACK_EMAIL", "");

  const { container } = render(<AccessibilityPage />);

  expect(screen.getByRole("form", { name: "Report an accessibility problem" })).toBeInTheDocument();
  expect(screen.getByLabelText("What is it about?")).toHaveValue("accessibility");
  expect(screen.queryByText(/will be added before public launch/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: CONTACT })).not.toBeInTheDocument();
  expect(await axeViolations(container)).toEqual([]);
});

it("shows the configured email address for people who cannot or prefer not to use the form", () => {
  vi.stubEnv("FEEDBACK_EMAIL", CONTACT);

  render(<AccessibilityPage />);

  expect(screen.getByRole("link", { name: CONTACT })).toHaveAttribute(
    "href",
    `mailto:${CONTACT}?subject=${encodeURIComponent("AccessForge accessibility problem")}`,
  );
});

it("keeps the accessibility topic after a report is sent, ready for the next one", async () => {
  vi.stubEnv("FEEDBACK_EMAIL", "");
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AccessibilityPage />);

  await user.type(screen.getByLabelText("Your feedback"), "The map zoom buttons have no labels.");
  await user.click(screen.getByRole("button", { name: /send feedback/i }));

  expect(await screen.findByRole("status")).toHaveTextContent("Your feedback was received");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ topic: "accessibility" });
  expect(screen.getByLabelText("What is it about?")).toHaveValue("accessibility");
});
