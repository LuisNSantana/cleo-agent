'use client'

import dynamic from 'next/dynamic'

const SerpapiCredentialsManager = dynamic(()=>import('@/components/serpapi/serpapi-credentials-manager').then(m=>m.SerpapiCredentialsManager), { ssr:false })

export function SerpapiPage(){
  return <div className="max-w-2xl mx-auto py-8 space-y-6">
    <div>
      <h2 className="text-2xl font-bold">SerpAPI Credentials</h2>
      <p className="text-sm text-muted-foreground">Configura la clave utilizada por el agente Apu para búsquedas (Google, News, Scholar, Maps).</p>
    </div>
    <SerpapiCredentialsManager />
  </div>
}
