// Renders stepper statuses including done, skipped, and unavailable states.
const StatusIndicator = ({ steps }) => {
  const styleByStatus = {
    pending: "border-slate-300 bg-slate-100 text-slate-500",
    active: "border-blue-600 bg-blue-50 text-blue-700",
    done: "border-emerald-600 bg-emerald-600 text-white",
    skipped: "border-slate-300 bg-slate-100 text-slate-500",
    unavailable: "border-amber-500 bg-amber-100 text-amber-700",
  };

  const textByStatus = {
    pending: "text-slate-700",
    active: "text-blue-700",
    done: "text-emerald-700",
    skipped: "text-slate-500",
    unavailable: "text-amber-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Enrichment Progress</h3>
      <div className="space-y-3">
        {steps.map((step, index) => {
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${styleByStatus[step.status]}`}
              >
                {step.status === "done" ? "✓" : index + 1}
              </div>
              <p className={`${textByStatus[step.status]} text-sm`}>
                {step.label}
                {step.note ? ` ${step.note}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusIndicator;
