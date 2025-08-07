import * as React from "react"
import type { SVGProps } from "react"

const Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="#000"
      d="M4 4v16h16V7.621L16.379 4H4zm12.621 3L20 10.379V20H4V4h12.621zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"
    />
    <path
      fill="#000"
      d="M6 6h2v2H6V6zm4 0h6v2h-6V6z"
    />
  </svg>
)

export default Icon
