import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user basic info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    // Get user's chats
    const { data: userChats, error: chatsError } = await supabase
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching user chats:', chatsError);
    }

    // Get user's messages with model info
    const { data: userMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, role, model, created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching user messages:', messagesError);
    }

    // Calculate stats from existing data
    const totalMessages = userMessages?.filter(m => m.role === 'user').length || 0;
    const totalChats = userChats?.length || 0;
    const todayMessages = userMessages?.filter(m => 
      m.role === 'user' && 
      m.created_at &&
      new Date(m.created_at).toDateString() === new Date().toDateString()
    ).length || 0;

    // Calculate model usage
    const modelUsage = userMessages?.reduce((acc, message) => {
      if (message.role === 'assistant' && message.model) {
        if (!acc[message.model]) {
          acc[message.model] = {
            count: 0,
            name: message.model
          };
        }
        acc[message.model].count++;
      }
      return acc;
    }, {} as Record<string, { count: number; name: string }>) || {};

    // Calculate daily usage for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const dailyUsage = last7Days.map(date => {
      const dayMessages = userMessages?.filter(m => 
        m.role === 'user' && 
        m.created_at &&
        new Date(m.created_at).toISOString().split('T')[0] === date
      ).length || 0;

      return {
        date,
        messages: dayMessages
      };
    }).reverse();

    // Get recent active chats (last 5)
    const recentChats = userChats?.slice(0, 5).map(chat => ({
      id: chat.id,
      title: chat.title || 'Untitled Chat',
      created_at: chat.created_at,
      updated_at: chat.updated_at
    })) || [];

    return NextResponse.json({
      userStats: {
        total_messages: totalMessages,
        total_chats: totalChats,
        today_messages: todayMessages,
        daily_limit: userData?.daily_message_count || 0,
        member_since: userData?.created_at,
        last_active: userData?.last_active_at
      },
      modelUsage: Object.values(modelUsage),
      dailyUsage,
      recentChats
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
