"use client"

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUp } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ScrollToTop() {
  const { scrollY } = useScroll()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest) => {
      setIsVisible(latest > 300)
    })
    return () => unsubscribe()
  }, [scrollY])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <Button
        size="icon"
        onClick={scrollToTop}
        className="h-12 w-12 rounded-full bg-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
      >
        <ArrowUp weight="bold" className="h-5 w-5" />
      </Button>
    </motion.div>
  )
}
