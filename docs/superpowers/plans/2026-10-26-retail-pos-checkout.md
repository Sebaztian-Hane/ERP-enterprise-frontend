# Retail POS Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `#pos` into a retail checkout experience with a product catalog, cart and persistent split payments, while preserving the wholesale Sales workflow.

**Architecture:** Keep the existing sale, receivable, payment, inventory and accounting domain records as the single source of truth. Add tenant-scoped POS payment-method configuration and an atomic `POST /sales/pos-checkout` operation that creates a sale, receivable and receipt allocations in one idempotent transaction. Replace the current POS branch of `SalesPage` with focused catalog/cart/checkout components; leave the administrative Sales branch intact.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL/Supabase migrations, React, TypeScript, Vite, Lucide, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-10-26-pos-retail-design.md`

## Global Constraints

- Preserve `tenant_id` as the data-isolation boundary on every new record/query.
- Enforce `retail`/`hybrid` eligibility in the API, not only in the frontend menu.
- Persist every tender as an existing `payments` receipt with allocation; never serialize tender data into `sales`.
- Support only `cash`, `visa`, `mastercard`, `yape` and `plin` in this delivery.
- Require idempotency for checkout and reject tenders that do not total the sale.
- POS must always create a non-fiscal internal ticket; it is not a guía de remisión.
- POS administrative sales require DNI/RUC; POS consumer-final boletas follow the S/5 and S/700 thresholds in the approved spec.
- Factura requires an 11-digit RUC; never enable it from DNI alone.
- Reuse the asynchronous CPE workflow; anonymous boletas must omit buyer identification rather than use a fabricated document.
- Use actual catalog data; do not add generated product imagery.

## Review Focus

- Concurrent/repeated checkout submits must create one sale and one set of payments only — Task 2 API regression test.
- A tenant must not configure or use another tenant’s cash account — Task 1 and 2 tenant-isolation tests.
- Partial/split tender totals, including cent rounding, must not overpay a receivable — Task 2 validation tests.
- Retail/wholesale profile changes must deny the inappropriate channel at API and UI layers — Task 2 and 4 tests.
- Drag interactions and mobile layout must not be required to add an item or obscure the checkout action — Task 4 browser checks.
- An anonymous POS transaction must never fabricate a DNI, and a boleta over S/700 or a factura without RUC must be refused — Task 2 and 5 tests.

---

### Task 1: Tenant POS payment method configuration

**Files:**
- Create: `ERP ENTERPRISECLOUD BACKEND/alembic/versions/0061_pos_payment_methods.sql`
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/models/entities.py`
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/schemas/payments.py`
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/api/routes/payments.py`
- Test: `ERP ENTERPRISECLOUD BACKEND/tests/test_pos_payment_methods.py`

**Interfaces:**
- Produces `PosPaymentMethodConfig(tenant_id, method, cash_account_id, is_active)` and tenant-scoped `GET/PUT /payments/pos-methods`.
- Consumed by `POST /sales/pos-checkout` in Task 2.

- [ ] **Step 1: Write failing configuration and isolation tests**

```python
def test_pos_method_configuration_rejects_another_tenant_cash_account():
    response = client.put("/api/v1/payments/pos-methods", json={...})
    assert response.status_code == 404
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pytest tests/test_pos_payment_methods.py -q`
Expected: FAIL because the API/configuration does not exist.

- [ ] **Step 3: Add the migration, model, schemas and protected configuration endpoints**

Use a unique `(tenant_id, method)` configuration; validate `cash_account_id` belongs to the active tenant and permit only the five specified methods.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pytest tests/test_pos_payment_methods.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add alembic/versions/0061_pos_payment_methods.sql app/models/entities.py app/schemas/payments.py app/api/routes/payments.py tests/test_pos_payment_methods.py
git commit -m "feat: configure POS payment methods per tenant"
```

### Task 2: Atomic POS checkout

**Files:**
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/schemas/transactions.py`
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/api/routes/sales.py`
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/services/apisunat.py`
- Create: `ERP ENTERPRISECLOUD BACKEND/tests/test_pos_checkout.py`

**Interfaces:**
- Consumes `PosPaymentMethodConfig` from Task 1.
- Produces `POST /sales/pos-checkout` accepting `warehouse_id`, POS customer/comprobante selection, lines and `tenders[{method, amount, reference?}]`.
- Returns the sale, internal ticket metadata, posted receipt identifiers and CPE reservation metadata where requested/applicable.

- [ ] **Step 1: Write failing checkout tests**

```python
def test_pos_checkout_creates_sale_and_split_receipts_atomically():
    response = client.post("/api/v1/sales/pos-checkout", json={...})
    assert response.status_code == 201
    assert response.json()["balance_amount"] == "0.00"

def test_pos_checkout_rejects_unbalanced_or_unconfigured_tenders():
    assert response.status_code == 422

def test_pos_checkout_enforces_anonymous_boleta_and_factura_rules():
    assert anonymous_over_700.status_code == 422
    assert factura_with_dni.status_code == 422
    assert anonymous_boleta_under_700.status_code == 201
```

- [ ] **Step 2: Run checkout tests to verify they fail**

Run: `pytest tests/test_pos_checkout.py -q`
Expected: FAIL because the checkout endpoint does not exist.

- [ ] **Step 3: Implement an idempotent, profile-gated checkout transaction**

Create/resolve a tenant-scoped `Consumidor final` only for POS, create the sale/receivable using the current sales invariants, create one `Payment` and `PaymentAllocation` per tender, persist ticket metadata, and commit only after all validations succeed. Reserve a CPE through the existing asynchronous flow only when the selected fiscal document is valid.

- [ ] **Step 4: Run checkout tests to verify they pass**

