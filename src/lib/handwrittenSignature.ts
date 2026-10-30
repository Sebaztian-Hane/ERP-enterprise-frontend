export type SignaturePoint = { x: number; y: number };
export type SignaturePath = SignaturePoint[];

const format = (value: number) => Number(value.toFixed(2)).toString();

export function signaturePathsToSvg(paths: SignaturePath[]) {
  const strokes = paths.filter((path) => path.length >= 2);
  if (!strokes.length) return "";
  const content = strokes.map((path) => {
    const [first, ...rest] = path;
    const d = [`M ${format(first.x)} ${format(first.y)}`, ...rest.map((point) => `L ${format(point.x)} ${format(point.y)}`)].join(" ");
    return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" role="img" aria-label="Firma manuscrita">${content}</svg>`;
}
