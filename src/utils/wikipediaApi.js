// Reduces long Wikipedia text to the first few sentences for concise UI display.
const firstSentences = (text, count = 3) => {
  if (!text) return null;
  const segments = text.split(". ").slice(0, count).join(". ").trim();
  return segments.endsWith(".") ? segments : `${segments}.`;
};

// Calls the Wikipedia summary API with a title and returns null on any error.
const fetchWikiSummaryByTitle = async (title) => {
  try {
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.extract || null;
  } catch {
    return null;
  }
};

// Fetches city context by trying City_State first, then City as a fallback.
export const fetchWikipediaSummary = async ({ city, state }) => {
  const firstTry = await fetchWikiSummaryByTitle(`${city}_${state}`);
  if (firstTry) return firstSentences(firstTry, 3);
  const secondTry = await fetchWikiSummaryByTitle(city);
  return firstSentences(secondTry, 3);
};
