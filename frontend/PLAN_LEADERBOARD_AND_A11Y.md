# Plan: Leaderboard 2.0 + Responsive & Accessibility

**Status: Completed.** All phases implemented. Additional work: modernized design (Plus Jakarta Sans, slate palette, card shadows), contribute-dataset section on landing, `publicUrl()` for subpath deployment, empty-state handling and hooks-order fix on leaderboard.

---

Two initiatives: (1) make the leaderboard a real benchmark hub with filters, task views, chart, and dataset links; (2) make the app responsive and accessible. Either can be done first; this doc assumes Leaderboard 2.0 first, then Responsive + A11y.

---

## Phase A: Leaderboard 2.0

**Goal:** Turn the leaderboard into a usable benchmark hub: filter by task/dataset, split by task type, optional chart, link every row to its dataset.

### A.1 Filters and task-based view

- **Task filter:** Filter rows by `task` (segmentation / detection). Use chips or a small tab set: "All" | "Segmentation" | "Detection". Persist in URL: `?task=segmentation` (single value).
- **Dataset search:** Optional text input to filter by dataset name (client-side, over current filtered set). Can be URL-synced as `?dataset=apple`.
- **Apply to table:** Feed filtered list into TanStack Table so sorting and display use the filtered subset. Show count: e.g. "Showing 12 of 83 entries."

**Files:** [src/pages/Leaderboard.tsx](src/pages/Leaderboard.tsx). Add `useSearchParams` for task (and optional dataset query), derive `filteredRows` from `data` before passing to `useReactTable`.

### A.2 Dataset links

- **Dataset column:** Render dataset name as a `Link` to `/datasets/:name` (same as in dataset browser). Use the row’s `dataset` field.
- **Optional:** Add a small "View dataset" link or icon in the row (same target).

**Files:** [src/pages/Leaderboard.tsx](src/pages/Leaderboard.tsx). Update the column definition for `dataset` to use `<Link to={\`/datasets/${row.original.dataset}\`}>...</Link>`.

### A.3 Chart view (optional toggle)

- **Toggle:** "Table" | "Chart" (or "View: Table / Chart") above the table. Default Table.
- **Chart:** Bar chart of current filtered (and optionally sorted) rows: x = dataset name (truncate if many), y = metric value. One series; color by task if "All" tasks. Use a small library (e.g. Recharts or Chart.js) or CSS-only bars. Limit to top N (e.g. 20) if many rows to keep it readable.
- **Data source:** Same `filteredRows` as the table; no new API.

**Files:** New optional dependency (e.g. `recharts`). [src/pages/Leaderboard.tsx](src/pages/Leaderboard.tsx) or a small [src/components/LeaderboardChart.tsx](src/components/LeaderboardChart.tsx). Reuse existing `LeaderboardRow` type.

### A.4 Secondary metrics (detector rows)

- **LeaderboardRow** already has optional `mAP50`, `precision`, `recall` (from [generate-leaderboard.js](scripts/generate-leaderboard.js)).
- **Table:** Add optional columns for mAP50, Precision, Recall when present (e.g. show "—" for model_benchmarks rows). Or show in a single "Details" expandable cell / tooltip per row.
- **Prefer:** One extra column "mAP50" (for detector rows) and keep precision/recall in a tooltip or expandable section to avoid clutter.

**Files:** [src/pages/Leaderboard.tsx](src/pages/Leaderboard.tsx), [src/data/types.ts](src/data/types.ts) (already has optional fields). [scripts/generate-leaderboard.js](scripts/generate-leaderboard.js) already emits them; no change if payload is already there.

---

## Phase B: Responsive + Accessibility

**Goal:** App works on small viewports and is usable with keyboard and screen readers. One coherent pass across browser, leaderboard, and layout.

### B.1 Layout and breakpoints

- **Container:** Keep `max-w-6xl`; ensure horizontal scroll on tiny screens only when necessary (e.g. wide table).
- **Dataset browser:**
  - Filter row: On small screens (e.g. `< 640px`), stack search + Ag task + Platform vertically; full-width inputs and dropdowns.
  - Task/Data chips: Wrap as now; ensure min touch target (~44px) for chip buttons.
  - Card grid: Already responsive (sm:2, lg:3); ensure single column below sm with consistent gap.
- **Leaderboard:** Table scrolls horizontally on small screens (already in place); consider sticky first column (dataset name) if table is wide.
- **Header:** On small screens, reduce padding; nav links can stay inline if they fit, or collapse into a hamburger menu with a slide-out/dropdown (optional for minimal scope).

**Files:** [src/pages/DatasetBrowser.tsx](src/pages/DatasetBrowser.tsx), [src/pages/Leaderboard.tsx](src/pages/Leaderboard.tsx), [src/components/Header.tsx](src/components/Header.tsx), [tailwind.config.js](tailwind.config.js) (if custom breakpoints needed). Use Tailwind `sm:`, `md:` classes.

### B.2 Skip link and landmarks

