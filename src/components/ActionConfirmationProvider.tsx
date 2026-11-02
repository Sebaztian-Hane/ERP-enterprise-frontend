import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { registerActionConfirmation, type ConfirmationPrompt } from "../lib/actionConfirmation";
import { SystemNotice } from "./SystemNotifications";

type Pending = { prompt: ConfirmationPrompt; resolve: (token: string) => void; reject: (error: Error) => void; scope: string; started: number; cleanup: () => void };
type Factor = { id: string; friendly_name?: string };
type Enrollment = { factorId: string; qr: string; secret: string };

export function ActionConfirmationProvider({ children }: { children: ReactNode }) {
  const { session, tenantId, tenants } = useAuth();
  const scope = `${session?.user.id ?? ""}:${tenantId ?? ""}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const pending = useRef<Pending | null>(null);
  const [prompt, setPrompt] = useState<ConfirmationPrompt | null>(null);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  function cancel(message = "Operación cancelada. No se envió la confirmación.") {
    const item = pending.current;
    pending.current = null; item?.cleanup(); item?.reject(new Error(message));
    setPrompt(null); setCode(""); setEnrollment(null); setError(null);
  }
  useEffect(() => {
    const unregister = registerActionConfirmation(next => new Promise<string>((resolve, reject) => {
      if (pending.current) { reject(new Error("Completa o cancela la verificación que ya está abierta.")); return; }
      if (next.tenantId && !currentScope.current.endsWith(`:${next.tenantId}`)) { reject(new Error("La empresa cambió. Vuelve a iniciar la operación.")); return; }
      if (next.signal?.aborted) { reject(new Error("La operación fue cancelada.")); return; }
      const aborted = () => cancel();
      next.signal?.addEventListener("abort", aborted, { once: true });
      const item: Pending = { prompt: next, resolve, reject, scope: currentScope.current, started: Date.now(), cleanup: () => next.signal?.removeEventListener("abort", aborted) };
      pending.current = item;
      setPrompt(next); setCode(""); setError(null); setEnrollment(null); setFactors([]); setFactorId(""); setLoading(true); setVerifying(false);
      void supabase.auth.mfa.listFactors().then(({ data, error: cause }) => {
        if (pending.current !== item) return;
        if (cause) throw cause;
        const verified = (data?.totp ?? []).filter(factor => factor.status === "verified");
        setFactors(verified); setFactorId(verified[0]?.id ?? "");
      }).catch(() => { if (pending.current === item) setError("No se pudo consultar tu autenticador. Cancela y vuelve a intentarlo."); })
        .finally(() => { if (pending.current === item) setLoading(false); });
    }));
    return () => { unregister(); cancel(); };
  }, []);
  useEffect(() => { if (pending.current && pending.current.scope !== scope) cancel("La cuenta o empresa cambió. Vuelve a iniciar la operación en la empresa correcta."); }, [scope]);
  useEffect(() => {
    if (!prompt) return;
    const previous = document.activeElement as HTMLElement | null;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !verifying) { event.preventDefault(); event.stopPropagation(); cancel(); }
      if (event.key === "Tab") {
        const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary') ?? []);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", escape);
    firstInput.current?.focus();
    return () => { window.removeEventListener("keydown", escape); previous?.focus(); };
  }, [prompt, loading, verifying]);

  async function enroll() {
    const item = pending.current;
    setLoading(true); setError(null);
    try {
      const { data, error: cause } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `EnterpriseCloud ${new Date().toISOString().slice(0, 19)}` });
      if (cause) throw cause;
      if (pending.current !== item) return;
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setFactorId(data.id);
    } catch { if (pending.current === item) setError("No se pudo preparar el QR. Inténtalo nuevamente desde Mi perfil."); }
    finally { if (pending.current === item) setLoading(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const item = pending.current;
    if (!item || !factorId || verifying || loading || !/^\d{6}$/.test(code)) return;
    setVerifying(true); setError(null);
    try {
      if (item.prompt.expires_in && Date.now() - item.started >= item.prompt.expires_in * 1000) throw new Error("La confirmación venció. Cancela y vuelve a iniciar la operación.");
      // Signed AMR timestamps have second precision. Verification must happen
      // strictly after the server challenge, including very fast submissions.
      const delay = 1100 - (Date.now() - item.started);
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      if (pending.current !== item) return;
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw new Error("No se pudo iniciar la verificación. Espera un momento e inténtalo de nuevo.");
      const { data, error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (verifyError || !data?.access_token) throw new Error("Código incorrecto, vencido o ya utilizado. Espera el siguiente código del autenticador e inténtalo de nuevo.");
      if (pending.current !== item || currentScope.current !== item.scope) return;
      pending.current = null; item.cleanup(); setPrompt(null); setCode(""); setEnrollment(null);
      item.resolve(data.access_token);
    } catch (cause) {
      if (pending.current === item) { setError(cause instanceof Error ? cause.message : "No se pudo verificar el código."); setCode(""); }
    } finally { if (!pending.current || pending.current === item) setVerifying(false); }
  }

  const company = tenants.find(tenant => tenant.id === prompt?.tenantId)?.name;
  return <>{children}{prompt && createPortal(<div className="modal-layer action-confirmation-layer"><section ref={dialogRef} className="customer-modal action-confirmation-dialog" role="dialog" aria-modal="true" aria-label="Confirmación de seguridad">
    <div className="modal-header"><h2><ShieldCheck size={22} /> Confirmación de seguridad</h2><button type="button" className="icon-button" aria-label="Cancelar confirmación de seguridad" disabled={verifying} onClick={() => cancel()}><X /></button></div>
    <form className="customer-form" onSubmit={verify}>
      <p><strong>{prompt.action}</strong>{company && <><br />Empresa: {company}</>}</p>
      <p>Revisa la operación pendiente. Para continuar, escribe un código de 6 dígitos de tu aplicación autenticadora. Esta confirmación solo autoriza esta operación.</p>
      {loading ? <p role="status">Preparando autenticador…</p> : !factorId && !error ? <div><p>Primero vincula un autenticador de tu teléfono mediante QR. El QR se utiliza al configurarlo; después confirmarás con sus códigos temporales.</p><button type="button" className="secondary-button" onClick={() => void enroll()}>Configurar autenticador con QR</button></div> : null}
      {enrollment && <div className="mfa-enrollment"><img src={enrollment.qr} alt="QR privado para vincular tu autenticador" /><details><summary>Usar clave manual</summary><code>{enrollment.secret}</code></details></div>}
      {factors.length > 1 && <label>Autenticador<select value={factorId} disabled={verifying} onChange={event => { setFactorId(event.target.value); setCode(""); }}>{factors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendly_name || "Autenticador"}</option>)}</select></label>}
      {factorId && <label>Código del autenticador<input ref={firstInput} type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} disabled={verifying} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label>}
      {error && <SystemNotice tone="error">{error}</SystemNotice>}
      <div className="modal-actions"><button type="button" className="secondary-button" disabled={verifying} onClick={() => cancel()}>Cancelar</button><button className="primary-button" disabled={verifying || loading || !factorId || code.length !== 6}>{verifying ? "Verificando…" : "Verificar y continuar"}</button></div>
    </form>
  </section></div>, document.body)}</>;
}
