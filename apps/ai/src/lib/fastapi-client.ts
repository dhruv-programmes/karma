import { fastapiBase } from "@/lib/ai";

export async function fastapiGet<T = unknown>(
  path: string,
  authHeader: string,
  query?: Record<string, string>
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const base = fastapiBase();
  const url = new URL(`${base}/api/v1${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: authHeader || "Bearer demo-carbon-loop-token",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: text.slice(0, 240) || `FastAPI ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "FastAPI unreachable",
    };
  }
}
