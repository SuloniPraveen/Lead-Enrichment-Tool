import { STATE_FIPS_MAP } from "./stateFipsMap";

// Parses Census numeric values safely and returns null for invalid entries.
const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Finds the best matching city row using case-insensitive partial matching.
const selectCityRow = (rows, city) => {
  const cityLower = (city || "").toLowerCase().trim();
  if (!cityLower) return { row: rows[0] || null, usedFallback: true };
  const exact = rows.find((row) => (row?.[0] || "").toLowerCase().includes(cityLower));
  if (exact) return { row: exact, usedFallback: false };
  return { row: rows[0] || null, usedFallback: rows.length > 0 };
};

// Fetches ACS city-level demographics for the selected state and city.
export const fetchCensusData = async ({ city, state }) => {
  try {
    const fips = STATE_FIPS_MAP[state];
    if (!fips) return { income: null, totalHousingUnits: null, ownerOccupied: null, renterOccupied: null, renterRate: null, population: null, cityName: null, fallbackNote: null };

    const endpoint = `https://api.census.gov/data/2021/acs/acs5?get=NAME,B19013_001E,B25003_001E,B25003_002E,B01003_001E&for=place:*&in=state:${fips}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Census API failed");

    const data = await response.json();
    const rows = Array.isArray(data) ? data.slice(1) : [];
    const { row, usedFallback } = selectCityRow(rows, city);
    if (!row) return { income: null, totalHousingUnits: null, ownerOccupied: null, renterOccupied: null, renterRate: null, population: null, cityName: null, fallbackNote: null };

    const totalHousingUnits = toNumberOrNull(row[2]);
    const ownerOccupied = toNumberOrNull(row[3]);
    const renterOccupied =
      totalHousingUnits !== null && ownerOccupied !== null ? totalHousingUnits - ownerOccupied : null;
    const renterRate =
      renterOccupied !== null && totalHousingUnits ? (renterOccupied / totalHousingUnits) * 100 : null;

    return {
      income: toNumberOrNull(row[1]),
      totalHousingUnits,
      ownerOccupied,
      renterOccupied,
      renterRate,
      population: toNumberOrNull(row[4]),
      cityName: row[0] || null,
      fallbackNote: usedFallback ? "Exact city not found, using closest match." : null,
    };
  } catch {
    return { income: null, totalHousingUnits: null, ownerOccupied: null, renterOccupied: null, renterRate: null, population: null, cityName: null, fallbackNote: null };
  }
};
