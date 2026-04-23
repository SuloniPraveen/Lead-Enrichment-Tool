// Compact glance summary for single-lead or batch enrichment outcomes.
const ResultsSummaryBar = ({ mode, singleResult, batchResults }) => {
  if (mode === "single" && singleResult) {
    const { scoreResult, vertical } = singleResult;
    const displayScore = Math.min(Number(scoreResult.totalScore) || 0, 100);
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
        <span>
          <span className="font-semibold text-slate-600">Score:</span> {displayScore}
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-600">Label:</span> {scoreResult.label}
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-600">Vertical:</span> {vertical}
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-600">Recommended Action:</span>{" "}
          {scoreResult.recommendedAction}
        </span>
      </div>
    );
  }

  if (mode === "batch" && batchResults?.length) {
    const ok = batchResults.filter((r) => r.enrichmentSuccess);
    const counts = ok.reduce(
      (acc, r) => {
        const label = r.scoreResult?.label;
        if (label === "Hot Lead") acc.hot += 1;
        else if (label === "Warm Lead") acc.warm += 1;
        else if (label === "Nurture") acc.nurture += 1;
        else if (label === "Low Priority") acc.low += 1;
        return acc;
      },
      { hot: 0, warm: 0, nurture: 0, low: 0 }
    );
    const perfectScores = ok.filter((r) => Math.min(Number(r.scoreResult?.totalScore) || 0, 100) === 100).length;
    const failed = batchResults.filter((r) => !r.enrichmentSuccess).length;
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
        <span className="inline-flex flex-wrap items-center gap-1">
          <span className="font-semibold text-orange-700">{counts.hot}</span> Hot
          {perfectScores > 0 ? (
            <span className="text-orange-700" title="Perfect scores">
              🔥
            </span>
          ) : null}
          {perfectScores > 0 ? (
            <span className="text-xs text-slate-600">(including {perfectScores} perfect scores)</span>
          ) : null}
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-amber-700">{counts.warm}</span> Warm
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-blue-700">{counts.nurture}</span> Nurture
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-600">{counts.low}</span> Low Priority
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-900">{batchResults.length}</span> Total
        </span>
        {failed > 0 ? (
          <>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-amber-800">{failed} failed</span>
          </>
        ) : null}
      </div>
    );
  }

  return null;
};

export default ResultsSummaryBar;
