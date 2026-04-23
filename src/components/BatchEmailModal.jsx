import { useState } from "react";

// Modal overlay to read and copy a single lead outreach email from batch results.
const BatchEmailModal = ({ isOpen, onClose, leadName, company, emailText }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Copies email body to clipboard for quick rep workflow.
  const handleCopy = async () => {
    if (!emailText) return;
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-4">
          <p className="font-semibold text-slate-900">{leadName}</p>
          <p className="text-sm text-slate-600">{company}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <textarea
            readOnly
            value={emailText || ""}
            className="min-h-48 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800"
          />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {copied ? "✓ Copied" : "Copy to Clipboard"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchEmailModal;
