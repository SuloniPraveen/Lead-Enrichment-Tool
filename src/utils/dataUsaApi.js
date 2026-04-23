// Fetches city population from DataUSA and falls back silently to Census population.
export const fetchDataUsaPopulation = async ({ city, fallbackPopulation }) => {
  try {
    const response = await fetch(
      "https://datausa.io/api/data?drilldowns=Place&measures=Population&Geography=01000US"
    );
    if (!response.ok) throw new Error("DataUSA API failed");
    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const cityLower = (city || "").toLowerCase();
    const matches = rows
      .filter((row) => (row?.Place || "").toLowerCase().includes(cityLower))
      .sort((a, b) => (b.Year || 0) - (a.Year || 0));
    const population = matches[0]?.Population;
    return Number.isFinite(Number(population)) ? Number(population) : fallbackPopulation ?? null;
  } catch {
    return fallbackPopulation ?? null;
  }
};
