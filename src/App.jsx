import { useState } from "react";
import LeadForm from "./components/LeadForm";
import StatusIndicator from "./components/StatusIndicator";
import LeadOverviewCard from "./components/LeadOverviewCard";
import ScoreBreakdownCard from "./components/ScoreBreakdownCard";
import SalesInsightsCard from "./components/SalesInsightsCard";
import OutreachEmailCard from "./components/OutreachEmailCard";
import ObjectionPrepCard from "./components/ObjectionPrepCard";
import ApiKeysPanel from "./components/ApiKeysPanel";
import AutomationNote from "./components/AutomationNote";
import BatchMode from "./components/BatchMode";
import ResultsSummaryBar from "./components/ResultsSummaryBar";
import { EMPTY_LEAD, HEALTHCARE_SAMPLE_LEAD, HOUSING_SAMPLE_LEAD } from "./constants/sampleLeads";
import { detectVertical } from "./utils/verticalDetection";
import { fetchCensusData } from "./utils/censusApi";
import { fetchDataUsaPopulation } from "./utils/dataUsaApi";
import { fetchWikipediaSummary } from "./utils/wikipediaApi";
import { fetchRecentNews } from "./utils/newsApi";
import { scoreLead } from "./utils/scoringEngine";
import {
  generateNewsAnalysis,
  generateObjectionPrep,
  generateOutreachEmail,
  generateScoreSummary,
} from "./utils/claudeApi";

const STEP_LABELS = [
  "Step 1: Detecting vertical...",
  "Step 2: Fetching Census demographic data...",
  "Step 3: Fetching city population data...",
  "Step 4: Fetching city profile from Wikipedia...",
  "Step 5: Fetching recent company news...",
  "Step 6: Scoring lead...",
  "Step 7: Generating outreach email...",
  "Step 8: Analyzing news signals...",
  "Step 9: Generating score summary...",
  "Step 10: Preparing objection responses...",
  "Done.",
];

// Creates pending step states for clean progress initialization.
const createInitialStepStates = () =>
  STEP_LABELS.map((label, index) => ({
    label,
    status: index === 0 ? "active" : "pending",
    note: null,
  }));

