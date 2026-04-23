// Renders transparent scoring rows so reps can audit each awarded point.
const ScoreBreakdownCard = ({ scoreResult }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Score Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2">Signal Name</th>
              <th className="py-2">Detected Value</th>
              <th className="py-2">Points Awarded</th>
              <th className="py-2">One-line Reason</th>
            </tr>
          </thead>
          <tbody>
            {scoreResult.rows.map((item) => (
              <tr key={item.signal} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3 font-medium text-slate-800">{item.signal}</td>
                <td className="py-2 pr-3 text-slate-700">{item.value}</td>
                <td className="py-2 pr-3 text-slate-700">{item.pointsDisplay ?? `+${item.points}`}</td>
                <td className="py-2 text-slate-700">
                  {item.reason}
                  {item.flag ? <p className="mt-1 text-amber-700">{item.flag}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 border-t border-slate-300 pt-3 text-right text-base font-bold text-slate-900">
        Total Score: {Math.min(Number(scoreResult.totalScore) || 0, 100)}
        {scoreResult.rawTotalBeforeCap != null && scoreResult.rawTotalBeforeCap > scoreResult.totalScore ? (
          <p className="mt-1 text-xs font-normal text-slate-500">
            Raw total before cap: {scoreResult.rawTotalBeforeCap}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ScoreBreakdownCard;
