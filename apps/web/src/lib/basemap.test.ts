import { describe, expect, it } from "vitest";
import {
  BASEMAP_ORIGINS,
  CALIFORNIA_BOUNDS,
  OPENFREEMAP_STYLE_URL,
  basemap,
  clampToCalifornia,
} from "./basemap";

describe("clampToCalifornia", () => {
  it("keeps bounds that already sit inside California", () => {
    const fremont: [[number, number], [number, number]] = [
      [-122.1, 37.4],
      [-121.9, 37.6],
    ];
    expect(clampToCalifornia(fremont)).toEqual(fremont);
  });

  it("trims bounds that a far-away report stretched past the state line", () => {
    expect(
      clampToCalifornia([
        [-122.1, 37.4],
        [-73.9, 40.7],
      ]),
    ).toEqual([
      [-122.1, 37.4],
      [-114.1, 40.7],
    ]);
  });

  it("falls back to all of California when the bounds miss it entirely", () => {
    expect(
      clampToCalifornia([
        [-74.1, 40.6],
        [-73.9, 40.8],
      ]),
    ).toEqual(CALIFORNIA_BOUNDS);
  });
});

describe("basemap", () => {
  it("uses keyless OpenFreeMap when no MapTiler key is configured", () => {
    expect(basemap(undefined)).toEqual({
      styleUrl: OPENFREEMAP_STYLE_URL,
      provider: "OpenFreeMap",
    });
    expect(basemap("   ").provider).toBe("OpenFreeMap");
  });

  it("uses MapTiler with an encoded key when one is configured", () => {
    const { styleUrl, provider } = basemap(" a b&c ");

    expect(provider).toBe("MapTiler");
    expect(styleUrl).toBe("https://api.maptiler.com/maps/streets-v2/style.json?key=a%20b%26c");
  });

  it("only uses style URLs from the origins the CSP allows", () => {
    for (const key of [undefined, "key"]) {
      expect(BASEMAP_ORIGINS).toContain(new URL(basemap(key).styleUrl).origin);
    }
  });
});
