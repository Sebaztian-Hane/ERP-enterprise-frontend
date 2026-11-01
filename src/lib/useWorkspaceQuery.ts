import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import type { ApiOptions } from "./api";

/** New screens cancel stale reads on account, company or resource changes. */
export function useWorkspaceQuery<T>(queryKey: string, load: (options: ApiOptions) => Promise<T>) {
  const { session, tenantId } = useAuth();
  const loader = useRef(load);
  loader.current = load;
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(null);
    if (!session?.access_token || !tenantId) { setLoading(false); return; }
    setLoading(true);
    loader.current({ accessToken: session.access_token, tenantId, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo consultar la información."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [queryKey, revision, session?.access_token, tenantId]);
  return { data, loading, error, refresh };
}
