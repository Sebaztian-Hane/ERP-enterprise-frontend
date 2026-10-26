# XLSX Import Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators download every migration template as a valid XLSX workbook as well as CSV.

**Architecture:** Add a small browser-only workbook builder that turns a template's headers and example row into a minimal XLSX ZIP using the existing `fflate` dependency. `DataMigrationPanel` will expose a CSV and XLSX download action that both read from the same in-memory template definition.

**Tech Stack:** React, TypeScript, Vite, `fflate`, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-10-26-xlsx-import-template-design.md`

## Global Constraints

- Keep the existing CSV download intact.
- XLSX must contain one sheet, exactly the current headers, and exactly one example row.
- Do not change API contracts, authorization, preview, or import persistence.
- Do not add a dependency; use the existing browser bundle dependency `fflate`.

## Review Focus

- Values containing `&`, `<`, `>` or quotes must remain valid XML and display as literal cell values; test this in the workbook helper.
- A module with a different number of fields must produce matching header and example-cell counts; test this in the workbook helper.
- The generated archive must contain the mandatory XLSX package parts and `xl/worksheets/sheet1.xml`; test this in the workbook helper.
- The XLSX button must use the selected module's headers rather than a hard-coded schema; cover it in browser verification.
- A browser with downloads disabled must leave the panel usable and show no state corruption; cover it in manual browser verification.

---

### Task 1: Generate a minimal XLSX migration workbook

**Files:**
- Create: `src/lib/importTemplateWorkbook.ts`
- Create: `src/lib/importTemplateWorkbook.test.ts`

**Interfaces:**
- Produces: `buildImportTemplateWorkbook(columns: string[], example: string[]): Blob`
- Consumes: `fflate.zipSync` to create a browser-compatible `.xlsx` archive.

- [x] **Step 1: Write the failing tests**

Assert that `buildImportTemplateWorkbook(["sku", "name"], ["SKU-001", "A & B"])` returns an XLSX Blob whose ZIP contains `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, and `xl/worksheets/sheet1.xml`; assert the worksheet has two rows and XML-escaped values.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/lib/importTemplateWorkbook.test.ts`
Expected: FAIL because the workbook helper and test command do not yet exist.

- [x] **Step 3: Implement `buildImportTemplateWorkbook(columns: string[], example: string[]): Blob`**

Use inline-string cells, XML escaping, and the five required package entries. Reject a template whose header and example lengths differ with an explicit error.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/lib/importTemplateWorkbook.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/importTemplateWorkbook.ts src/lib/importTemplateWorkbook.test.ts package.json package-lock.json
git commit -m "feat: generate xlsx import templates"
```

### Task 2: Expose the XLSX download in the migration panel

**Files:**
- Modify: `src/components/DataMigrationPanel.tsx`
- Test: `src/lib/importTemplateWorkbook.test.ts`

**Interfaces:**
- Consumes: `buildImportTemplateWorkbook(columns, example): Blob` from Task 1.
- Produces: a CSV and XLSX download action for every supported module.

- [x] **Step 1: Extend the test with a module-length case**

Use the inventory template's seven headers and seven examples; assert the generated sheet has exactly seven first-row cells and seven second-row cells.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/lib/importTemplateWorkbook.test.ts`
Expected: FAIL until the helper accurately represents all supplied cells.

- [x] **Step 3: Add `downloadXlsxTemplate()` to `DataMigrationPanel`**

Create a Blob URL from `buildImportTemplateWorkbook(template.columns, template.example)`, download it as `plantilla-${module}.xlsx`, and revoke the URL after the click. Place a clearly labeled XLSX action beside the existing CSV action.

- [x] **Step 4: Verify the focused test and production build**

Run: `npm test -- src/lib/importTemplateWorkbook.test.ts && npm run build`
Expected: PASS and a completed Vite build.

- [x] **Step 5: Verify in the browser**

Open a migration panel as owner/admin, download the Productos and Inventario XLSX templates, inspect the archive contents locally, and ensure the panel remains usable after each download.

- [x] **Step 6: Commit**

```bash
git add src/components/DataMigrationPanel.tsx src/lib/importTemplateWorkbook.test.ts
git commit -m "feat: add xlsx template download"
```

## Self-review

- Spec coverage: Task 1 creates a one-sheet XLSX with the exact template content; Task 2 keeps CSV and exposes XLSX without touching API behavior.
- Type consistency: the panel consumes the `Blob` produced by the helper with the two template arrays defined locally.
- Review-focus coverage: XML characters and package integrity are in Task 1; differing field counts in Task 2's test; module selection and failed download resilience are browser checks.
- Proportion: two small, independently verifiable tasks; no import-path or backend changes are introduced.
