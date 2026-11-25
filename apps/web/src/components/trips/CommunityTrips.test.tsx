import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CommunityTrips } from "./CommunityTrips";

const landmarks = [
  { key: "osm:node/11", name: "Station" },
  { key: "osm:way/22", name: "Library" },
];
const id = "9b647da6-eae7-47f5-9e14-e5331217cffa";
const trip = {
  id,
  start_name: "Station",
  end_name: "Library",
  purpose: "education",
  supports: 0,
  field_nominated: false,
};
const catalog = (trips: (typeof trip)[] = [], page = 1, total = trips.length) =>
  Response.json({ data: { landmarks, trips }, meta: { page, limit: 1, total } });
afterEach(() => vi.unstubAllGlobals());

// Search a landmark field and choose the match, as a visitor would.
async function pick(user: ReturnType<typeof userEvent.setup>, label: string, name: string) {
  const input = await screen.findByRole("combobox", { name: label });
  await user.clear(input);
  await user.type(input, name);
  await user.click(
    within(screen.getByRole("listbox", { name: label })).getByRole("option", { name }),
  );
}

it("keeps the draft after a failed nomination and opens the server receipt after retry", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(catalog())
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(Response.json({ data: { id } }, { status: 201 }))
    .mockResolvedValueOnce(catalog([trip]));
  vi.stubGlobal("fetch", fetch);
  const user = userEvent.setup();
  render(<CommunityTrips />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading community trips");
  await pick(user, "Start landmark", landmarks[0].name);
  await pick(user, "End landmark", landmarks[0].name);
  expect(screen.getByRole("button", { name: "Nominate trip" })).toBeDisabled();
  await pick(user, "End landmark", landmarks[1].name);
  await user.selectOptions(screen.getByLabelText("Why this trip matters"), "education");
  const button = screen.getByRole("button", { name: "Nominate trip" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach");
  expect(screen.getByRole("combobox", { name: "End landmark" })).toHaveValue(landmarks[1].name);
  await user.click(button);
  expect(await screen.findByRole("link", { name: "View saved trip" })).toHaveAttribute(
    "href",
    `/trips?trip=${id}`,
  );
  expect(await screen.findByRole("link", { name: "Station to Library" })).toBeVisible();
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({
    start_key: landmarks[0].key,
    end_key: landmarks[1].key,
    purpose: "education",
    source: "online",
  });
});

it("browses later pages without clearing the form", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(catalog([trip], 1, 2))
    .mockResolvedValueOnce(catalog([{ ...trip, start_name: "Park" }], 2, 2));
  vi.stubGlobal("fetch", fetch);
  const user = userEvent.setup();
  render(<CommunityTrips />);
  await pick(user, "Start landmark", landmarks[0].name);
  await user.click(screen.getByRole("button", { name: "Next trips" }));
  expect(await screen.findByRole("link", { name: "Park to Library" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Start landmark" })).toHaveValue(landmarks[0].name);
  expect(fetch.mock.calls[1][0]).toBe("/api/trips?page=2");
});

it("shows example trips, never as saved ones, while no landmarks are loaded", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        data: { landmarks: [], trips: [] },
        meta: { page: 1, total: 0, limit: 20 },
      }),
    ),
  );
  render(<CommunityTrips />);
  const examples = within(await screen.findByRole("region", { name: "Example trips" }));
  expect(examples.getByRole("status")).toHaveTextContent("5 example trips");
  expect(screen.queryByRole("region", { name: "Saved community trips" })).toBeNull();
});

it("falls back to labelled sample trips, not an error, when the catalog 404s", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  const user = userEvent.setup();
  render(<CommunityTrips />);

  const saved = within(await screen.findByRole("region", { name: "Example trips" }));
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(screen.queryByText(/trip service is not available/)).toBeNull();
  expect(screen.queryByRole("region", { name: "Saved community trips" })).toBeNull();
  expect(saved.getByText("Fremont (BART station) to Fremont Main Library")).toBeVisible();
  expect(saved.getByRole("status")).toHaveTextContent("5 example trips");
  // Sample trips have no detail page to open.
  expect(saved.queryAllByRole("link")).toHaveLength(0);

  await pick(user, "Start landmark", "Fremont Main Library");
  await pick(user, "End landmark", "Washington Hospital");
  await user.selectOptions(screen.getByLabelText("Why this trip matters"), "education");
  await user.click(screen.getByRole("button", { name: "Nominate trip" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("cannot be saved");
});

it("asks for both landmarks when the form is sent without choosing them", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalog()));
  const user = userEvent.setup();
  render(<CommunityTrips />);
  await pick(user, "Start landmark", landmarks[0].name);
  await user.selectOptions(screen.getByLabelText("Why this trip matters"), "education");
  await user.click(screen.getByRole("button", { name: "Nominate trip" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "choose both a start and an end landmark",
  );
  expect(screen.getByRole("combobox", { name: "End landmark" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

it("shows a recoverable error for a missing bookmarked trip", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  render(<CommunityTrips initialTripId={id} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be found");
  expect(screen.getByRole("link", { name: "All community trips" })).toHaveAttribute(
    "href",
    "/trips",
  );
});
