import { filterRelevantNewsHeadlineIndices } from "./claudeApi";

// Healthcare-focused reputable domains for NewsAPI filtering.
const HEALTHCARE_DOMAIN_LIST = [
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
  "healthleadersmedia.com",
  "hfma.org",
];

// Housing and real estate industry domains for NewsAPI filtering.
const HOUSING_DOMAIN_LIST = [
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
  "inman.com",
  "multihousingnews.com",
  "costar.com",
];

// General business press when vertical is unknown.
const UNCLASSIFIED_DOMAIN_LIST = [
  "forbes.com",
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "bizjournals.com",
  "ft.com",
  "techcrunch.com",
];

const HEALTHCARE_DOMAINS = HEALTHCARE_DOMAIN_LIST.join(",");
const HOUSING_DOMAINS = HOUSING_DOMAIN_LIST.join(",");
const UNCLASSIFIED_DOMAINS = UNCLASSIFIED_DOMAIN_LIST.join(",");

// Picks domain allowlist string based on detected vertical.
const domainsForVertical = (vertical) => {
  if (vertical === "Healthcare") return HEALTHCARE_DOMAINS;
  if (vertical === "Housing") return HOUSING_DOMAINS;
  return UNCLASSIFIED_DOMAINS;
};

const domainListForVertical = (vertical) => {
  if (vertical === "Healthcare") return HEALTHCARE_DOMAIN_LIST;
  if (vertical === "Housing") return HOUSING_DOMAIN_LIST;
  return UNCLASSIFIED_DOMAIN_LIST;
};

// Keeps articles whose URL host is on the vertical allowlist (supports subdomains e.g. city.bizjournals.com).
const filterByAllowedDomains = (articles, vertical) => {
  const list = domainListForVertical(vertical);
  return articles.filter((item) => {
    try {
      const host = new URL(item.url).hostname.toLowerCase().replace(/^www\./, "");
      return list.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  });
};

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

const mapArticles = (payload) =>
  (payload?.articles || []).map((article) => ({
    title: article?.title || "Untitled",
    description: article?.description || "",
    sourceName: article?.source?.name || "Unknown source",
    publishedAt: formatPublishedAt(article?.publishedAt),
    publishedAtRaw: article?.publishedAt || "",
    url: article?.url || "",
  }));

// Calls NewsAPI everything endpoint. When restrictDomains is false, omits domains= and filters client-side (recovers subdomain / API quirks).
const runNewsQuery = async ({ query, key, vertical, restrictDomains = true }) => {
  try {
    const { fromDate, toDate } = getNewsDateRange();
    const domainQs = restrictDomains ? `&domains=${encodeURIComponent(domainsForVertical(vertical))}` : "";
    const endpoint =
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}` +
      domainQs +
      `&from=${fromDate}&to=${toDate}` +
      `&language=en&sortBy=publishedAt&pageSize=40&apiKey=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("News API request failed");
    const payload = await response.json();
    if (payload?.status === "error") throw new Error(payload?.message || "News API error");
    const mapped = mapArticles(payload);
    const withUrl = mapped.filter((item) => item.url);
    const timeFiltered = filterByRecencyAndTitle(withUrl);
    const filtered = restrictDomains ? timeFiltered : filterByAllowedDomains(timeFiltered, vertical);
    return filtered.length >= 1 ? filtered : [];
  } catch {
    return null;
  }
};

// Last resort: same query without domains= then keep only allowlisted hosts (often yields more than domains= alone).
const runNewsQueryRelaxedDomains = async ({ query, key, vertical }) =>
  runNewsQuery({ query, key, vertical, restrictDomains: false });

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
    const capped = articles.slice(0, 5);
    return { relevant: capped, hadCandidatesButNoRelevance: false };
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

const verticalFallbackQueries = (vertical) => {
  if (vertical === "Healthcare") {
    return [
      "healthcare automation AI scheduling",
      "hospital patient scheduling digital health",
      "health system operations technology",
    ];
  }
  if (vertical === "Housing") {
    return [
      "property management automation AI leasing",
      "multifamily housing operations technology",
      "apartment leasing software",
    ];
  }
  return [];
};

// Fetches reputable-domain news, filters locally, then Claude-filters for company / vertical / market relevance.
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

  const tryCollect = async (rows) => {
    if (rows === null) return false;
    if (rows.length) {
      candidates = rows;
      return true;
    }
    return false;
  };

  if (!candidates.length && (vertical === "Housing" || vertical === "Healthcare")) {
    for (const fq of verticalFallbackQueries(vertical)) {
      const rows = await runNewsQuery({ query: fq, key, vertical });
      if (rows === null) {
        return {
          status: "failed",
          articles: [],
          hadCandidatesButNoRelevance: false,
          note: "Unavailable -- continuing",
        };
      }
      if (await tryCollect(rows)) break;
    }
  }

  if (!candidates.length && (vertical === "Housing" || vertical === "Healthcare")) {
    const relaxedCompany = await runNewsQueryRelaxedDomains({ query: companyTrim, key, vertical });
    if (relaxedCompany === null) {
      return {
        status: "failed",
        articles: [],
        hadCandidatesButNoRelevance: false,
        note: "Unavailable -- continuing",
      };
    }
    await tryCollect(relaxedCompany);
  }

  if (!candidates.length && (vertical === "Housing" || vertical === "Healthcare")) {
    for (const fq of verticalFallbackQueries(vertical)) {
      const relaxed = await runNewsQueryRelaxedDomains({ query: fq, key, vertical });
      if (relaxed === null) {
        return {
          status: "failed",
          articles: [],
          hadCandidatesButNoRelevance: false,
          note: "Unavailable -- continuing",
        };
      }
      if (await tryCollect(relaxed)) break;
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
      status: "none",
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
