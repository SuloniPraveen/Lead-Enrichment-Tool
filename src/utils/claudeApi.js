// Formats fetched news into compact text blocks for Claude prompts.
const formatNewsForPrompt = (articles = []) =>
  articles
    .slice(0, 3)
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\nDescription: ${item.description || "No description available"}`
    )
    .join("\n\n");

// Lists every fetched headline and description for the news analysis prompt (no truncation).
const formatAllNewsForAnalysis = (articles = []) =>
  articles
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\nDescription: ${item.description || "No description available"}`
    )
    .join("\n\n");

// Builds market-data and news-aware prompt for personalized outreach email generation.
const buildEmailPrompt = ({ lead, vertical, scoreResult, marketData }) => {
  const incomeText = marketData.income ? `$${marketData.income.toLocaleString()}` : "Data unavailable";
  const populationText = marketData.population
    ? marketData.population.toLocaleString()
    : "Data unavailable";
  const renterRateText =
    marketData.renterRate !== null && marketData.renterRate !== undefined
      ? `${marketData.renterRate.toFixed(1)}%`
      : "Data unavailable";

  return `Write a cold outreach email for this lead:

Name: ${lead.fullName}
Company: ${lead.company}
City: ${lead.city}, ${lead.state}
Vertical: ${vertical}
Lead Score: ${scoreResult.totalScore}/100 - ${scoreResult.label}

Market Data:
- Median Household Income: ${incomeText}
- City Population: ${populationText}
${vertical === "Housing" ? `- Renter Rate: ${renterRateText}` : ""}
${marketData.citySummary ? `- City Summary: ${marketData.citySummary.split(". ").slice(0, 2).join(". ")}` : ""}
${marketData.newsArticles?.length ? `\nRecent News:\n${formatNewsForPrompt(marketData.newsArticles)}\n\nInstructions:\nOpen with a natural reference to the most relevant headline to show research was done. Keep it one sentence.` : "\n\nInstructions:\nDo not reference any news or headlines. Focus only on market data below."}
For housing leads: Open with a specific insight about the city renter market. Connect high renter volume to the repetitive communication burden on property managers. Position EliseAI as the solution that automates tour scheduling, lease follow-ups, and maintenance requests so the team stops drowning in manual outreach.

For healthcare leads: Open with a specific insight about patient volume or market size in that city. Connect high appointment volume to the admin burden on front desk staff. Position EliseAI as the solution that automates scheduling, intake, and patient communication so the team focuses on care instead of paperwork.`;
};

// Sends a single Claude messages request and returns text with safe error handling.
const callClaude = async ({ apiKey, system, userContent, maxTokens }) => {
  const finalKey = (apiKey || "").trim();
  if (!finalKey) return { status: "missing_key", text: null, error: null };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": finalKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      return { status: "failed", text: null, error: "Claude request failed" };
    }

    const payload = await response.json();
    const text = payload?.content?.find((item) => item.type === "text")?.text || null;
    return { status: text ? "ok" : "failed", text, error: text ? null : "Claude returned no text" };
  } catch {
    return { status: "failed", text: null, error: "Claude request failed" };
  }
};

// Uses Claude to return which headline indices match the prospect context (JSON array only).
export const filterRelevantNewsHeadlineIndices = async ({ apiKey, company, vertical, city, state, articles }) => {
  if (!articles?.length) return { status: "ok", indices: [] };
  const headlineLines = articles.map((a, i) => `[${i}] ${a.title}`).join("\n");
  const result = await callClaude({
    apiKey,
    maxTokens: 50,
    system:
      "You respond with only a JSON array of integers (indices). No markdown, no explanation, no extra text.",
    userContent: `Given these news headlines, which ones are directly relevant to a company called ${company} in the ${vertical} industry in ${city}, ${state}? 
Return only the indices of relevant headlines as a JSON array like [0, 2]. If none are relevant return [].
Headlines:
${headlineLines}`,
  });
  if (result.status !== "ok" || !result.text) return { status: "failed", indices: [] };
  try {
    const trimmed = result.text.trim();
    const match = trimmed.match(/\[[\d,\s]*\]/);
    const parsed = JSON.parse(match ? match[0] : trimmed);
    if (!Array.isArray(parsed)) return { status: "ok", indices: [] };
    return { status: "ok", indices: parsed.map((n) => Number(n)).filter((n) => Number.isInteger(n)) };
  } catch {
    return { status: "failed", indices: [] };
  }
};

