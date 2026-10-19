import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";

export type Tenant = { id: string; name: string; timezone: string };
type AuthContextValue = {
  session: Session | null;
  tenants: Tenant[];
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  selectTenant: (tenantId: string) => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const storedTenantKey = "enterprisecloud.activeTenantId";

function message(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible completar la operación.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async (accessToken: string, blockApplication = false) => {
    // The full-page loader is exclusively for the first session bootstrap.
    // Supabase can emit SIGNED_IN/TOKEN_REFRESHED again after a tab regains
    // focus; using the loader in those events unmounts the active module and
    // discards unsaved form state.
    if (blockApplication) setIsLoading(true);
    try {
      setError(null);
      const available = await apiFetch<Tenant[]>("/auth/tenants", { accessToken });
      setTenants(available);
      const stored = localStorage.getItem(storedTenantKey);
      const next = available.some((tenant) => tenant.id === stored) ? stored : available[0]?.id ?? null;
      setTenantId(next);
      if (next) localStorage.setItem(storedTenantKey, next);
    } catch (cause) {
      setTenants([]);
      setTenantId(null);
      setError(`Sesión iniciada, pero no se pudieron cargar las empresas: ${message(cause)}`);
    } finally {
      if (blockApplication) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      if (initialSession) void loadTenants(initialSession.access_token, true);
      else setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setTenants([]); setTenantId(null); setError(null); setIsLoading(false);
        return;
      }
      // This must never trigger the full-page loader. Apart from token refresh,
      // Supabase may emit SIGNED_IN while restoring a persisted tab session.
      // Tenant data can refresh in the background without unmounting a form.
      if (event === "SIGNED_IN") void loadTenants(nextSession.access_token);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [loadTenants]);

  const signIn = async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    return signInError?.message ?? null;
  };
  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshSession = async () => {
    const { data: { session: refreshed } } = await supabase.auth.getSession();
    setSession(refreshed);
  };
  const selectTenant = (nextId: string) => { setTenantId(nextId); localStorage.setItem(storedTenantKey, nextId); };
  const value = useMemo(() => ({ session, tenants, tenantId, isLoading, error, signIn, signOut, selectTenant, refreshSession }), [session, tenants, tenantId, isLoading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
