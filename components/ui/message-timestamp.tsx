import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface MessageTimestampProps {
  date: Date | string
  className?: string
}

export function MessageTimestamp({ date, className = "" }: MessageTimestampProps) {
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  const timeAgo = formatDistanceToNow(dateObj, { 
    addSuffix: true,
    locale: es 
  })
  
  return (
    <span 
      className={`text-xs text-muted-foreground ${className}`}
      title={dateObj.toLocaleString()}
    >
      {timeAgo}
    </span>
  )
}
