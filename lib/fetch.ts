export async function fetchClient(input: RequestInfo, init?: RequestInit) {
  const csrf = document.cookie
    .split("; ")
    .find((c) => c.startsWith("csrf_token="))
    ?.split("=")[1]

  const method = (init?.method || "GET").toUpperCase()

  // Build headers carefully: don't force Content-Type on GET requests
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
    "x-csrf-token": csrf || "",
  }

  const headers = new Headers(init?.headers || {})
  // Apply base headers if not already set by caller
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
