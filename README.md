# EliseAI Practical Assessment

---

## Candidate Details

| Field | Details |
| --- | --- |
| Name | Suloni Praveen |
| Email | sulonipr@usc.edu |
| Role Applied For | GTM Engineer  |

---

## Links

| Resource | Link |
| --- | --- |
| GitHub Repository (Project Code) | [**Github Link**](https://github.com/SuloniPraveen/Lead-Enrichment-Tool) |
| Live Demo Tool | [**Live Tool Link**](https://lead-enrichment-tool-nu.vercel.app/) |
| Video Walkthrough (5-15 min) | [**Video Link**](https://drive.google.com/file/d/1Ln-vJ0aOqqm9BaOL_USVq2Z8KG9Aw_cO/view?usp=sharing) |
| Sample CSV for Demo | **https://drive.google.com/file/d/1TC3jtYG2ZSicBpxul-NTRCCW-ThCPWmr/view?usp=sharing** |

---

## What I Built

A full-stack lead enrichment tool called the **EliseAI Lead Enrichment Tool** built in React and deployed on Vercel. The tool takes raw inbound lead data and automatically enriches it using multiple public APIs, scores the lead against a documented model, and generates four AI-powered outputs for the sales rep - all triggered by a single button click.

The tool works in two modes:

**Single Lead Mode** - A rep fills in one lead and clicks Enrich Lead. The full pipeline runs automatically and outputs four cards on screen: Lead Overview with AI Score Summary, Score Breakdown, Sales Insights, and Outreach Email with Objection Prep.

**Batch Mode** - A rep uploads a CSV file of leads and clicks Process All Leads. The tool processes every lead sequentially, populates a results table in real time sorted by score, and allows the rep to click any row to expand the full detailed view. An Export button downloads all results as a CSV file.

---

## Public APIs Used and Why

### 1. US Census ACS5 API

**Free. No API key required.**

Pulls median household income, total occupied housing units, owner-occupied units, and total population for any US city by state FIPS code.

**Why I chose it:** EliseAI's housing product targets property management companies. The renter rate (derived from Census data as total units minus owner-occupied units divided by total units) is the single strongest signal for whether a city has the communication volume that makes EliseAI valuable. A city where 65% of households rent means property managers are dealing with massive inbound volume every day, tours, leases, maintenance requests. That is the core pain EliseAI solves. Median income tells us whether the market has the budget profile for a SaaS product.

---

### 2. DataUSA API

**Free. No API key required.**

Returns city-level population data as a cross-reference and fallback for Census population figures.

**Why I chose it:** It provides a second authoritative source for population data and handles cases where the Census API does not return an exact city match. It also acts as a graceful fallback so the app never crashes due to a missing data point.

---

### 3. Wikipedia REST API

**Free. No API key required.**

Returns a plain-English summary of any city including context about its economy, geography, and character.

**Why I chose it:** This context gets passed directly to Claude when generating the outreach email. It allows the email to reference locally grounded facts about the city rather than generic statements. For example knowing that Atlanta is the healthcare hub for the broader Southeast changes how the email positions EliseAI for a healthcare lead there.

---

### 4. NewsAPI

**Free tier. API key required.**

Pulls recent headlines mentioning the company name or their local market. Configured with domain filtering so only reputable business and industry sources are returned. Healthcare leads pull from sources like Modern Healthcare, Becker's Hospital Review, and STAT News. Housing leads pull from sources like GlobeSt, Bisnow, and HousingWire. Results are filtered to the last 30 days and irrelevant keywords (sports, entertainment) are stripped out.

**Why I chose it:** A company actively in the news signals growth, expansion, or funding -- which means better timing for outreach and more context for personalization. The top headline is passed to Claude which can reference it naturally in the outreach email to make it feel researched rather than templated.

---

### 5. Anthropic Claude API

**Paid. API key required.**

Used for four separate AI features, all running in parallel after the data APIs return:

**Feature 1 - Outreach Email:** Generates a personalized cold outreach email under 160 words using the enriched market data and any relevant news. Different prompts for Housing and Healthcare verticals.

**Feature 2 - AI News Analysis:** Analyzes the fetched news headlines and answers three questions for the rep: what is the key signal, is the company growing or struggling, and is now a good time to reach out.

**Feature 3 - AI Score Summary:** Writes a 2 to 3 sentence plain English explanation of what the score means for the rep. Should they prioritize this lead today? What is the strongest reason to call and what is the biggest gap?

**Feature 4 - Objection Prep:** Predicts the two most likely objections this specific prospect will raise based on their industry, city, and lead data, and provides a one-sentence response to each.

**Why Claude for four features:** Generic templates do not convert. Each of these outputs uses the actual enriched data to produce something specific to that lead. The rep gets more value from a single click than from an hour of manual research.

---

## Scoring Logic and Assumptions

### Step 0: Vertical Detection

Before any scoring the tool classifies the lead into one of three verticals based on keywords in the company name.

**Housing keywords:** properties, realty, residential, apartments, management, mgmt, housing, living, communities, equity, homes, real estate, leasing, rentals, property

**Healthcare keywords:** health, medical, clinic, care, hospital, wellness, therapy, dental, ortho, pediatric, family practice, urgent care, pharmacy, physicians, associates, healthcare, clinics, medspa, surgery, rehab

If the company matches neither or both, it is flagged as Unclassified and the rep is told to verify manually before any outreach is sent.

---

### **Housing**

| **Signal** | **Max Points** | **Thresholds** | **Assumption** |
| --- | --- | --- | --- |
| Company Name Match | 25 | +25 if company name matches a housing keyword (`HOUSING_KEYWORDS`); +0 if not | Fastest check that the lead looks like a property-management / housing operator |
| Renter Rate | 25 | Data missing: +0; **>65%**: +25; **50–65%**: +18; **35–<50%**: +10; **<35%**: +3 | Higher renter share → more leasing/communities traffic → stronger automation ROI |
| Median Household Income | 20 | Data missing: +0; **55k–55*k*–85k**: +20; **>85k–85*k*–110k**: +15; **45k–<45*k*–<55k**: +10; **<45k∗∗:+5;∗∗>45*k*∗∗:+5;∗∗>110k**: +10 | Middle markets balance budget and volume; extremes get partial credit per code |
| City Population | 20 | Data missing: +0; **>500k**: +20; **100k–500k**: +15; **50k–<100k**: +8; **<50k**: +3 | Larger metros → larger PM footprints and more units under management |
| Email Domain Quality | 10 | +10 if email domain is **not** in the personal list (`PERSONAL_EMAIL_DOMAINS` in `scoringWeights.js`); +0 if personal or domain missing | Company domain suggests real operator / B2B context vs individual landlord |
| Recent News Bonus | +5 (displayed total **capped at 100**) | +5 only when `newsStatus === "ok"` and at least one **relevant** article remains after the app’s news pipeline; else +0 | Recent industry news → timing / momentum for outreach (bonus can cap at 100) |

---

### **Healthcare**

| **Signal** | **Max Points** | **Thresholds** | **Assumption** |
| --- | --- | --- | --- |
| Company Name Match | 25 | +25 if company name matches a healthcare keyword (`HEALTHCARE_KEYWORDS`); +0 if not | Fastest check that the lead looks like a provider / healthcare operator |
| City Population | 25 | Data missing: +0; **>500k**: +25; **100k–500k**: +18; **50k–<100k**: +10; **<50k**: +5 | Bigger cities → more patients/appointments → higher communication load |
| Median Household Income | 20 | Data missing: +0; **50k–50*k*–90k**: +20; **>90k–90*k*–120k**: +15; **40k–<40*k*–<50k**: +10; **<40k∗∗:+8;∗∗>40*k*∗∗:+8;∗∗>120k** (else): +12 | Mid-market income aligns with stable demand; bands reflect coverage / volume tradeoffs in code |
| Email Domain Quality | 10 | Same personal-domain rule as housing (+10 / +0) | Company domain suggests institutional buyer vs personal inquiry |
| State Healthcare Market Strength | 20 | **Strong** states (e.g. CA, TX, FL, NY, … per `strongStates` in code): +20; **Mid-tier** (default): +12; **Emerging** small/rural list (WY, VT, ND, SD, MT, AK): +5 | Large statewide healthcare economies support higher patient-comm volume; sparse states score lower |
| Recent News Bonus | +5 (displayed total **capped at 100**) | Same eligibility rule as housing | Same timing / momentum signal for outreach |

---

### Score Labels

| Score | Label | Recommended Action |
| --- | --- | --- |
| 85-100 | Hot Lead | Same-day outreach, prioritize above all others |
| 65-84 | Warm Lead | Follow up within 48 hours |
| 45-64 | Nurture | Add to 30-day drip sequence |
| 0-44 | Low Priority | Queue behind warm and hot leads |

---

### Key Assumptions Documented

1. EliseAI's best housing customers are professional property management companies in dense renter markets in mid to large cities with middle-class demographics. Very low income areas struggle to afford SaaS. Very high income luxury markets have lower unit density and more white-glove manual service.
2. EliseAI's best healthcare customers are multi-provider regional clinics and medical groups in large cities with insured patient bases. Solo practitioners are too small. Large hospital systems have procurement cycles that are too long. The sweet spot is regional multi-provider groups.
3. A company email domain is a proxy for organizational maturity. Individual landlords or solo practitioners use Gmail. Real property management companies and medical groups have company domains.
4. The renter rate is the single most predictive signal for housing leads because it directly measures the volume of the problem EliseAI solves.
5. City population is the single most predictive signal for healthcare leads because it correlates with appointment volume which drives front desk admin burden.

---

## Project Code Overview

### Tech Stack

- **Vite + React** - frontend framework, fast builds, Vercel-ready
- **Tailwind CSS** - styling
- **No backend, no database** - everything runs client-side
- **Deployed on Vercel** - free tier, auto-deploys from GitHub

---

### Most Essential Files

Here are the **most important logic files**, in roughly the order the pipeline runs. Please have a look at the [**Github Link**](https://github.com/SuloniPraveen/Lead-Enrichment-Tool)

1. **`src/App.jsx`** — **`processLead`** ties the whole flow together: vertical → Census/DataUSA/Wikipedia → news → score → Claude calls (single + shared with batch).
2. **`src/utils/verticalDetection.js`** — Decides Housing vs Healthcare vs Unclassified from the company string.
3. **`src/utils/censusApi.js`** — Census / demographic enrichment for the lead’s city.
4. **`src/utils/dataUsaApi.js`** — City population (and related fallbacks).
5. **`src/utils/wikipediaApi.js`** — Short city context for scoring / prompts.
6. **`src/utils/newsApi.js`** — NewsAPI queries, date/domain filtering, post-filtering, relevance step; what lands in `marketData.newsArticles`.
7. **`src/utils/scoringEngine.js`** — **`scoreLead`**: base signals, news bonus, cap at 100, breakdown rows, labels.
8. **`src/utils/claudeApi.js`** — All Anthropic calls: outreach email, news analysis, score summary, objection prep, headline filtering helpers used from news flow.
9. **`src/components/BatchMode.jsx`** — CSV parse → sequential **`processLead`** per row → results table / exports (same core logic as single).

---

## Project Plan and Rollout

### Testing the MVP (Week 1 to 2)

Select 2 to 3 SDRs who are open to trying new tools and have them run the enrichment tool on their existing lead lists in parallel with their normal manual research process.

Key questions to answer during MVP testing:

- Does the score match their gut? If an SDR consistently disagrees with a Hot score, the weights need recalibrating.
- Would they send the Claude-drafted email as-is or do they edit it significantly? Heavy editing means the prompt needs work.
- What data is missing that they still have to look up manually?
- How does the batch mode fit into their daily workflow?

Collect feedback via a simple Google Form after each session -- score accuracy rating, email quality rating, and open text for what to improve.

---

### Rollout Timeline

| Week | Activity |
| --- | --- |
| Week 1-2 | MVP testing with 2-3 SDRs, collect qualitative feedback |
| Week 3 | Adjust scoring weights based on rep input, fix any API issues, improve email prompt |
| Week 4 | Full SDR team rollout with 30 minute training session |
| Week 6 | CRM integration - connect to HubSpot or Salesforce so enrichment runs automatically on new leads |
| Week 8 | First scoring recalibration based on actual conversion data - which Hot leads actually closed? |

---

### Stakeholders

| Stakeholder | Role in Rollout |
| --- | --- |
| VP of Sales | Executive sponsor. Defines what a good lead looks like and approves rollout to full team. |
| SDR Team Lead | Primary daily user. Owns workflow integration feedback and leads the team training session. |
| RevOps | Owns the CRM. Manages the HubSpot or Salesforce integration in Week 6. |
| Legal | Quick review of what public API data is being pulled and how it is stored. Census and Wikipedia are public domain. NewsAPI serves published articles. No PII is stored anywhere. |

---

### Success Metrics

| Metric | Target |
| --- | --- |
| Time per lead | Reduce from 20 minutes manual research to under 2 minutes |
| Email reply rate | Compare Claude-drafted outreach reply rate vs manually written emails over 30 days |
| SDR adoption rate | Track weekly -- are they actually opening and using the tool? |
| Score accuracy | At Week 8, compare Hot lead scores against actual closed deals to validate weights |

---

### Automation Approach

The tool uses a **button trigger** - a single click automates the entire enrichment pipeline. This satisfies the assignment requirement of "a trigger (e.g., a button)" explicitly listed as a valid automation approach.

In a production rollout the same logic would connect to Google Sheets via Apps Script using an `onEdit` trigger so enrichment fires automatically the moment a new lead row is added to the sheet - no button click required. The SDR workflow does not change at all. They add a lead to the sheet and the enrichment columns populate themselves.
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

This project routes NewsAPI through a **same-origin proxy** at **`/api/news-proxy`** (`api/news-proxy.js` on Vercel, mirrored by the Vite dev server in `vite.config.js`). The proxy builds the upstream URL from **`req.url`** (query string included), because **`req.query` is not always populated** on Vercel for this route—an empty forward request would silently return no articles. If the proxy is missing or returns HTML (404), the client **falls back to a direct NewsAPI call**, which only succeeds where NewsAPI allows browser CORS (typically **localhost**).

Anthropic calls stay **browser → `api.anthropic.com`** (unchanged by the news proxy). Default Claude model is **`claude-opus-4-5`**; set **`VITE_CLAUDE_MODEL`** at build time if your org uses another model id.

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