function App() {
  const [mode, setMode] = useState("single");
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [newsApiKey, setNewsApiKey] = useState("");
  const [stepStates, setStepStates] = useState([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  // Updates lead form fields without persisting anything outside state.
  const updateLead = (key, value) => {
    setLead((prev) => ({ ...prev, [key]: value }));
  };

  // Marks a step complete and activates the next one if pending.
  const markStepDone = (index) => {
    setStepStates((prev) =>
      prev.map((step, i) => {
        if (i === index) return { ...step, status: "done", note: null };
        if (i === index + 1 && step.status === "pending") return { ...step, status: "active" };
        return step;
      })
    );
  };

  // Marks a step as skipped or unavailable while continuing flow.
  const markStepWithState = (index, status, note) => {
    setStepStates((prev) =>
      prev.map((step, i) => {
        if (i === index) return { ...step, status, note };
        if (i === index + 1 && step.status === "pending") return { ...step, status: "active" };
        return step;
      })
    );
  };

  // Runs full enrichment for both single and batch modes.
  const processLead = async (targetLead, keys, showStatus = true) => {
    const keyBag = keys || {};
    if (showStatus) {
      setRunning(true);
      setStepStates(createInitialStepStates());
    }

    const vertical = detectVertical(targetLead.company);
    if (showStatus) markStepDone(0);

    const [censusData, dataUsaPopulationRaw, wikipediaSummary] = await Promise.all([
      fetchCensusData({ city: targetLead.city, state: targetLead.state }).then((data) => {
        if (showStatus) markStepDone(1);
        return data;
      }),
      fetchDataUsaPopulation({ city: targetLead.city, fallbackPopulation: null }).then((data) => {
        if (showStatus) markStepDone(2);
        return data;
      }),
      fetchWikipediaSummary({ city: targetLead.city, state: targetLead.state }).then((data) => {
        if (showStatus) markStepDone(3);
        return data;
      }),
    ]);

    const newsResult = await fetchRecentNews({
      company: targetLead.company,
      city: targetLead.city,
      state: targetLead.state,
      vertical,
      newsApiKey: keyBag.newsApiKey,
      anthropicApiKey: keyBag.anthropicApiKey,
    });
    if (showStatus) {
      if (newsResult.status === "no_key") markStepWithState(4, "skipped", "Skipped -- no API key provided");
      else if (newsResult.status === "failed")
        markStepWithState(4, "unavailable", newsResult.fetchError || "News request failed");
      else markStepDone(4);
    }

    const marketData = {
      ...censusData,
      population: dataUsaPopulationRaw ?? censusData.population ?? null,
      citySummary: wikipediaSummary,
      newsArticles: newsResult.articles,
      hadCandidatesButNoRelevance: newsResult.hadCandidatesButNoRelevance,
      newsStatus: newsResult.status,
      newsFetchError: newsResult.fetchError ?? null,
    };

    const scoreResult = scoreLead({ lead: targetLead, vertical, marketData });
    if (showStatus) markStepDone(5);

    let emailResult = { status: "failed", email: null };
    let newsAnalysis = { status: "skipped", keySignal: null, companyTrajectory: null, outreachTiming: null };
    let aiScoreSummary = { status: "failed", summary: null };
    let objectionPrep = { status: "failed", text: null };
    const canRunClaude = vertical === "Housing" || vertical === "Healthcare";

    if (!keyBag.anthropicApiKey?.trim()) {
      if (showStatus) {
        markStepWithState(6, "skipped", "Skipped -- no API key provided");
        markStepWithState(7, "skipped", "Skipped -- no API key provided");
        markStepWithState(8, "skipped", "Skipped -- no API key provided");
        markStepWithState(9, "skipped", "Skipped -- no API key provided");
      }
      emailResult = { status: "missing_key", email: null };
      aiScoreSummary = { status: "missing_key", summary: null };
      objectionPrep = { status: "missing_key", text: null };
    } else if (!canRunClaude) {
      if (showStatus) {
        markStepWithState(6, "skipped", "Skipped -- vertical not detected");
        markStepWithState(7, "skipped", "Skipped -- vertical not detected");
        markStepWithState(8, "skipped", "Skipped -- vertical not detected");
        markStepWithState(9, "skipped", "Skipped -- vertical not detected");
      }
    } else {
      const [emailOut, newsOut, scoreOut, objectionOut] = await Promise.all([
        generateOutreachEmail({
          apiKey: keyBag.anthropicApiKey,
          lead: targetLead,
          vertical,
          scoreResult,
          marketData,
        }),
        generateNewsAnalysis({
          apiKey: keyBag.anthropicApiKey,
          lead: targetLead,
          vertical,
          marketData,
        }),
        generateScoreSummary({
          apiKey: keyBag.anthropicApiKey,
          vertical,
          scoreResult,
        }),
        generateObjectionPrep({
          apiKey: keyBag.anthropicApiKey,
          lead: targetLead,
          vertical,
          scoreResult,
          marketData,
        }),
      ]);
      emailResult = emailOut;
      newsAnalysis = newsOut;
      aiScoreSummary = scoreOut;
      objectionPrep = objectionOut;

      if (showStatus) {
        emailOut.status === "ok"
          ? markStepDone(6)
          : markStepWithState(6, "unavailable", "Unavailable -- continuing");
        if (newsResult.status === "ok" && newsOut.status === "ok") markStepDone(7);
        else if (newsResult.status === "no_key")
          markStepWithState(7, "skipped", "Skipped -- no API key provided");
        else if (newsResult.status === "none")
          markStepWithState(7, "skipped", "Skipped -- no news available");
        else markStepWithState(7, "unavailable", "Unavailable -- continuing");
        scoreOut.status === "ok"
          ? markStepDone(8)
          : markStepWithState(8, "unavailable", "Unavailable -- continuing");
        objectionOut.status === "ok"
          ? markStepDone(9)
          : markStepWithState(9, "unavailable", "Unavailable -- continuing");
      }
    }

    if (showStatus) {
      setStepStates((prev) =>
        prev.map((step, index) => (index === 10 ? { ...step, status: "done", note: null } : step))
      );
      setRunning(false);
    }

    return {
      lead: targetLead,
      vertical,
      marketData,
      scoreResult,
      emailResult,
      newsAnalysis,
      aiScoreSummary,
      objectionPrep,
    };
  };

  // Triggers single-lead enrichment from button click.
  const enrichSingleLead = async () => {
    const enriched = await processLead(lead, { anthropicApiKey, newsApiKey }, true);
    setResult(enriched);
  };

  // Clears single-lead results and progress so the rep can start fresh.
  const startOverSingle = () => {
    setResult(null);
    setStepStates([]);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 px-4 py-6 text-white shadow">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">EliseAI Lead Enrichment Tool</h1>
          <p className="text-sm text-slate-200">Powered by Census, DataUSA, Wikipedia, and Claude AI</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <ApiKeysPanel
          anthropicApiKey={anthropicApiKey}
          newsApiKey={newsApiKey}
          onAnthropicChange={setAnthropicApiKey}
          onNewsApiChange={setNewsApiKey}
        />

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mode === "single" ? "bg-blue-700 text-white" : "bg-white text-slate-700"
            }`}
          >
            Single Lead
          </button>
          <button
            type="button"
            onClick={() => setMode("batch")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mode === "batch" ? "bg-blue-700 text-white" : "bg-white text-slate-700"
            }`}
          >
            Batch Mode
          </button>
        </div>

        {mode === "single" ? (
          <div className="space-y-5">
            <LeadForm
              lead={lead}
              onChange={updateLead}
              onSubmit={enrichSingleLead}
              onLoadHousing={() => setLead(HOUSING_SAMPLE_LEAD)}
              onLoadHealthcare={() => setLead(HEALTHCARE_SAMPLE_LEAD)}
              isRunning={running}
            />

            {running || stepStates.length ? <StatusIndicator steps={stepStates} /> : null}

            {result ? (
              <>
                <ResultsSummaryBar mode="single" singleResult={result} />
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={startOverSingle}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Start Over
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <LeadOverviewCard
                  lead={result.lead}
                  vertical={result.vertical}
                  scoreResult={result.scoreResult}
                  aiScoreSummary={result.aiScoreSummary}
                  countryNote={
                    result.lead.country.trim().toLowerCase() === "united states"
                      ? result.marketData.fallbackNote
                      : "API enrichment currently supports US cities only. Score is based on available data."
                  }
                />
                <ScoreBreakdownCard scoreResult={result.scoreResult} />
                <SalesInsightsCard
                  vertical={result.vertical}
                  marketData={result.marketData}
                  lead={result.lead}
                  newsAnalysis={result.newsAnalysis}
                />
                {result.vertical !== "Unclassified" ? <OutreachEmailCard emailResult={result.emailResult} /> : null}
                {result.vertical !== "Unclassified" ? (
                  <div className="lg:col-span-2">
                    <ObjectionPrepCard objectionPrep={result.objectionPrep} />
                  </div>
                ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <BatchMode
            processLead={processLead}
            anthropicApiKey={anthropicApiKey}
            newsApiKey={newsApiKey}
          />
        )}

        <div className="mt-6">
          <AutomationNote />
        </div>
      </main>
    </div>
  );
}

export default App;
