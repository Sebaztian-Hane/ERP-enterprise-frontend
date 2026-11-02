import { ChevronDown } from "lucide-react";

type Company = { id: string; name: string };

function compactName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  const lead = normalized.split(/\s+[-–—]\s+/)[0];
  if (lead.length <= 18) return lead;
  const words = lead.split(" ").filter(word => !/^(de|del|la|las|los|el|y)$/i.test(word));
  return words.length > 1 ? words.slice(0, 4).map(word => Array.from(word)[0]).join("").toLocaleUpperCase("es") : `${Array.from(lead).slice(0, 15).join("")}…`;
}

export function CompanySwitcher({ companies, value, onChange }: { companies: Company[]; value: string; onChange: (id: string) => void }) {
  const name = companies.find(company => company.id === value)?.name ?? "Seleccionar empresa";
  return (
    <label className="top-workspace" title={name}>
      <span className="workspace-company" aria-hidden="true">
        <small>Empresa</small>
        <strong>{compactName(name)}</strong>
      </span>
      <ChevronDown size={15} aria-hidden="true" />
      <select aria-label="Empresa activa" title={name} value={value} onChange={event => onChange(event.target.value)}>
        {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
      </select>
    </label>
  );
}
