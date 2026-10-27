import { describe, expect, it } from "vitest";
import { canCreateAdministrativeSale, canImportAdministrativeSales } from "./businessProfile";

describe("canCreateAdministrativeSale", () => {
  it("only allows the administrative sales channel for wholesale and hybrid tenants", () => {
    expect(canCreateAdministrativeSale("retail")).toBe(false);
    expect(canCreateAdministrativeSale("wholesale")).toBe(true);
    expect(canCreateAdministrativeSale("hybrid")).toBe(true);
  });
});

it("does not expose administrative sales imports to retail tenants", () => {
  expect(canImportAdministrativeSales("retail")).toBe(false);
  expect(canImportAdministrativeSales("wholesale")).toBe(true);
  expect(canImportAdministrativeSales("hybrid")).toBe(true);
});
