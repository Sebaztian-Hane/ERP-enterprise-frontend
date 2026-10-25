import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, KeyRound, LoaderCircle, LogOut, ShieldCheck, Smartphone, Trash2, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";
import { UserAvatar } from "./UserAvatar";

type Metadata = { full_name?: string; avatar_path?: string };
type MfaEnrollment = { factorId: string; qrCode: string; secret: string };
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function message(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo actualizar tu perfil.";
}

export function ProfilePage({ goBack }: { goBack: () => void }) {
  const { session, tenantId, refreshSession, signOut } = useAuth();
  const metadata = (session?.user.user_metadata ?? {}) as Metadata;
  const [fullName, setFullName] = useState(metadata.full_name ?? session?.user.email?.split("@")[0] ?? "Usuario");
  const [avatarPath, setAvatarPath] = useState<string | null>(metadata.avatar_path ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isPasswordRequesting, setIsPasswordRequesting] = useState(false);
  const [isPasswordConfirming, setIsPasswordConfirming] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"entry" | "verify">("entry");
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; friendly_name?: string }>>([]);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaAssurance, setMfaAssurance] = useState<"aal1" | "aal2">("aal1");
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(metadata.full_name ?? session?.user.email?.split("@")[0] ?? "Usuario");
    setAvatarPath(metadata.avatar_path ?? null);
  }, [metadata.avatar_path, metadata.full_name, session?.user.email]);

  const loadMfa = async () => {
    if (!session) return;
    const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (factorsError) throw factorsError;
    if (assuranceError) throw assuranceError;
    setMfaFactors((factors?.totp ?? []).map((factor) => ({ id: factor.id, friendly_name: factor.friendly_name ?? undefined })));
    setMfaAssurance(assurance?.currentLevel === "aal2" ? "aal2" : "aal1");
  };

  useEffect(() => {
    void loadMfa().catch((cause) => setError(message(cause)));
  // The authenticated identity, not each rendered field, determines MFA state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const save = async (nextAvatarPath = avatarPath) => {
    if (!fullName.trim()) { setError("Indica el nombre que se mostrará en el sistema."); return false; }
    setIsSaving(true); setError(null); setSuccess(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim(), avatar_path: nextAvatarPath } });
      if (updateError) throw updateError;
      await refreshSession();
      setAvatarPath(nextAvatarPath);
      setSuccess("Tu perfil se actualizó correctamente.");
      return true;
    } catch (cause) { setError(message(cause)); return false; } finally { setIsSaving(false); }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session) return;
    if (!acceptedTypes.includes(file.type)) { setError("Usa una imagen JPG, PNG o WEBP."); return; }
    if (file.size > 3 * 1024 * 1024) { setError("La foto debe pesar como máximo 3 MB."); return; }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${session.user.id}/avatar.${extension}`;
    setIsUploading(true); setError(null); setSuccess(null);
    try {
      const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const saved = await save(path);
      if (!saved && path !== avatarPath) await supabase.storage.from("profile-avatars").remove([path]);
      // Changing the image format creates a different storage path.  Once the
      // profile points to the new private file, remove the old one so it does
      // not remain unnecessarily stored under the user's account.
      if (saved && avatarPath && path !== avatarPath) {
        const { error: oldAvatarError } = await supabase.storage.from("profile-avatars").remove([avatarPath]);
        if (oldAvatarError) console.warn("No se pudo eliminar el avatar anterior", oldAvatarError);
      }
    } catch (cause) { setError(message(cause)); } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    if (!avatarPath) return;
    setIsUploading(true); setError(null); setSuccess(null);
    try {
      const saved = await save(null);
      if (!saved) return;
      const { error: deleteError } = await supabase.storage.from("profile-avatars").remove([avatarPath]);
      if (deleteError) throw deleteError;
    } catch (cause) { setError(message(cause)); } finally { setIsUploading(false); }
  };

  const authOptions = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const requestPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPasswordRequesting(true); setError(null); setSuccess(null);
    try {
      const result = await apiFetch<{ detail: string }>("/auth/password-change/request", { ...authOptions, method: "POST", body: JSON.stringify({ new_password: newPassword }) });
      setPasswordStep("verify"); setSuccess(result.detail);
    } catch (cause) { setError(message(cause)); } finally { setIsPasswordRequesting(false); }
  };
  const confirmPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPasswordConfirming(true); setError(null); setSuccess(null);
    try {
      const result = await apiFetch<{ detail: string }>("/auth/password-change/confirm", { ...authOptions, method: "POST", body: JSON.stringify({ new_password: newPassword, code: verificationCode }) });
      setNewPassword(""); setVerificationCode(""); setPasswordStep("entry"); setSuccess(result.detail);
      // The API invalidates all prior access tokens after a password change.
      // Clear this browser immediately instead of waiting for a failed request.
      await signOut();
    } catch (cause) { setError(message(cause)); } finally { setIsPasswordConfirming(false); }
  };
  const revokeAllSessions = async () => {
    setIsRevokingSessions(true); setError(null); setSuccess(null);
    try {
      const result = await apiFetch<{ detail: string }>("/auth/sessions/revoke-all", { ...authOptions, method: "POST" });
      setSuccess(result.detail);
      await signOut();
    } catch (cause) { setError(message(cause)); } finally { setIsRevokingSessions(false); }
  };

  const startMfaEnrollment = async () => {
    setIsMfaLoading(true); setError(null); setSuccess(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "EnterpriseCloud" });
      if (enrollError) throw enrollError;
      if (!data?.totp?.qr_code || !data.totp.secret) throw new Error("No se pudo preparar el autenticador.");
      setMfaEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (cause) { setError(message(cause)); } finally { setIsMfaLoading(false); }
  };

  const verifyMfaEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaEnrollment) return;
    setIsMfaLoading(true); setError(null); setSuccess(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaEnrollment.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaEnrollment.factorId, challengeId: challenge.id, code: mfaCode });
      if (verifyError) throw verifyError;
      await supabase.auth.refreshSession();
      await refreshSession();
      await loadMfa();
      setMfaCode(""); setMfaEnrollment(null);
      setSuccess("La verificación en dos pasos quedó activada para esta cuenta.");
    } catch (cause) { setError(message(cause)); } finally { setIsMfaLoading(false); }
  };

  const removeMfaFactor = async (factorId: string) => {
    setIsMfaLoading(true); setError(null); setSuccess(null);
    try {
      const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId });
      if (removeError) throw removeError;
      await supabase.auth.refreshSession();
      await refreshSession();
      await loadMfa();
      setSuccess("El autenticador se eliminó de esta cuenta.");
    } catch (cause) { setError(message(cause)); } finally { setIsMfaLoading(false); }
  };

  const displayName = fullName.trim() || session?.user.email?.split("@")[0] || "Usuario";
  return <section className="module-page profile-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">CUENTA PERSONAL</p><h1>Mi perfil</h1><p className="subtitle">Administra cómo te identificas dentro de EnterpriseCloud.</p></div></div>
    <div className="profile-layout">
      <article className="panel profile-card">
        <div className="profile-avatar-stage"><UserAvatar name={displayName} avatarPath={avatarPath} className="profile-avatar" /><label className="profile-camera" title="Cambiar foto"><Camera size={18} /><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={isUploading || isSaving} /></label></div>
        <h2>{displayName}</h2><p>{session?.user.email}</p><span className="profile-status"><ShieldCheck size={15} /> Cuenta autenticada</span>
        <div className="profile-photo-actions"><button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={isUploading || isSaving}>{isUploading ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />} Cambiar foto</button>{avatarPath && <button type="button" className="text-button danger-text" onClick={() => void removeAvatar()} disabled={isUploading || isSaving}><Trash2 size={15} /> Quitar</button>}</div>
        <small>JPG, PNG o WEBP · Máximo 3 MB</small>
      </article>
      <article className="panel profile-form-card">
        <div className="panel-header"><div><p className="card-label">INFORMACIÓN PERSONAL</p><h2>Datos de acceso</h2></div></div>
        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="customer-form">
          <label>Correo electrónico<input value={session?.user.email ?? ""} disabled /></label>
          <label>Nombre para mostrar<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} placeholder="Tu nombre" required /></label>
          <div className="profile-form-actions"><button type="submit" className="primary-button" disabled={isSaving || isUploading}>{isSaving ? <LoaderCircle size={16} className="spin" /> : null} Guardar perfil</button><button type="button" className="secondary-button logout-button" onClick={() => void signOut()}><LogOut size={16} /> Cerrar sesión</button></div>
        </form>
        <section className="password-change-panel">
          <div><p className="card-label">SEGURIDAD</p><h3><KeyRound size={17} /> Cambiar contraseña</h3><p>Por seguridad, confirmarás el cambio con un código enviado a tu correo.</p></div>
          {passwordStep === "entry" ? <form className="customer-form" onSubmit={requestPasswordChange}><label>Nueva contraseña<input required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mínimo 12 caracteres" /></label><button className="secondary-button" disabled={isPasswordRequesting}>{isPasswordRequesting ? "Enviando código…" : "Enviar código de verificación"}</button></form> : <form className="customer-form" onSubmit={confirmPasswordChange}><label>Código de 6 dígitos<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label><div className="profile-form-actions"><button className="primary-button" disabled={isPasswordConfirming}>{isPasswordConfirming ? "Verificando…" : "Confirmar nueva contraseña"}</button><button type="button" className="text-button" onClick={() => { setPasswordStep("entry"); setVerificationCode(""); }}>Cancelar</button></div></form>}
          <div className="profile-form-actions"><button type="button" className="secondary-button" onClick={() => void revokeAllSessions()} disabled={isRevokingSessions || !session}>{isRevokingSessions ? "Cerrando sesiones…" : "Cerrar sesiones en todos los dispositivos"}</button></div>
        </section>
        <section className="password-change-panel mfa-panel">
          <div><p className="card-label">VERIFICACIÓN EN DOS PASOS</p><h3><Smartphone size={17} /> Autenticador</h3><p>Protege aprobaciones, pagos, cambios de acceso, anulaciones CPE y ajustes ejecutados con un código de tu aplicación autenticadora.</p></div>
          {mfaEnrollment ? (
            <form className="mfa-enrollment" onSubmit={verifyMfaEnrollment}>
              <img src={mfaEnrollment.qrCode} alt="Código QR para configurar EnterpriseCloud en tu autenticador" />
              <p>Escanea el código o registra esta clave manual: <code>{mfaEnrollment.secret}</code></p>
              <label>Código de 6 dígitos<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label>
              <div className="profile-form-actions"><button className="primary-button" disabled={isMfaLoading}>{isMfaLoading ? "Verificando…" : "Activar verificación"}</button><button type="button" className="text-button" disabled={isMfaLoading} onClick={() => { setMfaEnrollment(null); setMfaCode(""); }}>Cancelar</button></div>
            </form>
          ) : mfaFactors.length ? (
            <div className="mfa-enabled"><span><ShieldCheck size={16} /> {mfaAssurance === "aal2" ? "Verificación activa en esta sesión" : "Autenticador registrado; verifica el código al iniciar sesión"}</span>{mfaFactors.map((factor) => <div key={factor.id} className="mfa-factor"><small>{factor.friendly_name || "Autenticador EnterpriseCloud"}</small><button type="button" className="text-button danger-text" disabled={isMfaLoading} onClick={() => void removeMfaFactor(factor.id)}>Eliminar</button></div>)}</div>
          ) : <div className="profile-form-actions"><button type="button" className="secondary-button" disabled={isMfaLoading} onClick={() => void startMfaEnrollment()}>{isMfaLoading ? "Preparando…" : "Configurar autenticador"}</button></div>}
        </section>
        {error && <p className="login-error">{error}</p>}{success && <p className="profile-success">{success}</p>}
      </article>
    </div>
  </section>;
}