// Generates outreach email from enriched lead context and recent news.
export const generateOutreachEmail = async ({ apiKey, lead, vertical, scoreResult, marketData }) => {
  const hasNews = (marketData.newsArticles?.length ?? 0) > 0;
  const systemWithNews =
    "You are a skilled SDR at EliseAI, an AI agent company with two products. The Housing product automates renter communication for property management companies: touring, leasing, maintenance requests, and resident updates. The Healthcare product automates patient communication for healthcare providers: appointment scheduling, intake forms, and provider messaging. Write short, personalized, human-sounding cold outreach emails. Never be generic. Always reference the specific local market data and any news provided. Keep emails under 160 words. Do not use em dashes. Use a professional but warm tone. End with a soft CTA asking if they have 15 minutes for a quick call. Sign off as 'The EliseAI Team'.";
  const systemNoNews =
    "You are a skilled SDR at EliseAI, an AI agent company with two products. The Housing product automates renter communication for property management companies: touring, leasing, maintenance requests, and resident updates. The Healthcare product automates patient communication for healthcare providers: appointment scheduling, intake forms, and provider messaging. Write short, personalized, human-sounding cold outreach emails. Never be generic. Always reference the specific local market data provided. Do not mention news, headlines, or press coverage. Keep emails under 160 words. Do not use em dashes. Use a professional but warm tone. End with a soft CTA asking if they have 15 minutes for a quick call. Sign off as 'The EliseAI Team'.";
  const result = await callClaude({
    apiKey,
    maxTokens: 400,
    system: hasNews ? systemWithNews : systemNoNews,
    userContent: buildEmailPrompt({ lead, vertical, scoreResult, marketData }),
  });
  return { status: result.status, email: result.text, error: result.error };
};

// Parses Claude news analysis output into the three required labeled fields.
const parseNewsAnalysisText = (text) => {
  if (!text) return { keySignal: null, companyTrajectory: null, outreachTiming: null };
  const keyMatch = text.match(/Key Signal:\s*([\s\S]+?)(?=\nCompany Trajectory:|$)/i);
  const trajMatch = text.match(/Company Trajectory:\s*([\s\S]+?)(?=\nOutreach Timing:|$)/i);
  const timeMatch = text.match(/Outreach Timing:\s*([\s\S]+?)$/i);
  return {
    keySignal: keyMatch?.[1]?.trim() || null,
    companyTrajectory: trajMatch?.[1]?.trim() || null,
    outreachTiming: timeMatch?.[1]?.trim() || null,
  };
};

