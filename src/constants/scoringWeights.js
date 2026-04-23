// Labels used to convert numeric score bands into clear rep-facing priority buckets.
export const SCORE_LABELS = [
  { min: 85, label: "Hot Lead", action: "Same-day outreach, prioritize above all other leads in queue" },
  { min: 65, label: "Warm Lead", action: "Follow up within 48 hours" },
  { min: 45, label: "Nurture", action: "Add to 30-day drip sequence, revisit next month" },
  { min: 0, label: "Low Priority", action: "Queue behind all warm and hot leads" },
];

// Personal email domains reduce confidence that the lead is work-related.
export const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "msn.com",
  "live.com",
  "protonmail.com",
];
