# AGENTS.md

Thai-language repair-management web app for บริษัท หาดใหญ่ซาวด์สตาร์ จำกัด (สำนักงานใหญ่): washing-machine work orders, parts issued per work order, parts stock, reports, settings. No login screen by requirement.

**Continue from [PLAN.md](PLAN.md).** Milestone 1 (all UI screens on demo data) is done. Next: Milestone 2 (Supabase schema/migrations). The user explicitly chose **Supabase** as the database — use it, not another store.

## Stack
TanStack Start (React 19, TS strict), Vite 8, Tailwind 4 (theme vars in `src/styles.css`), shadcn/ui in `src/components/ui`, sonner toasts, lucide icons. Deployed on Netlify via `@netlify/vite-plugin-tanstack-start`.

## Layout
- `src/routes/__root.tsx` — HTML shell (lang=th, Sarabun font), wraps pages in `StoreProvider` + `AppShell`.
- `src/components/app-shell.tsx` — dark-red header with company name, desktop top nav, mobile bottom nav, footer.
- `src/components/shared.tsx` — StatusBadge, CompanyDocHeader (letterhead for all printed docs), NativeSelect, Field, ConfirmDialog, StatCard, PreviewNotice.
- `src/components/job-form.tsx` — create/edit work order form.
- `src/routes/index.tsx` (work order list), `jobs.new.tsx`, `jobs.$jobId.tsx` (detail, part issue/cancel, totals, A4 print), `stock.tsx`, `reports.tsx`, `settings.tsx`.
- `src/lib/company.ts` — the single official company record. Never alter name/address/tax ID/phones.
- `src/lib/format.ts` — THB/Thai date formatting, status labels/tones, `jobTotals()` cost math, restock suggestion.
- `src/lib/store.tsx` — in-memory data layer. Action names mirror the planned Supabase RPCs; swap internals for API calls, keep the interface.
- `src/data/fixtures.ts` — demo data; only `store.tsx` may import it. Delete when the DB is wired. `PreviewNotice` banners must be removed at the same time.

## Rules / decisions
- All UI text is Thai. Mobile-first; inputs are 16px on mobile to stop iOS zoom; tap targets ≥ 40px.
- Wide tables: cards on mobile, tables from `md:`; report tables scroll inside `overflow-x-auto`.
- Print: `.no-print` / `.print-only` helpers and `@page A4` in `styles.css`; the cost/profit box is screen-only.
- Stock is only changed by movements (issue, return, in, out, adjust, void). Part edits never change `qtyOnHand`. Cancelling is a reversal record, never a delete.
- Job parts snapshot unit cost/price at issue time.
- Every submit button disables while saving (double-submit guard); the backend will also use a `request_id` idempotency key.
- Supabase service-role key must only live in Netlify Functions env vars, never in client code. RLS on, no anon policies.
- If an existing Supabase database is found: back it up first, migrate additively, never drop data.
