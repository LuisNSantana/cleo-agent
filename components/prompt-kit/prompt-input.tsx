"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

type PromptInputContextType = {
  isLoading: boolean
  value: string
  setValue: (value: string) => void
  maxHeight: number | string
  onSubmit?: () => void
  disabled?: boolean
}

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
})

function usePromptInput() {
  const context = useContext(PromptInputContext)
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput")
  }
  return context
}

type PromptInputProps = {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  maxHeight?: number | string
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  animatedBorder?: boolean
}

function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
  animatedBorder = false,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "")

  const handleChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <PromptInputContext.Provider
      value={{
        isLoading,
        value: value ?? internalValue,
        setValue: onValueChange ?? handleChange,
        maxHeight,
        onSubmit,
      }}
    >
      <div className="relative group rounded-3xl">
        {/* Animated Border Background */}
        {animatedBorder && (
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-70 group-focus-within:opacity-100 transition-opacity duration-300 animate-gradient-xy group-focus-within:animate-gradient-xy-fast"></div>
        )}
        {/* Glow effect on focus */}
        {animatedBorder && (
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-cyan-400/0 via-blue-500/0 to-purple-600/0 group-focus-within:from-cyan-400/20 group-focus-within:via-blue-500/20 group-focus-within:to-purple-600/20 blur-md transition-all duration-300 opacity-0 group-focus-within:opacity-100"></div>
        )}
        
        <div
          className={cn(
            "relative bg-background rounded-3xl p-2 shadow-xs transition-all",
            // Animated border styles
            animatedBorder && "bg-white/90 dark:bg-black/90 backdrop-blur-xl", 
            className
          )}
        >
          {children}
        </div>
      </div>
    </PromptInputContext.Provider>
  )
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean
} & React.ComponentProps<typeof Textarea>

function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (disableAutosize || !textareaRef.current) return

    // Reset height to auto first to properly measure scrollHeight
    textareaRef.current.style.height = "auto"

    // Set the height based on content
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [value, disableAutosize])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  const maxHeightStyle =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight

  return (
    <Textarea
      ref={textareaRef}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "min-h-[44px] w-full resize-none bg-transparent shadow-none",
        "border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-none", 
        "placeholder:text-muted-foreground",
        "overflow-y-auto",
        className
      )}
      style={{
        maxHeight: maxHeightStyle,
      }}
      rows={1}
      disabled={disabled}
      {...props}
    />
  )
}

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  )
}

type PromptInputActionProps = {
  className?: string
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
} & React.ComponentProps<typeof Tooltip>

function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput()

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
}
