import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiFetch } from "../lib/api";
import type { RoleCode } from "../lib/roleAccess";
import { supabase } from "../lib/supabase";

export type Tenant = { id: string; name: string; timezone: string };
type AuthContextValue = {
  session: Session | null;
  tenants: Tenant[];
  tenantId: string | null;
  roleCode: RoleCode | null;
  isRoleLoading: boolean;
  roleError: string | null;
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
  // The provider console is intentionally outside the tenant workspace. A
  // supplier account may not be a member of any customer tenant, so it must
  // not be redirected or blocked by the tenant bootstrap below.
  const isProviderPortal = window.location.pathname.replace(/\/+$/, "") === "/oreo";
  const [session, setSession] = useState<Session | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const tenantIdRef = useRef<string | null>(null);
  const [roleCode, setRoleCode] = useState<RoleCode | null>(null);
  const roleCodeRef = useRef<RoleCode | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
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
      tenantIdRef.current = next;
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
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    let active = true;
    if (!session || !tenantId) {
      roleCodeRef.current = null;
      setRoleCode(null);
      setRoleError(null);
      setIsRoleLoading(false);
      return () => { active = false; };
    }
    // A TOKEN_REFRESHED event replaces only the access token. Keeping the
    // already-authorized role on screen avoids unmounting the active page (and
    // therefore losing an in-progress form) whenever a browser tab regains
    // focus. A tenant switch clears roleCode first, so it still blocks until
    // the role for the new company has been verified.
    const shouldBlockWorkspace = roleCodeRef.current === null;
    if (shouldBlockWorkspace) setIsRoleLoading(true);
    setRoleError(null);
    void apiFetch<{ role_code: RoleCode }>("/auth/me", {
      accessToken: session.access_token,
      tenantId,
    }).then((actor) => {
      if (active) {
        roleCodeRef.current = actor.role_code;
        setRoleCode(actor.role_code);
      }
    }).catch((cause) => {
      if (active) {
        // Preserve a previously verified role during a transient refresh
        // failure. The next authenticated API request remains protected by
        // the server; this only prevents a harmless network hiccup from
        // destroying an unsaved local form.
        if (shouldBlockWorkspace) {
          roleCodeRef.current = null;
          setRoleCode(null);
          setRoleError(`No se pudo validar tu rol de acceso: ${message(cause)}`);
        }
      }
    }).finally(() => {
      if (active && shouldBlockWorkspace) setIsRoleLoading(false);
    });
    return () => { active = false; };
  }, [session?.access_token, tenantId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      if (initialSession && !isProviderPortal) void loadTenants(initialSession.access_token, true);
      else setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        roleCodeRef.current = null;
        tenantIdRef.current = null;
        setTenants([]); setTenantId(null); setError(null); setIsLoading(false);
        return;
      }
      // This must never trigger the full-page loader. Apart from token refresh,
      // Supabase may emit SIGNED_IN while restoring a persisted tab session.
      // Tenant data can refresh in the background without unmounting a form.
      if (event === "SIGNED_IN" && !isProviderPortal) {
        // A new login must show the session loader until a company is known.
        // A restored/focused tab already has a tenant and refreshes silently.
        void loadTenants(nextSession.access_token, tenantIdRef.current === null);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [isProviderPortal, loadTenants]);

  const signIn = async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    return signInError?.message ?? null;
  };
  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshSession = async () => {
    const { data: { session: refreshed } } = await supabase.auth.getSession();
    setSession(refreshed);
  };
  const selectTenant = (nextId: string) => { roleCodeRef.current = null; tenantIdRef.current = nextId; setRoleCode(null); setTenantId(nextId); localStorage.setItem(storedTenantKey, nextId); };
  const value = useMemo(() => ({ session, tenants, tenantId, roleCode, isRoleLoading, roleError, isLoading, error, signIn, signOut, selectTenant, refreshSession }), [session, tenants, tenantId, roleCode, isRoleLoading, roleError, isLoading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
