# EliseAI Lead Enrichment Tool

## Getting Started

1. Install dependencies:
   - `npm install`
2. Run development server:
   - `npm run dev`
3. Deploy to Vercel:
   - Push to GitHub
   - Import repo in Vercel dashboard
   - Deploy with default settings

## API Keys

- API keys are entered by users in the in-app API Keys panel at runtime.
- Keys are stored only in React state in memory for the active browser tab.
- Keys are never written to localStorage, sessionStorage, cookies, logs, URLs, or backend storage.
- Do not add any API keys to Vercel environment variables. All keys are entered by the user in the browser at runtime and are never stored anywhere. The deployed app contains zero credentials.

### NewsAPI and why news can look “broken” in the browser

News is **not** fetched directly from `newsapi.org` in the browser. NewsAPI’s free developer tier only allows browser calls from **localhost**; deployed sites (Vercel, GitHub Pages, etc.) are blocked by **CORS**, so the request fails even with a valid key. Census, Wikipedia, and DataUSA still work because those endpoints allow browser origins.

This project routes NewsAPI through a **same-origin proxy** at **`/api/news-proxy`** (`api/news-proxy.js` on Vercel, mirrored by the Vite dev server in `vite.config.js`). After deploy, news should load the same way as on `npm run dev`. If news is still empty for a lead, the company may simply have no hits in the last 30 days on the allowed business domains—that is different from a proxy or key error (the UI will show a short diagnostic when the proxy returns an error).

## Scoring Assumptions

This assignment requires a transparent, non-black-box scoring model. Every score row in the app shows the detected value, points awarded, and plain-English reason.

### Housing Scoring (100 points total)

1. Company Name Match (25 max)
   - +25 if company contains housing keywords
   - +0 if no match
   - Why: validates likely housing industry relevance

2. Renter Rate (25 max)
   - > 65%: +25
   - 50-65%: +18
   - 35-50%: +10
   - < 35%: +3
   - null: +0
   - Why: renter-heavy cities have higher communication volume for tours, leasing, and maintenance

3. Median Household Income (20 max)
   - $55k-$85k: +20
   - $85k-$110k: +15
   - $45k-$55k: +10
   - < $45k: +5
   - > $110k: +10
   - null: +0
   - Why: middle-market cities usually combine software budget with high operational activity

4. City Population (20 max)
   - > 500k: +20
   - 100k-500k: +15
   - 50k-100k: +8
   - < 50k: +3
   - null: +0
   - Why: larger metros have more scaled property operations

5. Email Domain Quality (10 max)
   - +10 for business domain
   - +0 for personal domain (gmail, yahoo, etc.)
   - Why: business domains improve confidence that lead is tied to a real organization

### Healthcare Scoring (100 points total)

1. Company Name Match (25 max)
   - +25 if company contains healthcare keywords
   - +0 if no match
   - Why: validates likely healthcare relevance

2. City Population (25 max)
   - > 500k: +25
   - 100k-500k: +18
   - 50k-100k: +10
   - < 50k: +5
   - null: +0
   - Why: population correlates with patient volume and scheduling workload

3. Median Household Income (20 max)
   - $50k-$90k: +20
   - $90k-$120k: +15
   - $40k-$50k: +10
   - < $40k: +8
   - > $120k: +12
   - null: +0
   - Why: income helps estimate payer mix and provider purchasing conditions

4. Email Domain Quality (10 max)
   - Same rules as housing

5. State Healthcare Market Strength (20 max)
   - +20: CA, TX, FL, NY, IL, PA, OH, GA, NC, NJ, AZ, WA, MA, TN, CO
   - +12: all other states
   - +5: WY, VT, ND, SD, MT, AK
   - Why: statewide market depth helps prioritize expansion-ready regions

### Score Labels

- 85-100: Hot Lead
- 65-84: Warm Lead
- 45-64: Nurture
- 0-44: Low Priority

### Recommended Action

- Hot: Same-day outreach, prioritize above all other leads in queue
- Warm: Follow up within 48 hours
- Nurture: Add to 30-day drip sequence, revisit next month
- Low Priority: Queue behind all warm and hot leads

## APIs Used

1. US Census ACS5
   - Returns median income, occupied housing units, owner occupied units, and population
   - Used to calculate renter rate and core market demographics
   - Chosen because it is a trusted free source for city-level demographic signals relevant to EliseAI's housing and healthcare targeting
   - No API key required

2. DataUSA
   - Returns city population records by year
   - Used to cross-reference most recent population and fall back to Census population if no match
   - Chosen because it provides a structured query API around census-style data
   - No API key required

3. Wikipedia REST API
   - Returns plain-text city summary context
   - Used to enrich sales insights and personalize outreach with local details
   - Chosen for simple, free, readable city summaries
   - No API key required

4. NewsAPI
   - Returns recent headlines mentioning the prospect company or local market
   - Used as a timing signal and passed into Claude prompts for deeper GTM analysis
   - Supports fallback market queries when direct company news is not found
   - Free key at `newsapi.org/register`

5. Anthropic Claude API
   - Used for four AI features:
     1) Personalized outreach email using market data and news
     2) News signal analysis explaining trajectory and outreach timing
     3) Plain English score summary for rapid rep prioritization
     4) Objection prep with two likely objections and suggested responses
   - Free tier available at `console.anthropic.com`

## Project Rollout Plan

### MVP Testing (Week 1 to 2)

- 2 to 3 SDRs use the tool on existing lead lists
- Compare enriched score against each SDR's manual lead-quality instinct
- Collect feedback on score quality, email usability, and missing data signals

### Stakeholders

- VP of Sales: executive sponsor, defines ICP quality, approves broader rollout
- SDR Team Lead: core daily user, workflow owner, drives training feedback
- RevOps: owns CRM process and future Salesforce or HubSpot integration
- Legal: validates public API usage and compliance posture

### Rollout Timeline

- Week 1-2: MVP pilot with 2 SDRs, gather structured feedback
- Week 3: update scoring weights based on pilot findings, resolve data issues
- Week 4: full SDR rollout with 30-minute enablement session
- Week 6: CRM integration for automatic enrichment on new lead creation
- Week 8: score calibration against conversion outcomes

### Success Metrics

- Time per lead: reduce from 15-20 minutes manual research to under 2 minutes
- Email reply rate: compare Claude-assisted drafts vs manually written outreach
- SDR adoption: track weekly active users and proportion of leads enriched

