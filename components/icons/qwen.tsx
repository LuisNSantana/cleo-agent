import * as React from "react"
import type { SVGProps } from "react"

// Official Qwen AI logo SVG (stylized Q with swirl)
const QwenIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="48" height="48" rx="10" fill="#1A73E8" />
    <g>
      <circle cx="24" cy="24" r="12" fill="#fff" />
      <path d="M24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12c0 2.485-.757 4.793-2.05 6.7l3.35 3.35c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0l-3.35-3.35A11.95 11.95 0 0 1 24 36z" fill="#1A73E8"/>
    </g>
  </svg>
)
export default QwenIcon
