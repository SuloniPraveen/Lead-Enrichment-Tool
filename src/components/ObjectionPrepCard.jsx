// Extracts labeled objection lines from Claude output for structured display only.
const parseObjectionPrepText = (text) => {
  if (!text || typeof text !== "string") return null;
  const o1 = text.match(/Objection 1:\s*([^\n]+)/i)?.[1]?.trim();
  const r1 = text.match(/Response 1:\s*([^\n]+)/i)?.[1]?.trim();
  const o2 = text.match(/Objection 2:\s*([^\n]+)/i)?.[1]?.trim();
  const r2 = text.match(/Response 2:\s*([^\n]+)/i)?.[1]?.trim();
  if (!o1 || !r1 || !o2 || !r2) return null;
  return [
    { objection: o1, response: r1 },
    { objection: o2, response: r2 },
  ];
};

// Displays the two most likely objections and suggested responses from parsed labels.
const ObjectionPrepCard = ({ objectionPrep }) => {
  const items =
    objectionPrep?.status === "ok" && objectionPrep?.text
      ? parseObjectionPrepText(objectionPrep.text)
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Objection Prep</h3>
      {objectionPrep?.status !== "ok" || !items ? (
        <p className="text-sm text-slate-700">AI analysis unavailable</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Objection 1</p>
            <p className="text-sm text-slate-700">{items[0].objection}</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">Response 1</p>
            <p className="text-sm text-slate-700">{items[0].response}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Objection 2</p>
            <p className="text-sm text-slate-700">{items[1].objection}</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">Response 2</p>
            <p className="text-sm text-slate-700">{items[1].response}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectionPrepCard;