// Analyzes fetched headlines into key signal, trajectory, and outreach timing.
export const generateNewsAnalysis = async ({ apiKey, lead, vertical, marketData }) => {
  if (!marketData.newsArticles?.length) return { status: "skipped", keySignal: null, companyTrajectory: null, outreachTiming: null };
  const result = await callClaude({
    apiKey,
    maxTokens: 250,
    system:
      "You are a GTM analyst at EliseAI. Your job is to read recent news about a prospect company or their local market and extract what it means for a sales rep trying to reach out. Be concise and direct. Write in plain English, no jargon. Do not use em dashes.",
    userContent: `Here are recent news headlines about this prospect or their market:

Company: ${lead.company}
Vertical: ${vertical}
City: ${lead.city}, ${lead.state}

Headlines:
${formatAllNewsForAnalysis(marketData.newsArticles)}

Respond in exactly this format with no deviation. Do not include question numbers. Do not include markdown headers or bold text. Do not add any text outside of these three labels:

Key Signal: [one sentence about the most important thing a sales rep should notice in this news]

Company Trajectory: [one sentence on whether the company or market appears to be growing, struggling, or stable based on the news]

Outreach Timing: [one sentence on whether now is a good or bad time to reach out and the single most important reason why]

If the headlines are not relevant to this specific company or city, say so plainly in each field instead of analyzing unrelated news.`,
  });
  if (result.status !== "ok") return { status: result.status, keySignal: null, companyTrajectory: null, outreachTiming: null };
  const parsed = parseNewsAnalysisText(result.text);
  return {
    status: "ok",
    keySignal: parsed.keySignal || "AI analysis unavailable",
    companyTrajectory: parsed.companyTrajectory || "AI analysis unavailable",
    outreachTiming: parsed.outreachTiming || "AI analysis unavailable",
  };
};

// Generates a 2-3 sentence plain-English score summary for quick rep triage.
export const generateScoreSummary = async ({ apiKey, vertical, scoreResult }) => {
  const breakdown = scoreResult.rows
    .map((item) => `${item.signal}: ${item.value} (${item.pointsDisplay ?? `+${item.points}`})`)
    .join("\n");
  const baseScore = scoreResult.baseScore ?? scoreResult.totalScore;
  const rawTotal = scoreResult.rawTotalBeforeCap ?? scoreResult.totalScore;
  const nearMaxNote =
    baseScore >= 95
      ? "\nNote: This lead scored at or near the maximum possible score. Emphasize in your summary that this is an exceptionally strong lead and the rep should treat it as their highest priority."
      : "";
  const capNote =
    rawTotal > 100
      ? "\nNote: The raw score before capping was above 100. Acknowledge in your summary that the final displayed score is capped at 100."
      : "";
  const result = await callClaude({
    apiKey,
    maxTokens: 150,
    system:
      "You are a sales coach at EliseAI. Explain lead scores in plain English to SDRs. Be direct, practical, and brief. No bullet points. 2 to 3 sentences max. Do not use em dashes.",
    userContent: `This lead scored ${scoreResult.totalScore}/100 (${scoreResult.label}) for the ${vertical} vertical (displayed score is capped at 100). Base score before news bonus: ${baseScore}. Raw total before cap: ${rawTotal}.
${nearMaxNote}${capNote}

Score breakdown:
${breakdown}

Write 2 to 3 sentences explaining what this score means for the rep. Should they prioritize this lead? What is the strongest reason to reach out and what is the biggest risk or gap?`,
  });
  return { status: result.status, summary: result.text || null };
};

// Predicts two likely prospect objections and one-sentence responses.
export const generateObjectionPrep = async ({ apiKey, lead, vertical, scoreResult, marketData }) => {
  const result = await callClaude({
    apiKey,
    maxTokens: 200,
    system:
      "You are a sales coach at EliseAI helping SDRs prepare for cold outreach calls. Based on lead data, predict the most likely objections and give a one-sentence response to each. Be practical and specific to EliseAI's product. Do not use em dashes.",
    userContent: `Prepare me for a cold call with this prospect:

Company: ${lead.company}
City: ${lead.city}, ${lead.state}
Vertical: ${vertical}
Lead Score: ${scoreResult.totalScore}/100

Respond in exactly this format. No markdown. No headers. No extra text. No bold. No dashes at the start of lines. Just these four lines:

Objection 1: [the single most likely objection this prospect will raise]
Response 1: [one sentence on how the rep should respond]
Objection 2: [the second most likely objection]
Response 2: [one sentence on how the rep should respond]`,
  });
  if (result.status !== "ok") return { status: result.status, text: null };
  return { status: "ok", text: result.text || null };
};
