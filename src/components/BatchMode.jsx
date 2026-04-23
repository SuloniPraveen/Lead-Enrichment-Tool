import { Fragment, useEffect, useMemo, useState } from "react";
import { parseCsvText } from "../utils/csvParser";
import { exportBatchEnrichmentCsv, buildAllEmailsClipboardText } from "../utils/batchExportCsv";
import { getStateAbbr } from "../utils/stateNameToAbbr";
import EnrichmentDetailStack from "./EnrichmentDetailStack";
import BatchEmailModal from "./BatchEmailModal";
import ResultsSummaryBar from "./ResultsSummaryBar";

// Returns Tailwind classes for score text color from lead label bucket.
const scoreTextClass = (label) => {
  if (label === "Hot Lead") return "text-orange-600";
  if (label === "Warm Lead") return "text-amber-600";
  if (label === "Nurture") return "text-blue-600";
  if (label === "Low Priority") return "text-slate-500";
  return "text-slate-800";
};

// Returns badge styles for vertical column in batch table.
const verticalBadgeClass = (vertical) => {
  if (vertical === "Housing") return "bg-blue-100 text-blue-800";
  if (vertical === "Healthcare") return "bg-emerald-100 text-emerald-800";
  return "bg-orange-100 text-orange-800";
};

const labelBadgeClass = (label) => {
  if (label === "Hot Lead") return "bg-orange-100 text-orange-800";
  if (label === "Warm Lead") return "bg-amber-100 text-amber-800";
  if (label === "Nurture") return "bg-blue-100 text-blue-800";
  if (label === "Low Priority") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
};

