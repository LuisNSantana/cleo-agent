import { fetcher } from '@/lib/fetch'

export interface DocumentRecord {
  id: string
  filename: string
  title: string | null
  content_md?: string
  content_html?: string | null
  updated_at?: string
  created_at?: string
  chat_id?: string | null
  project_id?: string | null
}

export async function createDocument(input: { filename: string; title?: string; content_md?: string; content_html?: string; chat_id?: string; project_id?: string }) {
  const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!res.ok) throw new Error('Failed to create document')
  return res.json() as Promise<DocumentRecord>
}

export async function listDocuments() {
  const res = await fetch('/api/documents')
  if (!res.ok) throw new Error('Failed to list documents')
  return res.json() as Promise<DocumentRecord[]>
}

export async function getDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`)
  if (!res.ok) throw new Error('Failed to fetch document')
  return res.json() as Promise<DocumentRecord>
}

export async function updateDocument(id: string, patch: Partial<Pick<DocumentRecord, 'filename' | 'title'> & { content_md?: string; content_html?: string; tokens_estimated?: number }>) {
  const res = await fetch(`/api/documents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  if (!res.ok) throw new Error('Failed to update document')
  return res.json() as Promise<DocumentRecord>
}

export async function deleteDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete document')
  return res.json() as Promise<{ success: boolean }>
}
