// src/instrumentation.ts
function shouldAttachAuth(url: URL): boolean {
  // Dataset Viewer backend
  if (url.hostname === "datasets-server.huggingface.co") return true;

  // Hub dataset APIs and dataset file resolution
  if (url.hostname === "huggingface.co") {
    if (url.pathname.startsWith("/api/datasets/")) return true;
    if (url.pathname.includes("/resolve/")) return true;
  }

  return false;
}

export async function register() {
  // Support the common env var names people use
  const token =
    process.env.HF_TOKEN ||
    process.env.HUGGINGFACE_HUB_TOKEN ||
    process.env.HUGGINGFACEHUB_API_TOKEN;

  if (!token) return;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : undefined;
    const method = (init?.method ?? req?.method ?? "GET").toUpperCase();

    // Only touch GET/HEAD to avoid breaking streamed bodies etc.
    if (method !== "GET" && method !== "HEAD") {
      return originalFetch(input as any, init);
    }

    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    let url: URL;
    try {
      url = new URL(urlStr);
    } catch {
      // Relative URL (e.g. "/api/...") — don’t attach
      return originalFetch(input as any, init);
    }

    if (!shouldAttachAuth(url)) {
      return originalFetch(input as any, init);
    }

    // Merge headers: Request headers + init.headers
    const headers = new Headers(req?.headers);
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }

    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Avoid caching auth-gated responses
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "no-store");
    }

    // Pass Next.js-specific init fields (like `next: { revalidate }`) through,
    // but remove headers so they don't override our merged headers.
    const initWithoutHeaders: RequestInit | undefined = init
      ? { ...init }
      : undefined;
    if (initWithoutHeaders) delete (initWithoutHeaders as any).headers;

    if (req) {
      const newReq = new Request(req, { headers });
      return originalFetch(newReq, initWithoutHeaders);
    }

    return originalFetch(input as any, { ...(initWithoutHeaders ?? {}), headers });
  };
}
