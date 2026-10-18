import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type UserAvatarProps = {
  avatarPath?: string | null;
  name: string;
  className?: string;
};

export function initials(name: string) {
  return name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
}

export function UserAvatar({ avatarPath, name, className = "" }: UserAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!avatarPath) {
      setImageUrl(null);
      return () => { active = false; };
    }
    void supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600).then(({ data, error }) => {
      if (!active) return;
      setImageUrl(error ? null : data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [avatarPath]);

  return (
    <span className={`avatar ${className}`.trim()} aria-label={`Perfil de ${name}`}>
      {imageUrl ? <img src={imageUrl} alt="" /> : initials(name)}
    </span>
  );
}
