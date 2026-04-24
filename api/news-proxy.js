// Server-side forwarder for NewsAPI. Browser calls cannot hit newsapi.org from most
// deployed origins (CORS); this route runs on the host (e.g. Vercel) without CORS limits.

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).setHeader("Allow", "GET, HEAD").json({ status: "error", message: "Method not allowed" });
    return;
  }

  try {
    const forward = new URL("https://newsapi.org/v2/everything");
    const q = req.query || {};
    for (const [key, raw] of Object.entries(q)) {
      const val = Array.isArray(raw) ? raw[0] : raw;
      if (val === undefined || val === null) continue;
      forward.searchParams.set(key, String(val));
    }

    const upstream = await fetch(forward.toString());
    const body = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(body);
  } catch (e) {
    res
      .status(502)
      .setHeader("Content-Type", "application/json")
      .json({ status: "error", message: e?.message || "News proxy failed" });
  }
}
