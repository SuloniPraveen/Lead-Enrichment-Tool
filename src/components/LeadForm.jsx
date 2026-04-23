import { STATE_FIPS_MAP } from "../utils/stateFipsMap";

// Renders the single-lead input form and sample lead actions.
const LeadForm = ({
  lead,
  onChange,
  onSubmit,
  onLoadHousing,
  onLoadHealthcare,
  isRunning,
}) => {
  const states = Object.keys(STATE_FIPS_MAP);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          ["fullName", "Full Name"],
          ["email", "Email Address"],
          ["company", "Company Name"],
          ["address", "Property / Clinic Address"],
          ["city", "City"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
            <input
              type="text"
              value={lead[key]}
              onChange={(event) => onChange(key, event.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
          <select
            value={lead.state}
            onChange={(event) => onChange("state", event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5"
          >
            <option value="">Select state</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
          <input
            type="text"
            value={lead.country}
            onChange={(event) => onChange("country", event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5"
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isRunning}
          className="rounded-lg bg-blue-700 px-6 py-3 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Enrich Lead
        </button>
        <button
          type="button"
          onClick={onLoadHousing}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Load Sample: Housing Lead
        </button>
        <button
          type="button"
          onClick={onLoadHealthcare}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Load Sample: Healthcare Lead
        </button>
      </div>
    </div>
  );
};

export default LeadForm;
