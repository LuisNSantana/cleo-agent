import * as React from "react"
import type { SVGProps } from "react"

const QwenIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={64}
    height={64}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="64" height="64" rx="12" fill="#1A73E8" />
    <path d="M20 44C20 32 44 32 44 44C44 32 20 32 20 44" stroke="#fff" strokeWidth="3" fill="none"/>
    <circle cx="32" cy="32" r="8" fill="#fff" />
  </svg>
)
export default QwenIcon
