import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await signIn(email, password);
    if (result) setError("No fue posible iniciar sesión. Verifica tu correo y contraseña.");
    setSending(false);
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
          <p className="eyebrow">ERP ENTERPRISECLOUD</p>
          <h1 id="login-title">Inicia sesión</h1>
          <p>Ingresa con las credenciales asignadas a tu organización.</p>
        </header>
        <form className="login-form" onSubmit={submit}>
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
        </form>
        <p className="login-note">¿No tienes acceso? Solicita una invitación al administrador de tu organización.</p>
      </section>
    </main>
  );
}
