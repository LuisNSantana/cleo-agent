import * as React from "react"
import type { SVGProps } from "react"

const NvidiaIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={64}
    height={64}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="64" height="64" rx="12" fill="#76B900" />
    <path d="M16 32C32 16 48 32 32 48C32 32 48 32 32 32" stroke="#fff" strokeWidth="3" fill="none"/>
    <circle cx="32" cy="32" r="6" fill="#fff" />
  </svg>
)
export default NvidiaIcon
