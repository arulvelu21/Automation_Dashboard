# Automation Dashboard

Internal reporting dashboard for automation use cases and execution details, backed by PostgreSQL with a mock fallback for local development.

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- PostgreSQL (pg)
- Chart.js via react-chartjs-2

## Prerequisites

- Node.js 20 LTS is recommended for Next.js 14. This repo includes an `.nvmrc` with `20`.
  - If you use nvm: `nvm install 20 && nvm use`
  - If you use fnm/asdf/volta, align to Node 20.

## Quick start

1. Install dependencies
```bash
npm ci
```

2. Create a `.env.local` (or set env vars) for PostgreSQL
```bash
# Either a single connection string
# DATABASE_URL=postgres://user:password@host:5432/dbname

# Or individual vars
# PGHOST=localhost
# PGPORT=5432
# PGUSER=postgres
# PGPASSWORD=postgres
# PGDATABASE=automation
# Optional: require SSL for managed PG
# PGSSL=require
```
If env is not set or DB is unreachable, the app uses mock data so you can still develop the UI.

3. Run the app
```bash
npm run dev
```
The dev server uses port 3000; if it's busy, it will fall back to 3001.

4. Build and start (optional)
```bash
## What’s new (September 2025)
- Fixed savings are now period-based, not per-execution. By default, fixed-type use cases contribute a constant per-week amount over the selected date range (configurable; see Environment variables).
- Use Cases overlay: Clicking a use case opens a branded modal with Overview (Stakeholder, short process, HLD link), recent reporting, and savings configuration.
- URL persistence for controls: date range, chart orientation (horizontal), stacked, percent mode, and selected use cases persist in the URL.
- Server-side filtering by selected use case names for reporting aggregates for better performance on large datasets.
- Reporting table alignment: consistent numeric alignment, two-line unit headers, fixed column widths, and hours standardized to two decimals.
- Recent Activity section based on reporting daily aggregates (no dependency on legacy runs table).
- Prevent page jump: all query-string updates (filters, toggles, use case selections) use `scroll: false` so the view doesn't auto-scroll to the top.
- Top Use Cases cards have equal height and aligned content across the grid for a cleaner layout.
- Data layer is resilient when tables are missing:
  - If the configured reporting table is absent, aggregates return an empty list (no 500).
  - Savings reference table is optional; if it's missing, savings default to zero instead of throwing.
- Node version pinning: added `.nvmrc` (Node 20) for consistent local dev.

## Data model & mapping
This dashboard primarily uses two tables:

1) `reporting` (configurable)
- Contains daily/periodic execution counts by use case.
- Expected columns are detected dynamically, but you can pin them via env vars (see below).
- Typical columns:
  - use case name (e.g., `use_case_name`)
  - date/timestamp (e.g., `date`, `reported_at`)
  - counts: `success`, `failure`, `invalid`/`skip`, `partial`

2) `usecase_savings_ref`
- Contains savings configuration per use case.
- Typical columns:
  - `use_case_name` (text)
  - `savings_type` (text) — e.g., "Fixed", "Variable", etc.
  - `fixed_savings_per_run` (numeric, minutes)
  - `savings_per_run` (numeric, minutes for successful runs)
  - `partial_savings_per_run` (numeric, minutes for partial runs)
  - Optional: stakeholder/owner, short description, HLD/Confluence link (names are mapped dynamically)

The data layer auto-detects column names where possible and exposes env overrides for full control.

Legacy/optional tables
- `automation_use_cases` and `automation_runs` are optional. The UI no longer requires them; any remaining references are guarded and will not crash if these tables are absent.

## Environment variables
Core DB connection: see Quick start.

Reporting table & columns (optional overrides)
- `REPORTING_TABLE` (default: `reporting`)
- `REPORTING_NAME_COLUMN` (e.g., `use_case_name`)
- `REPORTING_DATE_COLUMN` (e.g., `date`, `reported_at`)
- `REPORTING_SUCCESS_COLUMN`, `REPORTING_FAILURE_COLUMN`, `REPORTING_INVALID_COLUMN`, `REPORTING_PARTIAL_COLUMN`

Use case reference preference (optional)
- `USECASE_TABLE=usecase_savings_ref` to prefer the savings reference table for listing live use cases.

Fixed savings period (new)
- `FIXED_SAVINGS_PERIOD` controls how fixed-type savings are applied over time. Supported values (case-insensitive, synonyms allowed):
  - `per_day` (also: `day`, `daily`)
  - `per_week` (also: `week`, `weekly`) — default
  - `per_month` (also: `month`, `monthly`)
  - `per_range` (also: `range`, `total`) — count fixed once per selected date range

Assumption: savings values are stored in minutes. The UI converts to hours for display. If your data is already in hours, you can adjust the conversion in the UI or data layer.

## Troubleshooting

- Error: Cannot find module `./cjs/react-dom-server-legacy.browser.development.js` (require stack includes `react-dom/server.browser.js`)
  - Cause: Node 23+ + corrupted install can trip Next.js 14’s react-dom resolution.
  - Fix:
    1) Use Node 20 (see `.nvmrc`).
    2) Clean reinstall: `rm -rf node_modules .next && npm ci && npm run dev`.

- Error: Cannot find module `postcss-value-parser/lib/index.js`
  - Fix: `rm -rf node_modules .next && npm ci && npm run dev`.

- Port 3000 in use
  - The dev server automatically tries 3001. Or stop the existing process using 3000.

- Database not configured
  - The app will render with empty data instead of throwing. Set `DATABASE_URL` or `PG*` env vars to enable real data.

## API
### Reporting aggregates
`GET /api/reporting/aggregates`

Query params:
- `from` (ISO string or yyyy-mm-dd)
- `to` (ISO string or yyyy-mm-dd) — inclusive (implemented as `< to+1d`)
- `search` (string)
- `name` (repeatable) — filters by exact use case names
- `fixedPeriod` — one of `per_day|per_week|per_month|per_range` (optional; defaults to weekly)

Response shape (per use case):
```jsonc
{
  "useCaseName": "GCA",
  "success": 100,
  "failure": 2,
  "invalid": 1,
  "partial": 3,
  "executions": 106,
  "minutes": {
    "fixedTotal": 6000,
    "variableSuccessTotal": 1200,
    "variablePartialTotal": 90,
    "total": 7290
  }
}
```

Fixed savings semantics:
- If `savings_type` indicates a fixed model (e.g., contains "fix"), `fixedTotal` is calculated as `fixed × number_of_periods_in_range`.
- Periods are computed from the selected date range; for example, per week uses `ceil(weeks_spanned)`.
- Non-fixed components remain per-execution.

### Use case overview
`GET /api/use-cases/overview?name=<Use+Case+Name>&from=...&to=...`
- Returns mapped overview fields (stakeholder, description, HLD link when present), reporting aggregates for the single use case, and the savings row.

npm run build
npm start
```

## Branding (Tesco theme)

This dashboard is styled with a Tesco-inspired palette. To show the logo in the header, add the provided logo file to the public folder:

1. Save your Tesco logo as `public/tesco-logo.png` (recommended transparent PNG, ~110×28 for the header).
2. The header automatically renders `/tesco-logo.png` next to the title.

You can adjust brand colors in `tailwind.config.ts` under `theme.extend.colors.brand` (Tesco blue) and `colors.tescoRed` (Tesco red).

## Expected DB schema
You can adapt to your own schema. The queries assume:

```sql
CREATE TABLE automation_use_cases (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE automation_runs (
  id text PRIMARY KEY,
  use_case_id text NOT NULL REFERENCES automation_use_cases(id),
  status text NOT NULL CHECK (status IN ('PASS','FAIL','SKIP','RUNNING')),
  duration_seconds integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);
```

Update `src/lib/data.ts` if your schema differs.

## Project structure
- `src/app` – app routes (App Router)
- `src/components` – UI components
- `src/lib` – data layer (db and queries)

## Security
This is an internal tool. Do not expose your database to the public internet without proper network controls and auth.

## License
Internal use only.