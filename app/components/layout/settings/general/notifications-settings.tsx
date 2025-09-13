"use client"

import { useEffect, useState, useCallback } from "react"
import { Switch } from "@/components/ui/switch"

export function NotificationsSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
    setSupported(isSupported)
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
    if (!isSupported) return
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setEnabled(!!sub && Notification.permission === 'granted')
      } catch {
        // ignore
      }
    })()
  }, [])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = typeof window === 'undefined' ? Buffer.from(base64, 'base64').toString('binary') : atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  const subscribe = useCallback(async () => {
    if (!supported || loading) return
    setLoading(true)
    try {
      if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission()
        setPermission(p)
        if (p !== 'granted') { setEnabled(false); return }
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) { setEnabled(true); return }

      const res = await fetch('/api/push/public-key')
      if (!res.ok) { return }
      const { key } = await res.json()
      const applicationServerKey = urlBase64ToUint8Array(key)

      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent })
      })
      setEnabled(true)
    } finally {
      setLoading(false)
    }
  }, [supported, loading])

  const unsubscribe = useCallback(async () => {
    if (!supported || loading) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        try {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
          })
        } catch { /* noop */ }
        try { await sub.unsubscribe() } catch { /* noop */ }
      }
      setEnabled(false)
    } finally {
      setLoading(false)
    }
  }, [supported, loading])

  const onToggle = (next: boolean) => {
    if (!supported) return
    if (permission === 'denied') return
    if (next) subscribe()
    else unsubscribe()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Notificaciones push</h3>
          <p className="text-xs text-muted-foreground">Recibe avisos cuando tus agentes completen tareas programadas.</p>
          {!supported && (
            <p className="mt-2 text-xs text-amber-600">Tu navegador no soporta notificaciones push.</p>
          )}
          {permission === 'denied' && (
            <p className="mt-2 text-xs text-amber-600">Has bloqueado las notificaciones en el navegador. Habilítalas en la configuración del sitio.</p>
          )}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={!supported || loading || permission === 'denied'}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Estado: {supported ? (permission === 'denied' ? 'Bloqueadas' : (enabled ? 'Activadas' : 'Desactivadas')) : 'No soportado'}
      </p>
    </div>
  )
}
