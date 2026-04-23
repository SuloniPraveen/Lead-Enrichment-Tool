import LeadOverviewCard from "./LeadOverviewCard";
import ScoreBreakdownCard from "./ScoreBreakdownCard";
import SalesInsightsCard from "./SalesInsightsCard";
import OutreachEmailCard from "./OutreachEmailCard";
import ObjectionPrepCard from "./ObjectionPrepCard";

// Renders the same five-card enrichment layout as single-lead mode using cached batch data only.
const EnrichmentDetailStack = ({ result, onClose, showCloseButton }) => {
  if (!result?.enrichmentSuccess) {
    return (
      <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md px-2 py-1 text-lg font-bold text-amber-900 hover:bg-amber-100"
            aria-label="Close"
          >
            ×
          </button>
        ) : null}
        <p className="pr-10">
          Enrichment failed for this lead. Please try processing this lead individually in Single Lead mode.
        </p>
      </div>
    );
  }

  const { lead, vertical, scoreResult, marketData, emailResult, newsAnalysis, aiScoreSummary, objectionPrep } =
    result;
  const countryNote =
    lead.country.trim().toLowerCase() === "united states"
      ? marketData.fallbackNote
      : "API enrichment currently supports US cities only. Score is based on available data.";

  return (
    <div className="relative space-y-5">
      {showCloseButton ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-10 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label="Close"
        >
          ×
        </button>
      ) : null}
      <div className={showCloseButton ? "pr-10 pt-8" : ""}>
        <h4 className="mb-4 text-lg font-semibold text-slate-900">
          {lead.fullName}
          <span className="block text-sm font-normal text-slate-600">{lead.company}</span>
        </h4>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <LeadOverviewCard
            lead={lead}
            vertical={vertical}
            scoreResult={scoreResult}
            aiScoreSummary={aiScoreSummary}
            countryNote={countryNote}
          />
          <ScoreBreakdownCard scoreResult={scoreResult} />
          <SalesInsightsCard vertical={vertical} marketData={marketData} lead={lead} newsAnalysis={newsAnalysis} />
          {vertical !== "Unclassified" ? <OutreachEmailCard emailResult={emailResult} /> : null}
          {vertical !== "Unclassified" ? (
            <div className="lg:col-span-2">
              <ObjectionPrepCard objectionPrep={objectionPrep} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EnrichmentDetailStack;
