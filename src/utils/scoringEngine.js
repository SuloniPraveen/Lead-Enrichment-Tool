import { PERSONAL_EMAIL_DOMAINS, SCORE_LABELS } from "../constants/scoringWeights";
import { HEALTHCARE_KEYWORDS, HOUSING_KEYWORDS } from "../constants/keywords";

/*
  SCORING ASSUMPTIONS - EliseAI Lead Enrichment Tool

  HOUSING (base 100 max):
  1. Company name match (25pts)
  2. Renter rate (25pts)
  3. Median income (20pts)
  4. City population (20pts)
  5. Email domain (10pts)
  News bonus: +5 when relevant industry news exists (separate from base; displayed score capped at 100).

  HEALTHCARE (base 100 max):
  1. Company name match (25pts)
  2. City population (25pts)
  3. Median income (20pts)
  4. Email domain (10pts)
  5. State market strength (20pts)
  News bonus: +5 when relevant industry news exists (displayed score capped at 100).

  Claude is used for four AI features on top of scoring:
  - Outreach email personalized with market data and optional news
  - News signal analysis when relevant news exists
  - Plain English score summary for the rep
  - Objection prep with two likely pushbacks and responses

  All base scoring signals are shown transparently so reps can apply their own judgment.
*/

// Creates a standardized score row so the UI can render every signal consistently.
const row = (signal, value, points, reason, flag = null, pointsDisplay = null) => ({
  signal,
  value,
  points,
  reason,
  flag,
  pointsDisplay,
});

// Checks whether company name contains at least one vertical keyword.
const hasCompanyKeyword = (company, keywords) => {
  const lower = (company || "").toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
};

// Scores email quality because business domains usually indicate stronger buying intent.
const scoreEmailDomain = (email) => {
  const domain = (email?.split("@")[1] || "").toLowerCase();
  const isPersonal = PERSONAL_EMAIL_DOMAINS.includes(domain);
  return isPersonal
    ? row("Email Domain Quality", domain || "Data unavailable", 0, "Personal email detected, lower confidence in business buying context", "Personal email detected, verify company domain")
    : row("Email Domain Quality", domain || "Data unavailable", domain ? 10 : 0, domain ? "Company email domain suggests stronger B2B fit" : "Email domain unavailable");
};

// Scores state-level healthcare market size to prioritize strong operating regions.
const scoreHealthcareState = (state) => {
  const strongStates = ["CA", "TX", "FL", "NY", "IL", "PA", "OH", "GA", "NC", "NJ", "AZ", "WA", "MA", "TN", "CO"];
  const emergingStates = ["WY", "VT", "ND", "SD", "MT", "AK"];
  const abbreviationMap = {
    California: "CA",
    Texas: "TX",
    Florida: "FL",
    "New York": "NY",
    Illinois: "IL",
    Pennsylvania: "PA",
    Ohio: "OH",
    Georgia: "GA",
    "North Carolina": "NC",
    "New Jersey": "NJ",
    Arizona: "AZ",
    Washington: "WA",
    Massachusetts: "MA",
    Tennessee: "TN",
    Colorado: "CO",
    Wyoming: "WY",
    Vermont: "VT",
    "North Dakota": "ND",
    "South Dakota": "SD",
    Montana: "MT",
    Alaska: "AK",
  };
  const code = abbreviationMap[state] || state;
  if (strongStates.includes(code))
    return row("State Healthcare Market Strength", `${state} (Strong Market)`, 20, "Large healthcare economies often support higher patient communication volume");
  if (emergingStates.includes(code))
    return row("State Healthcare Market Strength", `${state} (Emerging Market)`, 5, "Rural-dominant market can limit healthcare lead volume");
  return row("State Healthcare Market Strength", `${state} (Mid-tier Market)`, 12, "Moderate statewide demand supports selective targeting");
};

// Converts displayed (capped) score into label and recommended next action.
const getScoreLabel = (displayedScore) => {
  const hit = SCORE_LABELS.find((band) => displayedScore >= band.min) || SCORE_LABELS[SCORE_LABELS.length - 1];
  return { label: hit.label, recommendedAction: hit.action };
};

// Builds the Recent News Activity row for the breakdown table for all cases.
const buildNewsRow = ({ marketData, newsBonus, baseScore }) => {
  if (marketData.newsStatus === "no_key") {
    return row(
      "Recent News Activity",
      "API key not provided",
      0,
      "Add NewsAPI key to enable this signal"
    );
  }
  if (marketData.newsStatus === "failed") {
    return row(
      "Recent News Activity",
      marketData.newsFetchError || "News request failed",
      0,
      "News is loaded via this app’s server proxy (/api/news-proxy). If this persists, confirm your NewsAPI key and plan limits."
    );
  }
  if (newsBonus === 5 && baseScore < 95) {
    return row(
      "Recent News Activity",
      "Company in news (last 30 days)",
      5,
      "Active market presence improves outreach timing",
      null,
      "+5"
    );
  }
  if (newsBonus === 5 && baseScore >= 95) {
    return row(
      "Recent News Activity",
      "Company in news (last 30 days)",
      5,
      "Bonus applied but score already at maximum",
      null,
      "+5 (capped at 100)"
    );
  }
  return row(
    "Recent News Activity",
    "No relevant news found",
    0,
    "No recent industry news detected"
  );
};

