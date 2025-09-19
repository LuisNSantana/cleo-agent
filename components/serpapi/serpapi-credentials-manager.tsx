"use client";
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { Key, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { SerpAPISetupGuide } from './serpapi-setup-guide'

interface SerpKeyMeta { id: string; label: string; is_active: boolean; created_at: string }

export function SerpapiCredentialsManager(){
  const [keys,setKeys]=useState<SerpKeyMeta[]>([])
  const [loading,setLoading]=useState(false)
  const [apiKey,setApiKey]=useState('')
  const [label,setLabel]=useState('primary')
  const [testing,setTesting]=useState(false)
  const [testStatus,setTestStatus]=useState<null|{success:boolean;error?:string}> (null)

  async function load(){
    setLoading(true)
    try {
      const r = await fetch('/api/serpapi/credentials')
      const j = await r.json()
      if(j.success) setKeys(j.keys||[])
      else throw new Error(j.error||'Failed to load')
    } catch(e){
      toast({ title:'Error', description:'Failed to load SerpAPI credentials', status:'error' })
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function testKey(){
    if(!apiKey.trim()) return
    setTesting(true); setTestStatus(null)
    try{
      const r = await fetch('/api/serpapi/test',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ api_key: apiKey.trim() }) })
      const j = await r.json(); setTestStatus(j)
      if(j.success) toast({ title:'Valid', description:'API key looks valid', status:'success' })
      else toast({ title:'Invalid key', description:j.error||'Test failed', status:'error' })
    } finally { setTesting(false) }
  }

  async function save(){
    if(!apiKey.trim()) return
    try{
      const r = await fetch('/api/serpapi/credentials',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ api_key: apiKey.trim(), label }) })
      const j = await r.json()
      if(j.success){
        toast({ title:'Saved', description:'SerpAPI key stored and set active' })
        setApiKey(''); setTestStatus(null); load()
      } else {
        throw new Error(j.error||'Failed to save')
      }
    } catch(e){
      toast({ title:'Error', description: e instanceof Error ? e.message : 'Failed to save key', status:'error' })
    }
  }

  async function remove(id:string){
    if(!confirm('Eliminar clave SerpAPI?')) return
    try{
      const r = await fetch(`/api/serpapi/credentials?id=${id}`,{ method:'DELETE' })
      const j = await r.json().catch(()=>({}))
      if(r.ok){ toast({ title:'Deleted', description:'SerpAPI key removed' }); load() }
      else throw new Error((j as any)?.error||'Failed to delete')
    } catch(e){ toast({ title:'Error', description: e instanceof Error ? e.message : 'Failed to delete', status:'error' }) }
  }

  return (
    <Card className="border-slate-700/50 bg-slate-800/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shadow">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>SerpAPI</CardTitle>
            <CardDescription>API key for Apu (Google, News, Scholar, Maps)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SerpAPISetupGuide />
        <div className="grid gap-2">
          <Label htmlFor="serpapi-key">API Key</Label>
          <Input id="serpapi-key" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="serpapi_api_key" type="password" />
          <div className="flex items-center gap-2">
            <Input value={label} onChange={e=>setLabel(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={testKey} disabled={!apiKey || testing}>
              {testing ? 'Testing…' : 'Test'}
            </Button>
            <Button onClick={save} disabled={!apiKey || (testStatus ? !testStatus.success : false)}>
              Save
            </Button>
            {testStatus && (
              <span className={`inline-flex items-center gap-1 text-sm ${testStatus.success? 'text-green-400':'text-red-400'}`}>
                {testStatus.success ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                {testStatus.success ? 'Valid' : (testStatus.error || 'Invalid')}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Stored keys</div>
          {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!loading && keys.length===0 && <div className="text-xs text-muted-foreground">No keys stored.</div>}
          <ul className="space-y-2">
            {keys.map(k=> (
              <li key={k.id} className="flex items-center justify-between text-sm bg-slate-900/40 border border-slate-700/50 rounded px-3 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.label}</span>
                    {k.is_active && <span className="text-xs text-green-400">(active)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">created {new Date(k.created_at).toLocaleDateString()}</div>
                </div>
                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={()=>remove(k.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-muted-foreground border-t border-slate-700/50 pt-3">
          Keys are encrypted and only used by Apu’s SerpAPI tools.
        </div>
      </CardContent>
    </Card>
  )
}

export default SerpapiCredentialsManager