// Handles CSV upload, sequential batch enrichment, results table, and detail overlays.
const BatchMode = ({ processLead, anthropicApiKey, newsApiKey }) => {
  const [leads, setLeads] = useState([]);
  const [results, setResults] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scoreSortDesc, setScoreSortDesc] = useState(true);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [batchTiming, setBatchTiming] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );

  // Tracks viewport so batch detail uses inline panel on desktop and full-screen overlay on mobile.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Parses uploaded CSV into in-memory lead rows (no persistence).
  const handleFile = (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsvText(reader.result?.toString() || "");
      setLeads(parsed);
      setResults([]);
      setExpandedId(null);
      setBatchTiming(null);
    };
    reader.readAsText(file);
  };

  // Resets batch workspace so a new CSV can be uploaded cleanly.
  const clearAndUploadNew = () => {
    setLeads([]);
    setResults([]);
    setExpandedId(null);
    setBatchTiming(null);
    setFileInputKey((k) => k + 1);
  };

  // Runs enrichment per lead with delay; failures never stop the batch.
  const processAll = async () => {
    setProcessing(true);
    setResults([]);
    setExpandedId(null);
    setBatchTiming(null);
    const t0 = Date.now();
    let success = 0;
    let failed = 0;
    for (let i = 0; i < leads.length; i += 1) {
      setCurrentIndex(i + 1);
      const row = leads[i];
      const leadPayload = {
        fullName: row.name,
        email: row.email,
        company: row.company,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country || "United States",
      };
      const batchResultId = `br-${i}-${Date.now()}`;
      try {
        const enriched = await processLead(leadPayload, { anthropicApiKey, newsApiKey }, false);
        setResults((prev) => [...prev, { ...enriched, enrichmentSuccess: true, batchResultId }]);
        success += 1;
      } catch {
        setResults((prev) => [
          ...prev,
          {
            enrichmentSuccess: false,
            batchResultId,
            lead: leadPayload,
          },
        ]);
        failed += 1;
      }
      if (i < leads.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    setBatchTiming({ success, failed, total: leads.length, seconds });
    setProcessing(false);
  };

  // Sorted successful rows first by score, failed rows pinned to bottom.
  const sortedResults = useMemo(() => {
    const ok = results.filter((r) => r.enrichmentSuccess);
    const bad = results.filter((r) => !r.enrichmentSuccess);
    ok.sort((a, b) =>
      scoreSortDesc
        ? b.scoreResult.totalScore - a.scoreResult.totalScore
        : a.scoreResult.totalScore - b.scoreResult.totalScore
    );
    return [...ok, ...bad];
  }, [results, scoreSortDesc]);

  // Copies concatenated outreach emails for all successful rows.
  const copyAllEmails = async () => {
    const text = buildAllEmailsClipboardText(results);
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const expandedResult = sortedResults.find((r) => r.batchResultId === expandedId) || null;

  return (
    <div className="space-y-5">
      <div
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
        onDragOver={(event) => event.preventDefault()}
        className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"
      >
        <label className="block cursor-pointer text-sm font-medium text-slate-700">
          <input
            key={fileInputKey}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          Drop your CSV here or click to upload
        </label>
      </div>

      {leads.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-800">
            {leads.length} leads found -- ready to process
          </p>
          <div className="max-h-64 overflow-auto overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2">City</th>
                  <th className="px-2 py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{lead.name}</td>
                    <td className="px-2 py-2">{lead.email}</td>
                    <td className="px-2 py-2">{lead.company}</td>
                    <td className="px-2 py-2">{lead.city}</td>
                    <td className="px-2 py-2">{lead.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={processAll}
            disabled={!leads.length || processing}
            className="mt-4 w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-50 md:w-auto md:min-w-[280px]"
          >
            Process All Leads
          </button>
        </div>
      ) : null}

      {(processing || results.length > 0) && (
        <>
          {processing ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-700">
                Processing lead {currentIndex} of {leads.length || results.length}...
              </p>
              <div className="mt-2 h-3 rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-blue-700 transition-all duration-300"
                  style={{
                    width: `${Math.round((currentIndex / Math.max(leads.length, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <ResultsSummaryBar mode="batch" batchResults={results} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={clearAndUploadNew}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear and Upload New File
            </button>
            {results.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => exportBatchEnrichmentCsv(results)}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Export Results
                </button>
                <button
                  type="button"
                  onClick={copyAllEmails}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Copy All Emails
                </button>
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Company</th>
                  <th className="px-3 py-3 font-semibold">City</th>
                  <th className="px-3 py-3 font-semibold">Vertical</th>
                  <th className="px-3 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => setScoreSortDesc((d) => !d)}
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      Score
                      <span className="text-xs font-normal text-slate-500">{scoreSortDesc ? "↓" : "↑"}</span>
                    </button>
                  </th>
                  <th className="px-3 py-3 font-semibold">Label</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, index) => {
                  const isOpen = expandedId === result.batchResultId;
                  const rowBg = isOpen ? "bg-blue-50" : index % 2 === 0 ? "bg-white" : "bg-slate-50";
                  return (
                    <Fragment key={result.batchResultId}>
                      <tr
                        className={`cursor-pointer border-b border-slate-200 transition-colors hover:bg-blue-50/60 ${rowBg}`}
                        onClick={() => setExpandedId(isOpen ? null : result.batchResultId)}
                      >
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {result.enrichmentSuccess ? result.lead.fullName : result.lead?.fullName || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {result.enrichmentSuccess ? result.lead.company : result.lead?.company || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {result.enrichmentSuccess
                            ? `${result.lead.city}, ${getStateAbbr(result.lead.state)}`
                            : result.lead?.city && result.lead?.state
                              ? `${result.lead.city}, ${getStateAbbr(result.lead.state)}`
                              : "N/A"}
                        </td>
                        <td className="px-3 py-3">
                          {result.enrichmentSuccess ? (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${verticalBadgeClass(result.vertical)}`}
                            >
                              {result.vertical}
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                              Enrichment Failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {result.enrichmentSuccess ? (
                            <span
                              className={`text-xl font-extrabold ${scoreTextClass(result.scoreResult.label)}`}
                            >
                              {Math.min(Number(result.scoreResult.totalScore) || 0, 100)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {result.enrichmentSuccess ? (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${labelBadgeClass(result.scoreResult.label)}`}
                            >
                              {result.scoreResult.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          {result.enrichmentSuccess &&
                          result.vertical !== "Unclassified" &&
                          result.emailResult?.email ? (
                            <button
                              type="button"
                              onClick={() =>
                                setEmailModal({
                                  name: result.lead.fullName,
                                  company: result.lead.company,
                                  email: result.emailResult.email,
                                })
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-slate-50"
                            >
                              View Email
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-500">
                          <span
                            className={`inline-block transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            aria-hidden
                          >
                            ▼
                          </span>
                          <span className="sr-only">Expand</span>
                        </td>
                      </tr>
                      {isOpen && isDesktop ? (
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <td colSpan={8} className="p-0">
                            <div className="border-t border-slate-200">
                              <div className="min-h-0 overflow-hidden">
                                <div className="p-4">
                                  <EnrichmentDetailStack
                                    result={result}
                                    showCloseButton
                                    onClose={() => setExpandedId(null)}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!processing && batchTiming ? (
            <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
              <p>
                Processed {batchTiming.total} leads in {batchTiming.seconds} seconds
              </p>
              <p>
                {batchTiming.success} leads enriched successfully, {batchTiming.failed} failed
              </p>
            </div>
          ) : null}
        </>
      )}

      {expandedResult && !isDesktop ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-end border-b border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setExpandedId(null)}
              className="rounded-md px-3 py-1 text-2xl font-bold text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <EnrichmentDetailStack result={expandedResult} showCloseButton={false} onClose={() => {}} />
          </div>
        </div>
      ) : null}

      <BatchEmailModal
        isOpen={!!emailModal}
        onClose={() => setEmailModal(null)}
        leadName={emailModal?.name || ""}
        company={emailModal?.company || ""}
        emailText={emailModal?.email || ""}
      />
    </div>
  );
};

export default BatchMode;
