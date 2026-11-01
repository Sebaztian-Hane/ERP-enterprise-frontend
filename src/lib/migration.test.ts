import { describe, expect, it } from "vitest";
import { csvCell, errorReport } from "./migration";

describe("migration reports", () => {
  it("quotes line breaks and prevents CSV formulas from executing", () => {
    expect(csvCell('Texto, con "comillas"\r\nsiguiente')).toBe('"Texto, con ""comillas""\r\nsiguiente"');
    expect(csvCell(" =1+1")).toBe("' =1+1");
    expect(csvCell("000123")).toBe("000123");
  });

  it("downloads all incidents with their original source row", async () => {
    const report = errorReport({ valid_rows: 1, can_commit: false, sample: [], errors: [{ row: 7, message: "Cantidad inválida" }], conflicts: ["SKU ya existe: A"] });
    const text = await report.text();
    expect(text).toContain("7,validación,Cantidad inválida");
    expect(text).toContain(",conflicto o referencia,SKU ya existe: A");
  });
});
