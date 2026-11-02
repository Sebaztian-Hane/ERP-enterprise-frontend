import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const suspicious = /\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2\u20ac|\ufffd|\b(?:Evaluaci|Operaci|Informaci|Planificaci|Producci|Distribuci|Revisi|Simulaci|Confirmaci|Transacci)\?n\b|\bm\?dulos\b/i;
const decoder = new TextDecoder("utf-8", { fatal: true });
const failures = [];
function visit(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) visit(path);
    else if (/\.(tsx?|css|html|json|md)$/.test(path)) {
      try {
        if (suspicious.test(decoder.decode(readFileSync(path)))) failures.push(path);
      } catch { failures.push(path); }
    }
  }
}
visit("src");
if (failures.length) {
  console.error("Invalid UTF-8 or damaged accents:", failures.join(", "));
  process.exit(1);
}
console.log("UTF-8 source check passed.");
