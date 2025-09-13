import * as React from "react"
import type { SVGProps } from "react"

// Official Nvidia logo SVG (stylized eye)
const NvidiaIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="48" height="48" rx="10" fill="#76B900" />
    <g>
      <path d="M12 24c8-8 16-8 24 0-8 0-16 8-24 0z" fill="#fff"/>
      <path d="M24 24c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z" fill="#76B900"/>
      <path d="M24 28a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="#fff"/>
    </g>
  </svg>
)
export default NvidiaIcon
