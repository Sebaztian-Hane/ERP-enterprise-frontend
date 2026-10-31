import { describe, expect, it } from "vitest";
import { requiresMfaVerification } from "./mfaLogin";

describe("requiresMfaVerification", () => {
  it("requires a TOTP challenge when the session is AAL1 but the account has AAL2 available", () => {
    expect(requiresMfaVerification({ currentLevel: "aal1", nextLevel: "aal2" })).toBe(true);
  });

  it("does not block sessions already elevated to AAL2", () => {
    expect(requiresMfaVerification({ currentLevel: "aal2", nextLevel: "aal2" })).toBe(false);
  });
});
