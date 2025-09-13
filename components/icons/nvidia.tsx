import * as React from "react"
import type { SVGProps } from "react"

// Aproximación corregida del logo de NVIDIA (ojo estilizado)
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
      <circle cx="24" cy="24" r="4" fill="#76B900" />
    </g>
  </svg>
)
export default NvidiaIcon