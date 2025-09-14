export async function fetchClient(input: RequestInfo, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase()

  // Read existing csrf cookie
  const readCsrf = () =>
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrf_token="))
      ?.split("=")[1]

  let csrf = readCsrf()
  const providedHeaders = new Headers(init?.headers || {})

  // Lazy bootstrap CSRF: for state-changing requests without cookie or header, call /api/csrf once
  const needsCsrfBootstrap = (
    method !== "GET" &&
    !providedHeaders.has("x-csrf-token") &&
    (!csrf || csrf.length < 10)
  )

  if (needsCsrfBootstrap) {
    try {
      await fetch("/api/csrf", { credentials: "same-origin" })
      csrf = readCsrf()
    } catch {
      // ignore bootstrap errors; request may still proceed and be rejected server-side
    }
  }

  // Build headers carefully: don't force Content-Type on GET requests
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
    // Always attach header if we have it (middleware checks raw prefix)
    ...(csrf ? { "x-csrf-token": csrf } : {}),
  }

  const headers = new Headers(init?.headers || {})
  Object.entries(baseHeaders).forEach(([k, v]) => {
    if (!headers.has(k)) headers.set(k, v)
  })
  if (method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  return fetch(input, {
    credentials: init?.credentials ?? "same-origin",
    ...init,
    headers,
  })
}
