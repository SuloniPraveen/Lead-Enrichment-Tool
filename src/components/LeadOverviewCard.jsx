// Maps score labels to accent color classes for quick prioritization.
const labelStyles = {
  "Hot Lead": "bg-orange-100 text-orange-700",
  "Warm Lead": "bg-amber-100 text-amber-700",
  Nurture: "bg-blue-100 text-blue-700",
  "Low Priority": "bg-slate-200 text-slate-700",
};

// Maps verticals to badge color classes for industry visibility.
const verticalStyles = {
  Housing: "bg-blue-100 text-blue-700",
  Healthcare: "bg-emerald-100 text-emerald-700",
  Unclassified: "bg-orange-100 text-orange-700",
};

// Renders top-level lead summary card with AI summary under the score.
const LeadOverviewCard = ({ lead, vertical, scoreResult, countryNote, aiScoreSummary }) => {
  const displayScore = Math.min(Number(scoreResult.totalScore) || 0, 100);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Lead Overview</h3>
      {countryNote ? <div className="mb-3 rounded-md bg-amber-100 p-2 text-sm text-amber-800">{countryNote}</div> : null}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verticalStyles[vertical]}`}>{vertical === "Unclassified" ? "⚠ Unclassified" : vertical}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${labelStyles[scoreResult.label]}`}>{scoreResult.label}</span>
      </div>
      <p className="text-sm text-slate-700">{lead.fullName}</p>
      <p className="text-sm text-slate-700">{lead.company}</p>
      <p className="text-sm text-slate-700">
        {lead.city}, {lead.state}, {lead.country}
      </p>
      <p className="mt-4 text-5xl font-extrabold text-slate-900">{displayScore} / 100</p>
      {scoreResult.bonusApplied ? (
        <p className="mt-2 text-xs text-slate-600">Base score 95+ with news bonus applied. Capped at 100.</p>
      ) : null}
      <p className="mt-3 text-sm font-semibold text-slate-800">AI Score Summary</p>
      <p className="mt-1 text-sm text-slate-700">
        {aiScoreSummary?.status === "ok"
          ? aiScoreSummary.summary
          : "AI analysis unavailable"}
      </p>
    </div>
  );
};

export default LeadOverviewCard;
