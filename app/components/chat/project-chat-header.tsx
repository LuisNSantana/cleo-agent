"use client"

import { ArrowLeft, FolderOpen } from "@phosphor-icons/react"
import Link from "next/link"
import { motion } from "framer-motion"

interface ProjectChatHeaderProps {
  projectId: string
  projectName: string
}

export function ProjectChatHeader({ projectId, projectName }: ProjectChatHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-[calc(var(--spacing-app-header)+12px)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3"
    >
      {/* Project Badge */}
      <div className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-2 backdrop-blur-sm">
        <FolderOpen className="text-purple-400" size={18} weight="duotone" />
        <span className="text-sm font-medium text-purple-300">
          {projectName}
        </span>
      </div>

      {/* Back to Project Button */}
      <Link
        href={`/p/${projectId}`}
        className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 backdrop-blur-sm transition-all hover:bg-accent/50 hover:border-accent"
      >
        <ArrowLeft size={16} weight="bold" />
        <span className="text-sm font-medium">Volver al proyecto</span>
      </Link>
    </motion.div>
  )
}
