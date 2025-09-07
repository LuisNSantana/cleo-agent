// Small helpers for Agent Tasks system

export function resolveBuiltInAvatar(name?: string, avatar?: string) {
  if (avatar && /(png|jpg|jpeg|gif|webp)$/i.test(avatar)) return avatar
  if (avatar && avatar.startsWith('/img/agents/')) return avatar
  const map: Record<string, string> = {
    'emma': '/img/agents/emma4.png',
    'wex': '/img/agents/wex4.png',
    'toby': '/img/agents/toby4.png',
    'peter': '/img/agents/peter4.png',
    'apu': '/img/agents/apu4.png',
    'ami': '/img/agents/ami4.png',
    'cleo': '/img/agents/logocleo4.png'
  }
  const key = (name || '').toLowerCase().trim()
  return map[key] || '/img/agents/logocleo4.png'
}
