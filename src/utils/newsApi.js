import { filterRelevantNewsHeadlineIndices } from "./claudeApi";

// Healthcare-focused reputable domains for NewsAPI filtering.
const HEALTHCARE_DOMAINS = [
  "modernhealthcare.com",
  "fiercehealthcare.com",
  "beckershospitalreview.com",
  "healthcarefinancenews.com",
  "healthcaredive.com",
  "statnews.com",
  "medcitynews.com",
  "bizjournals.com",
  "forbes.com",
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "ft.com",
  "techcrunch.com",
].join(",");

// Housing and real estate industry domains for NewsAPI filtering.
const HOUSING_DOMAINS = [
  "multifamilyexecutive.com",
  "nmhc.org",
  "realpage.com",
  "globest.com",
  "commercialobserver.com",
  "bisnow.com",
  "bizjournals.com",
  "forbes.com",
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "ft.com",
  "housingwire.com",
  "therealdeal.com",
].join(",");

// General business press when vertical is unknown.
const UNCLASSIFIED_DOMAINS = [
  "forbes.com",
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "bizjournals.com",
  "ft.com",
  "techcrunch.com",
].join(",");

// Title keywords that usually indicate non-industry entertainment or sports noise.
const IRRELEVANT_TITLE_KEYWORDS = [
  "NFL",
  "NBA",
  "MLB",
  "soccer",
  "football",
  "basketball",
  "baseball",
  "sports",
  "movie",
  "film",
  "celebrity",
  "entertainment",
  "music",
  "album",
  "award",
  "Oscar",
  "Grammy",
  "Emmy",
  "divorce",
  "wedding",
  "pregnant",
];

// Picks domain allowlist string based on detected vertical.
const domainsForVertical = (vertical) => {
  if (vertical === "Healthcare") return HEALTHCARE_DOMAINS;
  if (vertical === "Housing") return HOUSING_DOMAINS;
  return UNCLASSIFIED_DOMAINS;
};

// Builds ISO date strings for NewsAPI from and to parameters (last 30 days through today).
const getNewsDateRange = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return {
    fromDate: thirtyDaysAgo.toISOString().split("T")[0],
    toDate: today.toISOString().split("T")[0],
  };
};

// Formats published date for display in the UI.
const formatPublishedAt = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
};

// Drops articles older than 30 days or whose titles match irrelevant keyword list.
const filterByRecencyAndTitle = (articles) => {
  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  return articles.filter((item) => {
    if (!item.publishedAtRaw) return false;
    const published = new Date(item.publishedAtRaw).getTime();
    if (!Number.isFinite(published)) return false;
    const ageMs = now - published;
    if (ageMs < 0 || ageMs > windowMs) return false;
    const titleLower = (item.title || "").toLowerCase();
    return !IRRELEVANT_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw.toLowerCase()));
  });
};

// Calls NewsAPI everything endpoint with domain and date filters.
const runNewsQuery = async ({ query, key, vertical }) => {
  try {
    const { fromDate, toDate } = getNewsDateRange();
    const domains = domainsForVertical(vertical);
    const endpoint =
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}` +
      `&domains=${domains}` +
      `&from=${fromDate}&to=${toDate}` +
      `&language=en&sortBy=publishedAt&pageSize=20&apiKey=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("News API request failed");
    const payload = await response.json();
    const mapped = (payload?.articles || []).map((article) => ({
      title: article?.title || "Untitled",
      description: article?.description || "",
      sourceName: article?.source?.name || "Unknown source",
      publishedAt: formatPublishedAt(article?.publishedAt),
      publishedAtRaw: article?.publishedAt || "",
      url: article?.url || "",
    }));
    const withUrl = mapped.filter((item) => item.url);
    const filtered = filterByRecencyAndTitle(withUrl);
    return filtered.length >= 1 ? filtered : [];
  } catch {
    return null;
  }
};

// Applies Claude index filter so only industry-relevant headlines remain in the app.
const applyClaudeRelevanceFilter = async ({
  anthropicApiKey,
  company,
  vertical,
  city,
  state,
  articles,
}) => {
  if (!articles.length) return { relevant: [], hadCandidatesButNoRelevance: false };
  if (!anthropicApiKey?.trim()) {
    return { relevant: [], hadCandidatesButNoRelevance: articles.length > 0 };
  }
  const idxResult = await filterRelevantNewsHeadlineIndices({
    apiKey: anthropicApiKey,
    company,
    vertical,
    city,
    state,
    articles,
  });
  if (idxResult.status === "failed" || !idxResult.indices?.length) {
    return { relevant: [], hadCandidatesButNoRelevance: articles.length > 0 };
  }
  const relevant = idxResult.indices
    .filter((i) => Number.isInteger(i) && i >= 0 && i < articles.length)
    .map((i) => articles[i]);
  const unique = [...new Map(relevant.map((a) => [a.url, a])).values()];
  return {
    relevant: unique.length ? unique : [],
    hadCandidatesButNoRelevance: articles.length > 0 && unique.length === 0,
  };
};

// Fetches reputable-domain news, filters locally, then Claude-filters for company and vertical relevance.
export const fetchRecentNews = async ({
  company,
  city,
  state,
  vertical,
  newsApiKey,
  anthropicApiKey,
}) => {
  const key = (newsApiKey || "").trim();
  if (!key) {
    return {
      status: "no_key",
      articles: [],
      hadCandidatesButNoRelevance: false,
      note: "API key not provided",
    };
  }

  const companyTrim = (company || "").trim();

  let candidates = await runNewsQuery({ query: companyTrim, key, vertical });
  if (candidates === null) {
    return {
      status: "failed",
      articles: [],
      hadCandidatesButNoRelevance: false,
      note: "Unavailable -- continuing",
    };
  }

  if (!candidates.length) {
    const fallbackQ =
      vertical === "Healthcare"
        ? "healthcare automation AI scheduling"
        : vertical === "Housing"
          ? "property management automation AI leasing"
          : null;
    if (fallbackQ) {
      const fb = await runNewsQuery({ query: fallbackQ, key, vertical });
      if (fb === null) {
        return {
          status: "failed",
          articles: [],
          hadCandidatesButNoRelevance: false,
          note: "Unavailable -- continuing",
        };
      }
      candidates = fb;
    }
  }

  if (!candidates.length) {
    return {
      status: "none",
      articles: [],
      hadCandidatesButNoRelevance: false,
      note: null,
    };
  }

  const { relevant, hadCandidatesButNoRelevance } = await applyClaudeRelevanceFilter({
    anthropicApiKey,
    company: companyTrim,
    vertical,
    city: city || "",
    state: state || "",
    articles: candidates,
  });

  if (!relevant.length) {
    return {
      status: hadCandidatesButNoRelevance ? "none" : "none",
      articles: [],
      hadCandidatesButNoRelevance,
      note: null,
    };
  }

  return {
    status: "ok",
    articles: relevant,
    hadCandidatesButNoRelevance: false,
    note: null,
  };
};
