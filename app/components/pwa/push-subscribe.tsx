"use client"

import { useEffect, useState } from 'react'

export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
  }, [])

  const subscribe = async () => {
    if (!supported) return
    if (loading) return
    setLoading(true)
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission()
      setPermission(p)
      if (p !== 'granted') return
    }
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) { setLoading(false); return }

    // Fetch VAPID public key from server
    const res = await fetch('/api/push/public-key')
    if (!res.ok) { setLoading(false); return }
    const { key } = await res.json()
    const applicationServerKey = urlBase64ToUint8Array(key)

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent })
    })
    setLoading(false)
  }

  if (!supported) return null
  return (
    <button onClick={subscribe} className="text-xs opacity-70 hover:opacity-100 underline">
      {loading ? 'Cargando…' : permission === 'granted' ? 'Push listo' : 'Habilitar notificaciones push'}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof window === 'undefined' ? Buffer.from(base64, 'base64').toString('binary') : atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
