export type BusinessProfile = "retail" | "wholesale" | "hybrid";

export function canCreateAdministrativeSale(profile: BusinessProfile | undefined) {
  return profile !== "retail";
}

export function canImportAdministrativeSales(profile: BusinessProfile | undefined) {
  return canCreateAdministrativeSale(profile);
}
