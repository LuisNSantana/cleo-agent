/**
 * Telegram Channel Manager Component
 * Allows users to add, view, and manage their Telegram channels
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Trash2, Plus, RefreshCw, Check, X, Users } from 'lucide-react'
import { toast } from 'sonner'

interface TelegramChannel {
  id: string
  channel_username: string
  channel_name: string
  chat_id: string | null
  member_count: number | null
  is_active: boolean
  created_at: string
}

export function TelegramChannelManager() {
  const [channels, setChannels] = useState<TelegramChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [validating, setValidating] = useState(false)
  
  // Form state
  const [channelUsername, setChannelUsername] = useState('')
  const [channelName, setChannelName] = useState('')

  // Load channels
  useEffect(() => {
    loadChannels()
  }, [])

  async function loadChannels() {
    try {
      const supabase = createClient()
      if (!supabase) {
        toast.error('Supabase no está configurado')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('telegram_channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChannels(data || [])
    } catch (error: any) {
      console.error('Error loading channels:', error)
      toast.error('Error al cargar canales')
    } finally {
      setLoading(false)
    }
  }

  async function validateAndAddChannel() {
    if (!channelUsername.trim() || !channelName.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    if (!channelUsername.startsWith('@')) {
      toast.error('El username debe empezar con @')
      return
    }

    setValidating(true)

    try {
      // Validate bot access via API
      const response = await fetch('/api/telegram/validate-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUsername })
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.error || 'Error al validar el canal')
        return
      }

      // Add to database
      const supabase = createClient()
      if (!supabase) {
        toast.error('Supabase no está configurado')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('telegram_channels')
        .insert({
          user_id: user.id,
          channel_username: channelUsername,
          channel_name: channelName,
          chat_id: result.chatId,
          member_count: result.memberCount,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('Este canal ya está registrado')
        } else {
          throw error
        }
        return
      }

      toast.success('✅ Canal añadido exitosamente!')
      setChannels(prev => [data, ...prev])
      setChannelUsername('')
      setChannelName('')
      setAdding(false)

    } catch (error: any) {
      console.error('Error adding channel:', error)
      toast.error(error.message || 'Error al añadir canal')
    } finally {
      setValidating(false)
    }
  }

  async function removeChannel(channelId: string) {
    try {
      const supabase = createClient()
      if (!supabase) {
        toast.error('Supabase no está configurado')
        return
      }

      const { error } = await supabase
        .from('telegram_channels')
        .update({ is_active: false })
        .eq('id', channelId)

      if (error) throw error

      toast.success('Canal eliminado')
      setChannels(prev => prev.filter(c => c.id !== channelId))
    } catch (error: any) {
      console.error('Error removing channel:', error)
      toast.error('Error al eliminar canal')
    }
  }

  async function refreshChannel(channel: TelegramChannel) {
    try {
      const response = await fetch('/api/telegram/validate-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUsername: channel.channel_username })
      })

      const result = await response.json()

      if (!result.success) {
        toast.error('No se pudo actualizar el canal')
        return
      }

      const supabase = createClient()
      if (!supabase) {
        toast.error('Supabase no está configurado')
        return
      }

      const { error } = await supabase
        .from('telegram_channels')
        .update({
          member_count: result.memberCount,
          chat_id: result.chatId
        })
        .eq('id', channel.id)

      if (error) throw error

      toast.success('Canal actualizado')
      loadChannels()
    } catch (error: any) {
      console.error('Error refreshing channel:', error)
      toast.error('Error al actualizar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Channel Form */}
      {!adding ? (
        <Button 
          onClick={() => setAdding(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir Canal
        </Button>
      ) : (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Añadir Canal de Telegram</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setAdding(false)
                setChannelUsername('')
                setChannelName('')
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="username">Username del Canal</Label>
              <Input
                id="username"
                placeholder="@mi_canal"
                value={channelUsername}
                onChange={(e) => setChannelUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Debe empezar con @ (ej: @noticias_cleo)
              </p>
            </div>

            <div>
              <Label htmlFor="name">Nombre Descriptivo</Label>
              <Input
                id="name"
                placeholder="Canal de Noticias"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">⚠️ Requisitos:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>El bot <strong>@CleoPushBot</strong> debe ser administrador del canal</li>
                <li>Debe tener permisos de "Publicar Mensajes"</li>
                <li>El canal debe ser público con username</li>
              </ol>
            </div>

            <Button 
              onClick={validateAndAddChannel}
              disabled={validating}
              className="w-full"
            >
              {validating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Validar y Añadir
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Channels List */}
      {channels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tienes canales configurados</p>
          <p className="text-sm mt-2">Añade un canal para comenzar a publicar contenido</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((channel) => (
            <Card key={channel.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{channel.channel_name}</h4>
                    {channel.chat_id && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        Verificado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {channel.channel_username}
                  </p>
                  {channel.member_count !== null && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Users className="w-3 h-3" />
                      {channel.member_count.toLocaleString()} suscriptores
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refreshChannel(channel)}
                    title="Actualizar información"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChannel(channel.id)}
                    title="Eliminar canal"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
