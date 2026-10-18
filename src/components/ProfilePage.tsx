import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, LoaderCircle, LogOut, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { UserAvatar } from "./UserAvatar";

type Metadata = { full_name?: string; avatar_path?: string };
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function message(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo actualizar tu perfil.";
}

export function ProfilePage({ goBack }: { goBack: () => void }) {
  const { session, refreshSession, signOut } = useAuth();
  const metadata = (session?.user.user_metadata ?? {}) as Metadata;
  const [fullName, setFullName] = useState(metadata.full_name ?? session?.user.email?.split("@")[0] ?? "Usuario");
  const [avatarPath, setAvatarPath] = useState<string | null>(metadata.avatar_path ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(metadata.full_name ?? session?.user.email?.split("@")[0] ?? "Usuario");
    setAvatarPath(metadata.avatar_path ?? null);
  }, [metadata.avatar_path, metadata.full_name, session?.user.email]);

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
      <article className="panel profile-form-card"><div className="panel-header"><div><p className="card-label">INFORMACIÓN PERSONAL</p><h2>Datos de acceso</h2></div></div><form onSubmit={(event) => { event.preventDefault(); void save(); }} className="customer-form"><label>Correo electrónico<input value={session?.user.email ?? ""} disabled /></label><label>Nombre para mostrar<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} placeholder="Tu nombre" required /></label>{error && <p className="login-error">{error}</p>}{success && <p className="profile-success">{success}</p>}<div className="profile-form-actions"><button type="submit" className="primary-button" disabled={isSaving || isUploading}>{isSaving ? <LoaderCircle size={16} className="spin" /> : null} Guardar perfil</button><button type="button" className="secondary-button logout-button" onClick={() => void signOut()}><LogOut size={16} /> Cerrar sesión</button></div></form></article>
    </div>
  </section>;
}
