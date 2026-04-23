import { HEALTHCARE_KEYWORDS, HOUSING_KEYWORDS } from "../constants/keywords";

// Checks whether a company name contains any term from a keyword list.
const hasKeyword = (companyName, keywords) => {
  const normalized = (companyName || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

// Detects vertical using deterministic keyword matching for transparency.
export const detectVertical = (companyName) => {
  const normalized = (companyName || "").toLowerCase();
  const housingMatch =
    hasKeyword(normalized, HOUSING_KEYWORDS) ||
    (normalized.includes("group") &&
      HOUSING_KEYWORDS.some((keyword) => normalized.includes(keyword)));
  const healthcareMatch = hasKeyword(normalized, HEALTHCARE_KEYWORDS);

  if (housingMatch && !healthcareMatch) return "Housing";
  if (healthcareMatch && !housingMatch) return "Healthcare";
  return "Unclassified";
};
