// Shown on /trips only when the trip service cannot be reached.
// Landmarks are real public places in the Fremont BART pilot area, read from OpenStreetMap
// (ODbL 1.0, © OpenStreetMap contributors) on 2026-11-24 with the ingest pipeline's tags.
// The trips between them are fictional: nobody nominated them and nothing about them is modeled.

export const SAMPLE_LANDMARKS = [
  { key: "osm:node/6131716481", name: "Fremont (BART station)" },
  { key: "osm:way/37784279", name: "Fremont Main Library" },
  { key: "osm:way/579805948", name: "Washington Hospital" },
  { key: "osm:way/37862115", name: "Kaiser Permanente Fremont Medical Center" },
  { key: "osm:node/13594203523", name: "Bay Area Community Health" },
  { key: "osm:node/2509820301", name: "Washington Health Urgent Care" },
  { key: "osm:way/43985609", name: "Fremont Central Park" },
  { key: "osm:way/43985798", name: "Shinn Historical Park and Arboretum" },
  { key: "osm:way/49202163", name: "Alameda County Veterans Memorial Park" },
  { key: "osm:way/1015728669", name: "Downtown Event Center" },
  { key: "osm:way/1030285505", name: "California School for the Blind" },
  { key: "osm:way/349306142", name: "Parkmont Elementary School" },
  { key: "osm:way/238916680", name: "Whole Foods Market" },
  { key: "osm:node/1543828800", name: "Raley's" },
  { key: "osm:node/12692255849", name: "PostalAnnex" },
] as const;

export const SAMPLE_TRIPS = [
  {
    id: "sample-1",
    start_name: "Fremont (BART station)",
    end_name: "Fremont Main Library",
    purpose: "education",
    field_nominated: false,
    supports: 0,
  },
  {
    id: "sample-2",
    start_name: "California School for the Blind",
    end_name: "Fremont (BART station)",
    purpose: "public_transit",
    field_nominated: false,
    supports: 0,
  },
  {
    id: "sample-3",
    start_name: "Fremont (BART station)",
    end_name: "Kaiser Permanente Fremont Medical Center",
    purpose: "essential_services",
    field_nominated: false,
    supports: 0,
  },
  {
    id: "sample-4",
    start_name: "Downtown Event Center",
    end_name: "Fremont Central Park",
    purpose: "recreation",
    field_nominated: false,
    supports: 0,
  },
  {
    id: "sample-5",
    start_name: "Fremont Main Library",
    end_name: "Washington Hospital",
    purpose: "essential_services",
    field_nominated: false,
    supports: 0,
  },
] as const;
