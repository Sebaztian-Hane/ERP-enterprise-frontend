import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true); setError(null);
    const result = await signIn(email, password);
    if (result) setError("No fue posible iniciar sesión. Verifica tu correo y contraseña.");
    setSending(false);
  };
  return <main className="login-page"><section className="login-aside"><div className="login-brand"><span className="brand-mark"><span /></span>enterprise<span>cloud</span></div><div><p className="eyebrow">GESTIÓN CONECTADA</p><h1>Una operación clara.<br />Decisiones oportunas.</h1><p>Centraliza ventas, inventario, finanzas y compras en un solo espacio empresarial.</p></div><div className="login-points"><span><ShieldCheck size={17} /> Acceso por organización</span><span><LockKeyhole size={17} /> Sesión protegida</span></div></section><section className="login-form-area"><form className="login-form" onSubmit={submit}><div><p className="eyebrow">BIENVENIDO</p><h2>Inicia sesión</h2><p>Usa las credenciales asignadas a tu empresa.</p></div><label>Correo electrónico<span className="field"><Mail size={18} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nombre@empresa.com" /></span></label><label>Contraseña<span className="field"><LockKeyhole size={18} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••" /></span></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="login-submit" disabled={sending}>{sending ? "Validando acceso…" : <>Ingresar al ERP <ArrowRight size={18} /></>}</button><p className="login-note">Si aún no tienes acceso, solicita una invitación al administrador de tu organización.</p></form></section></main>;
}
