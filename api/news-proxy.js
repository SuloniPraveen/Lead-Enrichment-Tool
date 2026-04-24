// Server-side forwarder for NewsAPI (avoids browser CORS on deployed sites).
// Build query from req.url — Vercel often does not populate req.query for /api routes.

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).setHeader("Allow", "GET, HEAD").json({ status: "error", message: "Method not allowed" });
    return;
  }

  try {
    const forward = new URL("https://newsapi.org/v2/everything");
    const host = req.headers?.host || "localhost";
    const incoming = new URL(req.url || "/", `https://${host}`);
    incoming.searchParams.forEach((value, key) => {
      forward.searchParams.set(key, value);
    });
    if (req.query && typeof req.query === "object") {
      for (const [key, raw] of Object.entries(req.query)) {
        const val = Array.isArray(raw) ? raw[0] : raw;
        if (val !== undefined && val !== null) forward.searchParams.set(key, String(val));
      }
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
