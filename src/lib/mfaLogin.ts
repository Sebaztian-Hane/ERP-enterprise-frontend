type AssuranceLevels = {
  currentLevel?: string | null;
  nextLevel?: string | null;
};

/** True when a registered second factor must elevate this browser session. */
export function requiresMfaVerification(assurance: AssuranceLevels | null | undefined) {
  return assurance?.currentLevel !== "aal2" && assurance?.nextLevel === "aal2";
}
