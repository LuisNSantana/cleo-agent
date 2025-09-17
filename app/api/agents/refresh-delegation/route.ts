/**
 * Refresh Delegation API Route
 * Actualiza las herramientas de delegación de Cleo para incluir agentes del usuario
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // Obtener el usuario actual desde las cookies de sesión
    const supabaseAuth = await createServerClient()
    if (!supabaseAuth) {
      return NextResponse.json({ error: 'Failed to create auth client' }, { status: 500 })
    }
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Usar el service role client para operaciones de base de datos
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Buscar el agente Cleo del usuario
    const { data: cleoAgent, error: cleoError } = await supabaseAdmin
      .from('agents')
      .select('id, name, tools, user_id')
      .eq('user_id', userId)
      .eq('name', 'Cleo')
      .eq('is_active', true)
      .single()

    if (cleoError || !cleoAgent) {
      return NextResponse.json(
        { error: `No se encontró el agente Cleo para el usuario ${userId}` },
        { status: 404 }
      )
    }

    // 2. Buscar todos los agentes activos del usuario (excluyendo Cleo y sub-agentes)
    const { data: userAgents, error: userAgentsError } = await supabaseAdmin
      .from('agents')
      .select('id, name, description, tags, user_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('name', 'Cleo')
      .eq('is_sub_agent', false)

    if (userAgentsError) {
      return NextResponse.json(
        { error: 'Error obteniendo agentes del usuario' },
        { status: 500 }
      )
    }

    // 3. Generar herramientas de delegación dinámicas
    const currentTools: string[] = cleoAgent.tools || []
    const baseDelegationTools = currentTools.filter((tool: string) => 
      tool.startsWith('delegate_to_') && 
      ['delegate_to_toby', 'delegate_to_ami', 'delegate_to_peter', 'delegate_to_emma', 'delegate_to_apu'].includes(tool)
    )
    
    // Herramientas no relacionadas con delegación
    const nonDelegationTools = currentTools.filter((tool: string) => !tool.startsWith('delegate_to_'))

    // Generar nuevas herramientas de delegación dinámicas
    const userDelegationTools: string[] = []
    
    if (userAgents && userAgents.length > 0) {
      for (const agent of userAgents) {
        const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
        userDelegationTools.push(toolName)
      }
    }

    // 4. Combinar todas las herramientas
    const updatedTools = [
      ...nonDelegationTools,      // Herramientas existentes no-delegación
      ...baseDelegationTools,     // Delegación estática (toby, ami, peter, etc.)
      ...userDelegationTools      // Delegación dinámica (agentes del usuario)
    ]

    // 5. Actualizar Cleo con las nuevas herramientas en la base de datos
    const { error: updateError } = await supabaseAdmin
      .from('agents')
      .update({ tools: updatedTools })
      .eq('id', cleoAgent.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Error actualizando herramientas de Cleo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Herramientas de delegación de Cleo actualizadas exitosamente',
      cleoId: cleoAgent.id,
      totalTools: updatedTools.length,
      userDelegationTools: userDelegationTools.length
    })

  } catch (error) {
    console.error('Error in refresh-delegation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}