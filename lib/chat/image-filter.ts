import type { CoreMessage } from "ai"
import { MODEL_IMAGE_LIMITS } from "@/lib/image-management"

export function filterImagesByModelLimit(messages: CoreMessage[], model: string) {
  const imageLimit = MODEL_IMAGE_LIMITS[model]?.maxImages || MODEL_IMAGE_LIMITS.default.maxImages

  let totalImages = 0
  messages.forEach((msg) => {
    if (Array.isArray(msg.content)) {
      totalImages += msg.content.filter((part) => (part as any).type === 'image').length
    }
  })

  if (totalImages <= imageLimit) return messages

  const imageRefs: Array<{ msgIdx: number; partIdx: number; priority: number; isCanvas: boolean }> = []

  messages.forEach((msg, msgIdx) => {
    if (Array.isArray(msg.content)) {
      msg.content.forEach((part: any, partIdx: number) => {
        if (part.type === 'image') {
          const isCanvas = typeof part.image === 'string' && part.image.includes('data:image') && msg.role === 'user'
          const isRecent = msgIdx >= messages.length - 3
          let priority = 0
          if (isCanvas) priority += 100
          if (isRecent) priority += 50
          priority += msgIdx * 10
          imageRefs.push({ msgIdx, partIdx, priority, isCanvas })
        }
      })
    }
  })

  const keep = new Set(
    imageRefs
      .sort((a, b) => b.priority - a.priority)
      .slice(0, imageLimit)
      .map((ref) => `${ref.msgIdx}-${ref.partIdx}`)
  )

  const filtered = messages.map((msg, i) => {
    if (!Array.isArray(msg.content)) return msg
    const filteredContent: any[] = []
    msg.content.forEach((part: any, partIdx: number) => {
      if (part.type === 'image') {
        const key = `${i}-${partIdx}`
        if (keep.has(key)) filteredContent.push(part)
        else filteredContent.push({ type: 'text', text: '[Image removed due to model limit - Canvas drawings are prioritized]' })
      } else {
        filteredContent.push(part)
      }
    })
    return { ...msg, content: filteredContent }
  })

  return filtered
}