// Executes base scoring (max 100), applies news bonus separately, and caps the displayed total at 100.
export const scoreLead = ({ lead, vertical, marketData }) => {
  const baseRows = [];

  if (vertical === "Housing") {
    baseRows.push(
      hasCompanyKeyword(lead.company, HOUSING_KEYWORDS)
        ? row("Company Name Match", "Housing keyword match", 25, "Company naming aligns with property management category")
        : row(
            "Company Name Match",
            "No clear housing match",
            0,
            "Company naming does not clearly indicate housing focus",
            "Company name does not match housing keywords, verify industry"
          )
    );

    const renterRate = marketData.renterRate;
    if (renterRate === null || renterRate === undefined) baseRows.push(row("Renter Rate", "Data unavailable", 0, "Renter signal unavailable so no points awarded"));
    else if (renterRate > 65) baseRows.push(row("Renter Rate", `${renterRate.toFixed(1)}%`, 25, "Dense renter market suggests strongest automation ROI"));
    else if (renterRate >= 50) baseRows.push(row("Renter Rate", `${renterRate.toFixed(1)}%`, 18, "Healthy rental concentration supports strong fit"));
    else if (renterRate >= 35) baseRows.push(row("Renter Rate", `${renterRate.toFixed(1)}%`, 10, "Mixed housing mix indicates moderate fit"));
    else baseRows.push(row("Renter Rate", `${renterRate.toFixed(1)}%`, 3, "Owner-heavy market reduces housing communication volume"));

    const income = marketData.income;
    if (income === null || income === undefined) baseRows.push(row("Median Household Income", "Data unavailable", 0, "Income signal unavailable so no points awarded"));
    else if (income >= 55000 && income <= 85000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 20, "Middle-market sweet spot often balances budget and volume"));
    else if (income > 85000 && income <= 110000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 15, "Higher-income market is still viable though often less dense"));
    else if (income >= 45000 && income < 55000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 10, "Budget pressure can increase sales cycle length"));
    else if (income < 45000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 5, "Lower-income market may be highly price sensitive"));
    else baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 10, "Luxury market can have lower renter density"));

    const population = marketData.population;
    if (population === null || population === undefined) baseRows.push(row("City Population", "Data unavailable", 0, "Population signal unavailable so no points awarded"));
    else if (population > 500000) baseRows.push(row("City Population", population.toLocaleString(), 20, "Major metro implies larger property operations"));
    else if (population >= 100000) baseRows.push(row("City Population", population.toLocaleString(), 15, "Mid-size market has meaningful target density"));
    else if (population >= 50000) baseRows.push(row("City Population", population.toLocaleString(), 8, "Smaller city limits enterprise lead count"));
    else baseRows.push(row("City Population", population.toLocaleString(), 3, "Very small market likely has lower deal volume"));

    baseRows.push(scoreEmailDomain(lead.email));
  } else if (vertical === "Healthcare") {
    baseRows.push(
      hasCompanyKeyword(lead.company, HEALTHCARE_KEYWORDS)
        ? row("Company Name Match", "Healthcare keyword match", 25, "Company naming aligns with healthcare provider category")
        : row(
            "Company Name Match",
            "No clear healthcare match",
            0,
            "Company naming does not clearly indicate healthcare focus",
            "Company name does not match healthcare keywords, verify industry"
          )
    );

    const population = marketData.population;
    if (population === null || population === undefined) baseRows.push(row("City Population", "Data unavailable", 0, "Population signal unavailable so no points awarded"));
    else if (population > 500000) baseRows.push(row("City Population", population.toLocaleString(), 25, "High patient volume market with very strong automation ROI"));
    else if (population >= 100000) baseRows.push(row("City Population", population.toLocaleString(), 18, "Solid market scale for multi-provider practices"));
    else if (population >= 50000) baseRows.push(row("City Population", population.toLocaleString(), 10, "Smaller city means moderate appointment demand"));
    else baseRows.push(row("City Population", population.toLocaleString(), 5, "Low-volume market lowers expected platform utilization"));

    const income = marketData.income;
    if (income === null || income === undefined) baseRows.push(row("Median Household Income", "Data unavailable", 0, "Income signal unavailable so no points awarded"));
    else if (income >= 50000 && income <= 90000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 20, "Balanced middle-income market supports recurring care demand"));
    else if (income > 90000 && income <= 120000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 15, "High-income market is viable though less volume-driven"));
    else if (income >= 40000 && income < 50000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 10, "Coverage risk can slow software investment"));
    else if (income < 40000) baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 8, "Pricing pressure likely in lower-income markets"));
    else baseRows.push(row("Median Household Income", `$${income.toLocaleString()}`, 12, "Concierge skew possible but still addressable"));

    baseRows.push(scoreEmailDomain(lead.email));
    baseRows.push(scoreHealthcareState(lead.state));
  } else {
    baseRows.push(row("Company Name Match", "Unclassified", 0, "No clear vertical signal was detected"));
    baseRows.push(row("Email Domain Quality", lead.email?.split("@")[1] || "Data unavailable", 0, "Vertical is required for weighted scoring"));
  }

  const baseScore = baseRows.reduce((sum, item) => sum + item.points, 0);
  const newsEligible =
    (vertical === "Housing" || vertical === "Healthcare") &&
    marketData.newsStatus === "ok" &&
    (marketData.newsArticles?.length ?? 0) > 0;
  const newsBonus = newsEligible ? 5 : 0;
  const rawTotal = baseScore + newsBonus;
  const displayedScore = Math.min(rawTotal, 100);
  const bonusApplied = newsBonus > 0 && baseScore >= 95;

  const newsRow = buildNewsRow({ marketData, newsBonus, baseScore });
  const rows = [...baseRows, newsRow];
  const { label, recommendedAction } = getScoreLabel(displayedScore);

  return {
    rows,
    totalScore: displayedScore,
    baseScore,
    newsBonus,
    rawTotalBeforeCap: rawTotal,
    bonusApplied,
    label,
    recommendedAction,
  };
};
