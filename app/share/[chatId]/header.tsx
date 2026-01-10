import Link from "next/link"
import React from "react"

export function Header() {
  return (
    <header className="app-fixed-header">
      {/* Mobile mask (optional subtle fade) */}
      <div className="pointer-events-none absolute inset-0 lg:hidden [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="bg-background relative mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <Link href="/" className="text-xl font-medium tracking-tight">
          Ankie
        </Link>
      </div>
    </header>
  )
}
