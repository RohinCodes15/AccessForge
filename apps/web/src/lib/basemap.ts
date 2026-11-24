import type { LngLat } from "./barriers";

// Real OpenStreetMap-based basemap. Tiles are drawn from OpenStreetMap data; nothing here is
// AccessForge data, and a road on the basemap is not a verified accessible pedestrian route.

export const FREMONT_CENTER: LngLat = { lng: -121.9886, lat: 37.5485 };
export const FREMONT_ZOOM = 13;
/**
 * The furthest a map can pan or zoom out: California, [west, south] to [east, north]. Maps lock
 * tighter to the pilot street network once it loads; this holds when it is unavailable.
 */
export const CALIFORNIA_BOUNDS: [[number, number], [number, number]] = [
  [-124.5, 32.5],
  [-114.1, 42.0],
];

/** The part of `bounds` inside California, or all of California when they do not overlap. */
export function clampToCalifornia(
  bounds: [[number, number], [number, number]],
): [[number, number], [number, number]] {
  const [[minW, minS], [maxE, maxN]] = CALIFORNIA_BOUNDS;
  const [[w, s], [e, n]] = bounds;
  const west = Math.max(w, minW);
  const south = Math.max(s, minS);
  const east = Math.min(e, maxE);
  const north = Math.min(n, maxN);
  return west < east && south < north
    ? [
        [west, south],
        [east, north],
      ]
    : CALIFORNIA_BOUNDS;
}
/** Closest zoom used when framing markers, so a single report still shows its surroundings. */
export const MAX_FIT_ZOOM = 16;

export const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const MAPTILER_STYLE_URL = "https://api.maptiler.com/maps/streets-v2/style.json";

/** Origins the basemap fetches styles, tiles, glyphs, and sprites from (for the CSP). */
export const BASEMAP_ORIGINS = ["https://tiles.openfreemap.org", "https://api.maptiler.com"];

export type Basemap = { readonly styleUrl: string; readonly provider: string };

/**
 * MapTiler when a key is configured, otherwise OpenFreeMap (free, keyless). Attribution text comes
 * from each provider's style and is shown by MapLibre's attribution control.
 */
export function basemap(mapTilerKey: string | undefined): Basemap {
  const key = mapTilerKey?.trim();
  return key
    ? { styleUrl: `${MAPTILER_STYLE_URL}?key=${encodeURIComponent(key)}`, provider: "MapTiler" }
    : { styleUrl: OPENFREEMAP_STYLE_URL, provider: "OpenFreeMap" };
}
