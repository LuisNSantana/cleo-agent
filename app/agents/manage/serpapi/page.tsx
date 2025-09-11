import type { Metadata } from 'next'

export function SerpapiPage() {
  return (
    <div>
      <h1>SerpAPI Credentials</h1>
      <p>Configure your SerpAPI credentials here.</p>
    </div>
  )
}

export const metadata: Metadata = { title: 'SerpAPI Credentials' }

export default function SerpapiManagePage(){
  return <SerpapiPage />
}