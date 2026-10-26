import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { buildImportTemplateWorkbook } from "./importTemplateWorkbook";

describe("buildImportTemplateWorkbook", () => {
  it("creates a valid single-sheet workbook and escapes XML values", async () => {
    const workbook = buildImportTemplateWorkbook(["sku", "name"], ["SKU-001", "A & B <C> \"D\""]);
    const files = unzipSync(new Uint8Array(await workbook.arrayBuffer()));

    expect(Object.keys(files)).toEqual(expect.arrayContaining([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
    ]));

    const worksheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(worksheet).toContain('<row r="1">');
    expect(worksheet).toContain('<row r="2">');
    expect(worksheet).toContain("A &amp; B &lt;C&gt; &quot;D&quot;");
  });

  it("preserves every inventory template column", async () => {
    const columns = ["number", "sku", "warehouse_code", "quantity", "reason", "reference", "note"];
    const workbook = buildImportTemplateWorkbook(columns, ["AJ-001", "SKU-001", "ALM-001", "25", "Carga inicial", "MIG-001", "Existencia inicial"]);
    const files = unzipSync(new Uint8Array(await workbook.arrayBuffer()));
    const worksheet = strFromU8(files["xl/worksheets/sheet1.xml"]);

    expect((worksheet.match(/<c r="[A-Z]+1"/g) ?? [])).toHaveLength(7);
    expect((worksheet.match(/<c r="[A-Z]+2"/g) ?? [])).toHaveLength(7);
  });

  it("rejects a header and example with different cell counts", () => {
    expect(() => buildImportTemplateWorkbook(["sku"], ["SKU-001", "Producto"])).toThrow(
      "La plantilla debe tener el mismo número de encabezados y valores de ejemplo.",
    );
  });
});
