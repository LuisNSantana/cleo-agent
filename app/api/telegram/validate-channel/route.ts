/**
 * Telegram Channel Validation API
 * Validates that the bot has admin access to a channel
 */

import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Bot token no configurado' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { channelUsername } = body

    if (!channelUsername || !channelUsername.startsWith('@')) {
      return NextResponse.json(
        { success: false, error: 'Username de canal inválido' },
        { status: 400 }
      )
    }

    // Get chat info
    const chatResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${channelUsername}`
    )

    const chatData = await chatResponse.json()

    if (!chatData.ok) {
      return NextResponse.json(
        {
          success: false,
          error: chatData.description || 'No se pudo acceder al canal. Verifica que sea público.'
        },
        { status: 400 }
      )
    }

    const chatId = chatData.result.id.toString()
    const memberCount = chatData.result.member_count || 0

    // Check bot membership and permissions
    const botResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${channelUsername}&user_id=${TELEGRAM_BOT_TOKEN.split(':')[0]}`
    )

    const botData = await botResponse.json()

    if (!botData.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'El bot @CleoPushBot no es miembro del canal. Añádelo como administrador.'
        },
        { status: 400 }
      )
    }

    const member = botData.result
    const isAdmin = member.status === 'administrator' || member.status === 'creator'

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'El bot debe ser administrador del canal'
        },
        { status: 400 }
      )
    }

    // Check post permission
    const canPost = member.can_post_messages !== false

    if (!canPost) {
      return NextResponse.json(
        {
          success: false,
          error: 'El bot necesita permiso de "Publicar Mensajes"'
        },
        { status: 400 }
      )
    }

    // All validations passed
    return NextResponse.json({
      success: true,
      chatId,
      memberCount,
      channelType: chatData.result.type,
      title: chatData.result.title
    })

  } catch (error: any) {
    console.error('❌ Telegram validation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al validar el canal'
      },
      { status: 500 }
    )
  }
}
