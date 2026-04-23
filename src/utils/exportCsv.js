// Escapes CSV values so commas and quotes remain valid in exported rows.
const toCsvCell = (value) => {
  const text = `${value ?? ""}`.replaceAll('"', '""');
  return `"${text}"`;
};

// Converts enriched lead results into a downloadable CSV file.
export const exportResultsAsCsv = (results) => {
  const headers = [
    "Name",
    "Email",
    "Company",
    "Address",
    "City",
    "State",
    "Vertical",
    "Score",
    "Label",
    "Recommended Action",
    "Outreach Email",
  ];

  const rows = results.map((result) => [
    result.lead.fullName,
    result.lead.email,
    result.lead.company,
    result.lead.address,
    result.lead.city,
    result.lead.state,
    result.vertical,
    result.scoreResult.totalScore,
    result.scoreResult.label,
    result.scoreResult.recommendedAction,
    result.emailResult?.email || "",
  ]);

  const content = [headers, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "enriched-leads-results.csv";
  link.click();
  URL.revokeObjectURL(url);
};
