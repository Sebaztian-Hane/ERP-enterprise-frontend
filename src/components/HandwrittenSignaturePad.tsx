import { PointerEvent, useMemo, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { SignaturePath, signaturePathsToSvg } from "../lib/handwrittenSignature";

type Props = { onChange: (svg: string) => void; disabled?: boolean };

export function HandwrittenSignaturePad({ onChange, disabled = false }: Props) {
  const [paths, setPaths] = useState<SignaturePath[]>([]);
  const activePointerId = useRef<number | null>(null);
  const svg = useMemo(() => signaturePathsToSvg(paths), [paths]);
  const update = (next: SignaturePath[]) => { setPaths(next); onChange(signaturePathsToSvg(next)); };
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * 640, y: ((event.clientY - box.top) / box.height) * 220 };
  };
  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || activePointerId.current !== null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    update([...paths, [point(event)]]);
  };
  const draw = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || activePointerId.current !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const nextPoint = point(event);
    update(paths.map((path, index) => index === paths.length - 1 ? [...path, nextPoint] : path));
  };
  const end = (event: PointerEvent<SVGSVGElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activePointerId.current = null;
  };
  const clear = () => update([]);

  return <section className="handwritten-signature" aria-label="Firma manuscrita">
    <div className="handwritten-signature-header"><div><strong>Firma manuscrita</strong><small>Dibuja con lápiz, mouse o dedo. Se conservará como evidencia visual.</small></div><button type="button" className="text-button" disabled={disabled || !svg} onClick={clear}><Eraser size={15} /> Limpiar</button></div>
    <svg className="signature-pad" viewBox="0 0 640 220" role="img" aria-label="Área para dibujar la firma" onPointerDown={start} onPointerMove={draw} onPointerUp={end} onPointerCancel={end}>
      <path d="M 24 184 H 616" className="signature-baseline" />
      {paths.map((path, index) => path.length > 1 && <path key={index} d={`M ${path.map((entry) => `${entry.x} ${entry.y}`).join(" L ")}`} className="signature-stroke" />)}
    </svg>
    <small className="signature-disclaimer">Es una representación manuscrita interna y no reemplaza un certificado digital con validez legal.</small>
  </section>;
}
