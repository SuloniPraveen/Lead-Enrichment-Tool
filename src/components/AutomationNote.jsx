import { useState } from "react";

// Shows collapsible explanation of manual-trigger MVP automation choices.
const AutomationNote = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-base font-semibold text-slate-800"
      >
        <span>How Automation Works</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <p className="mt-3 text-sm text-slate-700">
          This tool is triggered manually by the Enrich Lead button, giving sales reps full control over when enrichment runs. In a production rollout, this same enrichment pipeline connects to Google Sheets using Apps Script so that enrichment fires automatically every time a new lead row is added to the sheet. A daily 9am scheduled batch run can also be configured to process overnight leads before the team starts their day. The trigger-based approach was chosen for this MVP because it integrates into existing rep workflows without requiring any change in how leads are currently entered.
        </p>
      ) : null}
    </div>
  );
};

export default AutomationNote;
