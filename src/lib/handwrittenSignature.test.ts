import { describe, expect, it } from "vitest";
import { signaturePathsToSvg } from "./handwrittenSignature";

describe("signaturePathsToSvg", () => {
  it("serializes handwritten pointer paths as a safe SVG", () => {
    const svg = signaturePathsToSvg([[
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]]);

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('d="M 10 20 L 30 40"');
  });

  it("does not serialize an empty handwritten signature", () => {
    expect(signaturePathsToSvg([])).toBe("");
  });
});