- **Skip link:** Add "Skip to main content" as first focusable element; target `id="main-content"` on `<main>`. Visible on focus only (e.g. absolute, left top, focus:visible).
- **Landmarks:** Ensure `<main id="main-content">`, one `<nav>` for header nav, and (if present) a `<nav aria-label="Breadcrumb">` or similar where useful. Leaderboard table in a `<section aria-label="Benchmark table">` or the page has a single `<h1>` and the table is the main content.

**Files:** [src/App.tsx](src/App.tsx) (skip link + main id), [src/index.css](src/index.css) or component for skip-link styles.

### B.3 Multi-select dropdown (MultiSelectDropdown)

- **Focus:** Trigger button is focusable; `aria-expanded`, `aria-haspopup="listbox"` (or `true`). When open, focus moves to first option or first checked option; arrow keys move focus between options; Enter toggles; Escape closes and returns focus to trigger.
- **List:** Options container has `role="listbox"`, each option `role="option"` and `aria-selected`. Or use `role="menu"` / `role="menuitemcheckbox"` and follow menu pattern. Prefer listbox for multi-select.
- **Click outside:** Keep current behavior; ensure focus is not lost when closing (return to trigger).
- **Labels:** Trigger has an associated visible label (already "Ag task" / "Platform"); ensure `id` / `aria-labelledby` or `aria-label` if needed.

**Files:** [src/pages/DatasetBrowser.tsx](src/pages/DatasetBrowser.tsx) — [MultiSelectDropdown] section. Refactor into [src/components/MultiSelectDropdown.tsx](src/components/MultiSelectDropdown.tsx) so it can be reused and tested; add keyboard handlers and ARIA attributes.

### B.4 Table accessibility (Leaderboard)

- **Semantics:** `<table>` with `<thead>` and `<tbody>`. Use `<th scope="col">` for column headers. Add `scope="row"` for a row header column if you introduce one (e.g. dataset as row header).
- **Sortable columns:** Add `aria-sort="ascending"` / `"descending"` / `"none"` on the sorted column’s `<th>`. Keep button for sort; ensure button has an accessible name (e.g. "Sort by Value").
- **Screen reader summary:** Optional `<caption>` or `aria-describedby` with a short summary (e.g. "Benchmark results; sortable by column").

**Files:** [src/pages/Leaderboard.tsx](src/pages/Leaderboard.tsx).

### B.5 Focus and touch

- **Focus visibility:** Ensure all interactive elements (links, buttons, inputs, dropdown triggers) have a visible focus ring (Tailwind `focus:ring-2 focus:ring-accent/20` or similar). No `outline: none` without a ring.
- **Touch targets:** Buttons and chip buttons at least ~44px tap area (padding or min-height). MultiSelectDropdown trigger and option rows already sized; verify on device or DevTools.

**Files:** Global in [src/index.css](src/index.css) or per-component; [src/pages/DatasetBrowser.tsx](src/pages/DatasetBrowser.tsx) (chips, dropdown).

---

## Implementation order

| Step | Item | Notes |
|------|------|--------|
| 1 | A.1 Task filter + dataset search | URL params, filtered rows into table |
| 2 | A.2 Dataset links in table | Link dataset name to `/datasets/:name` |
| 3 | A.4 Secondary metrics (mAP50 column / tooltip) | Optional column or tooltip |
| 4 | A.3 Chart view | Add dependency; Table/Chart toggle; top-N bar chart |
| 5 | B.1 Responsive layout | Breakpoints for browser, leaderboard, header |
| 6 | B.2 Skip link + main id | App.tsx, one CSS rule |
| 7 | B.3 MultiSelectDropdown a11y | Extract component; keyboard + ARIA |
| 8 | B.4 Table a11y | aria-sort, scope, caption/describedby |
| 9 | B.5 Focus and touch | Audit and add rings / tap targets |

Steps 1–4 are Leaderboard 2.0; 5–9 are Responsive + A11y. You can swap phases (do B before A) if you prefer to shore up responsive and a11y first.

---

## File touch summary

| File | Phase A | Phase B |
|------|---------|---------|
| src/pages/Leaderboard.tsx | A.1, A.2, A.3, A.4 | B.1, B.4 |
| src/pages/DatasetBrowser.tsx | — | B.1, B.3, B.5 |
| src/components/Header.tsx | — | B.1 |
| src/components/MultiSelectDropdown.tsx | — | B.3 (extract) |
| src/components/LeaderboardChart.tsx | A.3 (optional) | — |
| src/App.tsx | — | B.2 |
| src/index.css | — | B.2, B.5 |
| src/data/types.ts | A.4 (if needed) | — |
| package.json | A.3 (chart lib) | — |

---

## Out of scope (for later)

- Server-side API or new backend.
- Dataset comparison (side-by-side) or "similar datasets."
- Favorites / saved filters (localStorage).
- Dark mode.
- Full hamburger nav with overlay (optional; can stay inline nav on small if it fits).
