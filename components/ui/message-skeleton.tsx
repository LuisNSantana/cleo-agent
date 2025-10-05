import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MessageSkeletonProps {
  className?: string
  isUser?: boolean
}

export function MessageSkeleton({ className, isUser = false }: MessageSkeletonProps) {
  return (
    <div 
      className={cn(
        "px-4 py-6 animate-pulse",
        !isUser && "bg-muted/30",
        className
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar skeleton */}
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Name and timestamp */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          
          {/* Message lines */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  )
}

export function ChatLoadingState() {
  return (
    <div className="space-y-0">
      <MessageSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
    </div>
  )
}
