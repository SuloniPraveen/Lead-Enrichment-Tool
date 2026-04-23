// Normalizes a cell for CSV: N/A when empty, collapses line breaks to spaces, quotes when needed.
const normalizeCell = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value).replace(/\r\n|\r|\n/g, " ").trim() || "N/A";
};

// Wraps a value in double quotes when it contains commas or line breaks, per CSV rules.
const escapeCsvField = (value) => {
  const text = normalizeCell(value).replaceAll('"', '""');
  if (/[",\n\r]/.test(text)) return `"${text}"`;
  return text;
};

// Parses objection prep text for export columns (same label logic as ObjectionPrepCard).
const parseObjectionsForExport = (text) => {
  if (!text) return { o1: "N/A", r1: "N/A", o2: "N/A", r2: "N/A" };
  const o1 = text.match(/Objection 1:\s*([^\n]+)/i)?.[1]?.trim();
  const r1 = text.match(/Response 1:\s*([^\n]+)/i)?.[1]?.trim();
  const o2 = text.match(/Objection 2:\s*([^\n]+)/i)?.[1]?.trim();
  const r2 = text.match(/Response 2:\s*([^\n]+)/i)?.[1]?.trim();
  return {
    o1: o1 || "N/A",
    r1: r1 || "N/A",
    o2: o2 || "N/A",
    r2: r2 || "N/A",
  };
};

// Formats median income for export cells.
const formatIncome = (income) => {
  if (income === null || income === undefined || !Number.isFinite(Number(income))) return "N/A";
  return `$${Number(income).toLocaleString()}`;
};

// Formats renter rate percentage for export.
const formatRenter = (rate) => {
  if (rate === null || rate === undefined || !Number.isFinite(Number(rate))) return "N/A";
  return `${Number(rate).toFixed(1)}%`;
};

// Builds one export row from an enriched batch result object.
const rowFromResult = (result) => {
  if (!result.enrichmentSuccess) {
    return [
      result.lead?.fullName || "N/A",
      result.lead?.email || "N/A",
      result.lead?.company || "N/A",
      result.lead?.city || "N/A",
      result.lead?.state || "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
      "N/A",
    ];
  }
  const { lead, vertical, scoreResult, marketData, emailResult, aiScoreSummary, objectionPrep } = result;
  const objections = parseObjectionsForExport(objectionPrep?.text);
  return [
    lead.fullName,
    lead.email,
    lead.company,
    lead.city,
    lead.state,
    vertical,
    Math.min(Number(scoreResult.totalScore) || 0, 100),
    scoreResult.label,
    formatIncome(marketData.income),
    formatRenter(marketData.renterRate),
    marketData.population != null ? String(marketData.population) : "N/A",
    emailResult?.email || "N/A",
    marketData.newsArticles?.[0]?.title || "N/A",
    aiScoreSummary?.status === "ok" ? aiScoreSummary.summary : "N/A",
    objections.o1,
    objections.r1,
    objections.o2,
    objections.r2,
  ].map((cell) => (cell === "" ? "N/A" : cell));
};

// Downloads UTF-8 BOM CSV for batch enrichment results (Excel-friendly).
export const exportBatchEnrichmentCsv = (results) => {
  const headers = [
    "Name",
    "Email",
    "Company",
    "City",
    "State",
    "Vertical",
    "Score",
    "Label",
    "Median Income",
    "Renter Rate",
    "City Population",
    "Outreach Email",
    "Top News Headline",
    "AI Score Summary",
    "Objection 1",
    "Response 1",
    "Objection 2",
    "Response 2",
  ];
  const rows = results.map(rowFromResult);
  const body = [headers, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
  const today = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eliseai-leads-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Concatenates all outreach emails for clipboard copy in a fixed human-readable format.
export const buildAllEmailsClipboardText = (results) => {
  return results
    .filter((r) => r.enrichmentSuccess && r.emailResult?.email)
    .map((r) => `--- ${r.lead.fullName} at ${r.lead.company} ---\n${r.emailResult.email}`)
    .join("\n\n");
};
