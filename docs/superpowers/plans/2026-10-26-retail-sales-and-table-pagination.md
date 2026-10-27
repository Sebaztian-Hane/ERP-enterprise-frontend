# Ventas minoristas y paginación operacional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict retail tenants to POS for sale creation while retaining sales history actions, and paginate all operational record tables with server-side metadata.

**Architecture:** Add a narrow backend dependency that denies only administrative `POST /sales` for a retail tenant; keep `sales:read` and POS routes unaffected. Extend the existing pagination contract and `TablePagination` component across record-list endpoints and their React pages, prioritizing transaction and inventory registers before small configuration/reference lists.

**Tech Stack:** FastAPI, SQLAlchemy, React, TypeScript, Vitest, pytest.

**Spec:** `docs/superpowers/specs/2026-10-26-retail-sales-and-table-pagination-design.md`

## Global Constraints

- Retail creates sales only through POS; Sales retains post-sale actions.
- Wholesale blocks POS; hybrid supports both channels.
- Pagination is server-side with `{ collection, meta }`.
- All queries remain tenant scoped.

## Review Focus

- Direct `POST /sales` for retail must return 403 while `GET /sales` remains available.
- The retail frontend must not render the New sale button or form trigger.
- Pagination must retain rows after a post/create/status action by reloading the active page or intentionally resetting to page 1.
- Reference pickers must not accidentally consume paginated response objects where they require complete small catalogs.
- Tables used as fixed-size summaries/reports must not receive meaningless pagination controls.

---

### Task 1: Enforce the retail sales channel

**Files:**
- Modify: `app/security/auth.py`
- Modify: `app/api/routes/sales.py`
- Modify: `tests/test_pos_fiscal_rules.py` or create `tests/test_retail_sales_channel.py`
- Modify: `src/components/SalesPage.tsx`

- [ ] Write failing backend tests for retail rejection of administrative sale creation and allowed sale listing/POS dependency semantics.
- [ ] Add `require_administrative_sales_write` (or equivalent) and apply it solely to `POST /sales`.
- [ ] Add a failing frontend-render test or browser check proving retail does not expose New sale.
- [ ] Read the active tenant profile in `SalesAdministration` and render history/post-sale actions without the creation entry point for retail.
- [ ] Run focused backend/frontend tests and production build.

### Task 2: Paginate workflow and inventory registers

**Files:**
- Modify: `app/api/routes/workflow.py`, `app/api/routes/inventory.py`, `app/api/routes/operations.py`
- Modify: `src/components/QuotesPage.tsx`, `src/components/SalesOrdersPage.tsx`, `src/components/PurchaseOrdersPage.tsx`, `src/components/InventoryCountsPage.tsx`, `src/components/InventoryPage.tsx`, `src/components/WarehousesPage.tsx`
- Test: relevant backend route tests and frontend page/browser checks.

- [ ] Add `page` / `page_size` query parameters and `paginate` calls to transaction and inventory register endpoints.
- [ ] Convert each corresponding React list to `fetchPage`, `PageMeta`, and `TablePagination`.
- [ ] Ensure status/create actions reload the correct page and table counts use `meta.total`.
- [ ] Run focused tests and production build.

### Task 3: Paginate financial, administration, and configuration record tables where APIs represent open-ended collections

**Files:**
- Modify: affected routes in `accounts.py`, `operations.py`, `treasury.py`, `tenants.py`, `platform.py`
- Modify: `src/components/AccountsPage.tsx`, `src/components/FinancePage.tsx`, `src/components/AdministrationPage.tsx`, `src/components/ConfigurationPage.tsx`, `src/components/ProviderPortal.tsx`

- [ ] Classify each table as an open-ended register or bounded summary; only paginate registers.
- [ ] Migrate open-ended API/list pairs to the shared contract.
- [ ] Preserve smaller master/picker data sources where a complete in-memory list is intentional.
- [ ] Run focused tests, build, and browser review of one pagination control per module group.

## Self-review

- Task 1 supplies the security boundary and the requested retail UI behavior.
- Tasks 2–3 use the existing API metadata contract, avoiding client-only paging.
- Dashboard and report preview tables remain bounded summaries rather than misleading paginated registers.
