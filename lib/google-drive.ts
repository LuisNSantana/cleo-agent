export async function uploadToDrive(params: { filename: string; content: string; mimeType?: string; folderId?: string }) {
  const res = await fetch('/api/google-drive/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || `Upload failed (${res.status})`)
  }
  return res.json() as Promise<{ success: boolean; file: { id: string; name: string; webViewLink?: string; webContentLink?: string } }>
}
