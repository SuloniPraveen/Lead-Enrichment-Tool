import { useEffect, useState } from "react";

// Renders secure in-memory key inputs with per-field visibility toggles.
const ApiKeysPanel = ({ anthropicApiKey, newsApiKey, onAnthropicChange, onNewsApiChange }) => {
  const [open, setOpen] = useState(true);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showNews, setShowNews] = useState(false);

  // Auto-collapses when at least one key has been entered.
  useEffect(() => {
    if ((anthropicApiKey || newsApiKey).trim()) {
      setOpen(false);
    }
  }, [anthropicApiKey, newsApiKey]);

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold text-slate-800">
          API Keys -- entered keys are used only in your browser during this session and are never stored, logged, or sent anywhere except directly to the respective API.
        </h2>
        <span className="ml-4 text-slate-600">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
            Your keys are never stored. They exist only in memory while this tab is open and are cleared the moment you close or refresh the page.
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Anthropic API Key (Required for AI features)
            </label>
            <div className="flex gap-2">
              <input
                type={showAnthropic ? "text" : "password"}
                value={anthropicApiKey}
                onChange={(event) => onAnthropicChange(event.target.value)}
                placeholder="Paste your Anthropic key here"
                className="w-full rounded-lg border border-slate-300 p-2.5"
              />
              <button
                type="button"
                onClick={() => setShowAnthropic((prev) => !prev)}
                className="rounded-lg border border-slate-300 px-3 text-sm text-slate-700"
              >
                {showAnthropic ? "🙈" : "👁"}
              </button>
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-blue-700 hover:underline"
            >
              Get Anthropic key
            </a>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              NewsAPI Key (Optional -- recent company and market news)
            </label>
            <div className="flex gap-2">
              <input
                type={showNews ? "text" : "password"}
                value={newsApiKey}
                onChange={(event) => onNewsApiChange(event.target.value)}
                placeholder="Paste your NewsAPI key here"
                className="w-full rounded-lg border border-slate-300 p-2.5"
              />
              <button
                type="button"
                onClick={() => setShowNews((prev) => !prev)}
                className="rounded-lg border border-slate-300 px-3 text-sm text-slate-700"
              >
                {showNews ? "🙈" : "👁"}
              </button>
            </div>
            <a
              href="https://newsapi.org/register"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-blue-700 hover:underline"
            >
              Get NewsAPI key
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ApiKeysPanel;
