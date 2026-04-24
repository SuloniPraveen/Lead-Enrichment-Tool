// Formats nullable numeric values for consistent rep-friendly display.
const fmt = (value, type = "number") => {
  if (value === null || value === undefined) return "Data unavailable";
  if (type === "currency") return `$${Number(value).toLocaleString()}`;
  if (type === "percent") return `${Number(value).toFixed(1)}%`;
  return Number(value).toLocaleString();
};

// Maps state to healthcare market tier for card display.
const healthcareTier = (state) => {
  const strong = ["California", "Texas", "Florida", "New York", "Illinois", "Pennsylvania", "Ohio", "Georgia", "North Carolina", "New Jersey", "Arizona", "Washington", "Massachusetts", "Tennessee", "Colorado"];
  const emerging = ["Wyoming", "Vermont", "North Dakota", "South Dakota", "Montana", "Alaska"];
  if (strong.includes(state)) return "Strong Market";
  if (emerging.includes(state)) return "Emerging Market";
  return "Mid-tier Market";
};

// Renders vertical-specific interpretation plus optional news and AI news analysis.
const SalesInsightsCard = ({ vertical, marketData, lead, newsAnalysis }) => {
  const hasRelevantArticles = (marketData.newsArticles?.length ?? 0) > 0;
  const showIrrelevantLine = !hasRelevantArticles && marketData.hadCandidatesButNoRelevance;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Sales Insights</h3>
      {vertical === "Unclassified" ? (
        <div className="mb-3 rounded-md bg-amber-100 p-2 text-sm text-amber-800">
          Industry undetected. Review company name and confirm vertical before sending any outreach.
        </div>
      ) : null}
      <ul className="space-y-2 text-sm text-slate-700">
        <li>Median Household Income: {fmt(marketData.income, "currency")}</li>
        {vertical === "Housing" ? (
          <li>
            Renter Rate: {fmt(marketData.renterRate, "percent")}{" "}
            {marketData.renterRate ? "(Higher renter share usually means higher communication load)." : ""}
          </li>
        ) : null}
        <li>
          City Population: {fmt(marketData.population)}{" "}
          {marketData.population ? "(Larger cities often indicate higher workflow volume)." : ""}
        </li>
        {vertical === "Healthcare" ? <li>State market classification: {healthcareTier(lead.state)}</li> : null}
        <li>Wikipedia city summary: {marketData.citySummary || "Data unavailable"}</li>
      </ul>
      <p className="mt-4 text-sm font-semibold text-slate-800">Why this matters for EliseAI</p>
      <p className="mt-1 text-sm text-slate-700">
        {vertical === "Housing"
          ? "This city profile suggests likely renter communication volume and leasing activity. EliseAI can automate tour scheduling, lease follow-ups, and maintenance messaging so property teams spend less time on repetitive outreach and more time on resident experience."
          : vertical === "Healthcare"
            ? "This market data indicates potential appointment and patient communication demand. EliseAI can automate scheduling, intake, and patient messaging so front desk teams can focus on care delivery instead of manual coordination."
            : "Use these market signals as context while you confirm the lead's actual industry before outreach."}
      </p>

      <div className="mt-5 border-t border-slate-200 pt-4">
        {hasRelevantArticles ? (
          <>
            <p className="text-sm font-semibold text-slate-800">Recent News</p>
            <ul className="mt-2 space-y-1 text-sm">
              {marketData.newsArticles.slice(0, 5).map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    {item.title}
                  </a>{" "}
                  <span className="text-slate-600">
                    -- {item.sourceName} ({item.publishedAt})
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : showIrrelevantLine ? (
          <p className="text-sm text-slate-700">
            No relevant industry news found for this company in the last 30 days
          </p>
        ) : marketData.newsStatus === "failed" ? (
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-amber-800">News could not be loaded</p>
            <p className="mt-1">
              The NewsAPI key is set, but the request did not return articles. This app loads news through a
              same-origin proxy so it works on deployed sites (NewsAPI blocks most browser origins). Use{" "}
              <code className="rounded bg-slate-100 px-1">npm run dev</code> or deploy on Vercel with the{" "}
              <code className="rounded bg-slate-100 px-1">api/news-proxy.js</code> route.
            </p>
            {marketData.newsFetchError ? (
              <p className="mt-2 rounded-md bg-slate-100 p-2 font-mono text-xs text-slate-600">
                {marketData.newsFetchError}
              </p>
            ) : null}
          </div>
        ) : marketData.newsStatus === "no_key" ? (
          <p className="text-sm text-slate-700">Add a NewsAPI key to load recent industry headlines for this lead.</p>
        ) : (
          <p className="text-sm text-slate-700">
            No relevant recent news matched this company in the last 30 days on the allowed business sources (try a
            larger national operator name in the company field to test).
          </p>
        )}
      </div>

      {hasRelevantArticles ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">AI News Analysis</p>
          {newsAnalysis?.status !== "ok" ? (
            <p className="mt-1 text-sm text-slate-700">
              {newsAnalysis?.error ? `Could not analyze news: ${newsAnalysis.error}` : "AI analysis unavailable"}
            </p>
          ) : (
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-800">Key Signal:</span> {newsAnalysis.keySignal}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Company Trajectory:</span>{" "}
                {newsAnalysis.companyTrajectory}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Outreach Timing:</span>{" "}
                {newsAnalysis.outreachTiming}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SalesInsightsCard;