Run: `pytest tests/test_pos_checkout.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/schemas/transactions.py app/api/routes/sales.py tests/test_pos_checkout.py
git commit -m "feat: add atomic POS checkout"
```

### Task 3: POS frontend data and checkout client

**Files:**
- Create: `ERP ENTERPRISECLOUD FRONTEND/src/components/pos/types.ts`
- Create: `ERP ENTERPRISECLOUD FRONTEND/src/components/pos/PosCheckout.tsx`
- Modify: `ERP ENTERPRISECLOUD FRONTEND/src/components/SalesPage.tsx`
- Modify: `ERP ENTERPRISECLOUD FRONTEND/src/lib/api.ts` only if typed request support is missing

**Interfaces:**
- Consumes `GET /products`, customers, warehouses, `GET /payments/pos-methods` and Task 2 checkout response.
- Produces `PosCheckout` rendered only when `SalesPage` receives `mode="pos"`.

- [ ] **Step 1: Write the failing component/client test or browser reproduction**

Verify that a product can be added by click, the cart total updates, and checkout stays disabled until configured tender total equals the cart total.

- [ ] **Step 2: Run it to verify failure against the old POS**

Run: the focused frontend test command if configured; otherwise the recorded Playwright flow against the pre-change build.
Expected: FAIL because the POS does not expose catalog/cart/tenders.

- [ ] **Step 3: Implement the focused POS composition**

Keep `SalesPage` for administrative sales; render a dedicated POS component for `mode="pos"` with search, click/drag catalog cards, keyboard-safe cart controls and accessible tender controls.

- [ ] **Step 4: Run build and focused interaction check**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pos src/components/SalesPage.tsx src/lib/api.ts
git commit -m "feat: add retail POS catalog and cart"
```

### Task 4: Payment UI, profile visibility and responsive QA

**Files:**
- Modify: `ERP ENTERPRISECLOUD FRONTEND/src/components/pos/PosCheckout.tsx`
- Modify: `ERP ENTERPRISECLOUD FRONTEND/src/styles.css`
- Modify: `ERP ENTERPRISECLOUD FRONTEND/docs/qa/QA_RESULTS.md`

**Interfaces:**
- Consumes POS checkout APIs from Tasks 1–3 and existing `business_profile` rules in `App.tsx`/backend authorization.
- Produces production-validated desktop and mobile POS behavior.

- [ ] **Step 1: Write the failing validation scenario**

Use Playwright to attempt checkout with a tender shortfall and assert the UI blocks submission with a clear total mismatch.

- [ ] **Step 2: Run it to verify failure before the payment panel implementation**

Expected: the old POS has no tender state or checkout validation.

- [ ] **Step 3: Implement tender selection, split-payment editing and responsive styles**

Show cash change only when applicable; retain card/wallet references; offer *Consumidor final*, customer search and DNI/RUC lookup; select ticket, boleta or factura based on valid fiscal rules. Use drag-and-drop as an enhancement while click remains the reliable primary control.

- [ ] **Step 4: Validate the deployed frontend with real development data**

Check desktop and mobile: page identity, catalog search, click + drag add, quantity changes, tender validation, successful configured checkout, no new console/network errors, and isolation/profile denial where available.

- [ ] **Step 5: Commit**

```bash
git add src/components/pos/PosCheckout.tsx src/styles.css docs/qa/QA_RESULTS.md
git commit -m "feat: complete POS payment experience"
```

### Task 5: POS fiscal/ticket regression and administrative sales identity rule

**Files:**
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/api/routes/sales.py`
- Modify: `ERP ENTERPRISECLOUD BACKEND/app/services/apisunat.py`
- Modify: `ERP ENTERPRISECLOUD FRONTEND/src/components/SalesPage.tsx`
- Test: `ERP ENTERPRISECLOUD BACKEND/tests/test_pos_fiscal_rules.py`

**Interfaces:**
- Consumes checkout/ticket data from Task 2.
- Produces anonymous-boleta UBL payloads and validation of administrative sales identity.

- [ ] **Step 1: Write failing fiscal rule tests**

```python
def test_anonymous_boleta_payload_omits_customer_identification():
    assert "cac:AccountingCustomerParty" not in body

def test_administrative_sale_requires_identified_customer():
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest tests/test_pos_fiscal_rules.py -q`
Expected: FAIL because the current builder requires a tax ID for every CPE and the administrative endpoint allows an unidentified customer record.

- [ ] **Step 3: Implement anonymous boleta UBL and channel-specific validation**

Do not alter invoice validation. Preserve the existing CPE evidence/outbox flow and make the anonymous branch available only to POS boletas within the stated threshold.

- [ ] **Step 4: Run fiscal tests and the full backend suite**

Run: `pytest tests/test_pos_fiscal_rules.py -q && pytest -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/routes/sales.py app/services/apisunat.py src/components/SalesPage.tsx tests/test_pos_fiscal_rules.py
git commit -m "feat: enforce POS fiscal customer rules"
```

## Self-review

- Spec coverage: Tasks 1–2 implement persistence, payments, isolation, ticketing and API gating; Tasks 3–4 implement catalog/cart, payment interaction, business-profile visibility and responsive validation; Task 5 implements the POS/customer fiscal split. Hardware integrations remain excluded by spec.
- Shared interfaces: Task 1 produces payment configuration consumed by Task 2; Task 2 produces the checkout contract consumed by Task 3; Task 3 provides the POS surface exercised by Task 4.
- Review-focus coverage: each stated risk is assigned to Tasks 1, 2 or 4.
- Ruling: checkout will create separate receipt records rather than a new tender JSON table, because the existing financial model already supplies reconciliation, allocation and accounting semantics. Cost if wrong: payment-detail reporting could need a purpose-built read model later, but financial correctness remains intact.
