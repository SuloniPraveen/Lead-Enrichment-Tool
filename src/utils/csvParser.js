// Parses a full CSV string into rows of fields, respecting double-quoted fields and commas inside quotes.
const parseCsvStringToRows = (csvText) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const text = csvText || "";

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field.trim());
      field = "";
    } else if (c === "\n") {
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else if (c === "\r") {
      if (text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
};

// Maps parsed CSV rows into lead objects using expected column headers.
export const parseCsvText = (csvText) => {
  const rows = parseCsvStringToRows(csvText);
  if (!rows.length) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((values, index) => {
    const item = headers.reduce((acc, header, i) => {
      acc[header] = (values[i] ?? "").trim();
      return acc;
    }, {});
    const name = item.name || "";
    const email = item.email || "";
    const company = item.company || "";
    const address = item.address || "";
    const city = item.city || "";
    const state = item.state || "";
    if (!name && !email && !company && !city && !state) return null;
    return {
      id: `${name || "lead"}-${email || index}-${index}`,
      name,
      email,
      company,
      address,
      city,
      state,
      country: "United States",
    };
  }).filter(Boolean);
};
