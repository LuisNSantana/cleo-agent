"use client"

import { AnimatePresence } from "motion/react"
import React, { memo } from "react"
import { Suggestions } from "../chat-input/suggestions"

type PromptSystemProps = {
  onValueChangeAction: (value: string) => void
  onSuggestionAction: (suggestion: string) => void
  value: string
}

export const PromptSystem = memo(function PromptSystem({
  onValueChangeAction,
  onSuggestionAction,
  value,
}: PromptSystemProps) {
  return (
    <>
      <div className="relative order-1 w-full md:absolute md:bottom-[-70px] md:order-2 md:h-[70px]">
        <AnimatePresence mode="popLayout">
          <Suggestions
            onValueChangeAction={onValueChangeAction}
            onSuggestionAction={onSuggestionAction}
            value={value}
          />
        </AnimatePresence>
      </div>
    </>
  )
})
