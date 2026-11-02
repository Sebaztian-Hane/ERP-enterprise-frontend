import { SystemNotice } from "./SystemNotifications";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";

type ProfileData = { attributes: Record<string, string | number | null>; fields: { key: string; description: string; group: string }[] };
const labels: Record<string, string> = { description: "Descripción técnica", material_type: "Tipo de material", barcode: "Código de barras", brand: "Marca", manufacturer: "Fabricante", manufacturer_part_number: "Código del fabricante", net_weight: "Peso neto", gross_weight: "Peso bruto", weight_unit: "Unidad de peso", country_of_origin: "País de origen", hs_code: "Partida arancelaria", lead_time_days: "Plazo de abastecimiento (días)", minimum_order_quantity: "Pedido mínimo", reorder_point: "Punto de reposición", safety_stock: "Stock de seguridad", storage_conditions: "Almacenamiento" };
const choices: Record<string, { value: string; label: string }[]> = {
  material_type: [{ value: "merchandise", label: "Mercadería" }, { value: "raw_material", label: "Materia prima" }, { value: "semi_finished", label: "Semielaborado" }, { value: "finished", label: "Producto terminado" }, { value: "consumable", label: "Consumible" }, { value: "service", label: "Servicio" }],
  weight_unit: [{ value: "KG", label: "Kilogramos" }, { value: "G", label: "Gramos" }, { value: "T", label: "Toneladas" }],
};
const numericFields = new Set(["net_weight", "gross_weight", "lead_time_days", "minimum_order_quantity", "reorder_point", "safety_stock"]);

export function MaterialProfileEditor({ productId }: { productId: string }) {
  const { session, tenantId, roleCode } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const token = useRef(session?.access_token);
  token.current = session?.access_token;
  const writable = roleCode === "owner" || roleCode === "admin" || roleCode === "inventory";
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(null); setSaved(false);
    apiFetch<ProfileData>(`/products/${productId}/material-profile`, { accessToken: token.current, tenantId: tenantId ?? undefined, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setValues(Object.fromEntries(Object.entries(result.attributes).map(([key, value]) => [key, String(value ?? "")])));
      })
      .catch((cause) => { if (!controller.signal.aborted && !(cause instanceof ApiError && cause.status === 404)) setError(cause instanceof Error ? cause.message : "No se pudo consultar la ficha industrial."); });
    return () => controller.abort();
  }, [productId, tenantId]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      const attributes = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== ""));
      await apiFetch(`/products/${productId}/material-profile`, { accessToken: session?.access_token, tenantId: tenantId ?? undefined, method: "PUT", body: JSON.stringify(attributes) });
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la ficha industrial."); }
    finally { setBusy(false); }
  };
  if (!data) return error ? <SystemNotice tone="error">{error}</SystemNotice> : null;
  return <details className="material-profile-editor"><summary>Ficha industrial y planificación</summary><p className="migration-help">Estos datos describen el material. Las cantidades de planificación se guardan como referencia y no modifican existencias.</p><form onSubmit={save} className="customer-form"><div className="form-grid">{data.fields.map((field) => <label key={field.key}>{labels[field.key] ?? field.key}{choices[field.key] ? <select disabled={!writable || busy} value={values[field.key] ?? ""} onChange={(event) => { setSaved(false); setValues((current) => ({ ...current, [field.key]: event.target.value })); }}><option value="">Sin especificar</option>{choices[field.key].map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select> : <input disabled={!writable || busy} type={numericFields.has(field.key) ? "number" : "text"} min={numericFields.has(field.key) ? 0 : undefined} step={field.key.endsWith("weight") ? "0.001" : numericFields.has(field.key) ? "1" : undefined} value={values[field.key] ?? ""} onChange={(event) => { setSaved(false); setValues((current) => ({ ...current, [field.key]: event.target.value })); }} />}<small className="migration-help">{field.description}</small></label>)}</div>{error && <SystemNotice tone="error">{error}</SystemNotice>}{saved && <p role="status">Ficha industrial guardada.</p>}{writable && <button className="secondary-button" disabled={busy}>{busy ? "Guardando ficha…" : "Guardar ficha industrial"}</button>}</form></details>;
}
