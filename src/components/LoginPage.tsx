import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

export function LoginPage({ providerAccess = false }: { providerAccess?: boolean }) {
  const { signIn, mfaRequired, refreshSession, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (!mfaRequired) {
      setFactorId(null);
      setMfaCode("");
      return;
    }
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      if (!active) return;
      if (factorsError) { setError(factorsError.message); return; }
      const factor = data?.totp.find((item) => item.status === "verified");
      if (!factor) { setError("No se encontró un autenticador verificado para esta cuenta."); return; }
      setFactorId(factor.id);
    });
    return () => { active = false; };
  }, [mfaRequired]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await signIn(email, password);
    if (result) setError("No fue posible iniciar sesión. Verifica tu correo y contraseña.");
    setSending(false);
  };

  const verifyMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!factorId) return;
    setSending(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: mfaCode });
      if (verifyError) throw verifyError;
      await refreshSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible verificar el código.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand" aria-label="EnterpriseCloud">
          <span className="brand-mark"><span /></span>
          enterprise<span>cloud</span>
        </div>
        <header className="login-heading">
          <p className="eyebrow">{providerAccess ? "ACCESO RESTRINGIDO" : "ERP ENTERPRISECLOUD"}</p>
          <h1 id="login-title">{mfaRequired ? "Verifica tu acceso" : providerAccess ? "Consola de proveedor" : "Inicia sesión"}</h1>
          <p>{mfaRequired ? "Ingresa el código de tu aplicación autenticadora para continuar." : providerAccess ? "Ingresa con tu cuenta autorizada de EnterpriseCloud." : "Ingresa con las credenciales asignadas a tu organización."}</p>
        </header>
        {mfaRequired ? <form className="login-form" onSubmit={verifyMfa}>
          <label>
            Código de verificación
            <span className="field">
              <KeyRound size={18} />
              <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))} required placeholder="000000" />
            </span>
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" disabled={sending || !factorId}>
            {sending ? "Verificando…" : <>Verificar acceso <ArrowRight size={18} /></>}
          </button>
          <button type="button" className="text-button" onClick={() => void signOut()} disabled={sending}>Usar otra cuenta</button>
        </form> : <form className="login-form" onSubmit={submit}>
          <label>
            Correo electrónico
            <span className="field">
              <Mail size={18} />
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nombre@empresa.com" />
            </span>
          </label>
          <label>
            Contraseña
            <span className="field">
              <LockKeyhole size={18} />
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••" />
            </span>
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" disabled={sending}>
            {sending ? "Validando acceso…" : <>Ingresar <ArrowRight size={18} /></>}
          </button>
        </form>}
        <p className="login-note">{mfaRequired ? "El código se valida directamente con tu autenticador; no se guarda en EnterpriseCloud." : providerAccess ? "El acceso se valida de forma segura en el servidor." : "¿No tienes acceso? Solicita una invitación al administrador de tu organización."}</p>
      </section>
    </main>
  );
}
