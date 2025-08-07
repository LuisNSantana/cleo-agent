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
      fill="#4285F4"
      d="M7.71 4.04L1.65 12l6.06 7.96h8.58L22.35 12l-6.06-7.96H7.71z"
    />
    <path
      fill="#34A853"
      d="M19.77 7.5L12 2.5 4.23 7.5 12 12.5l7.77-5z"
    />
    <path
      fill="#FBBC04"
      d="M4.23 16.5L12 21.5l7.77-5L12 11.5l-7.77 5z"
    />
    <path
      fill="#EA4335"
      d="M12 11.5L4.23 7.5v9L12 11.5z"
    />
    <path
      fill="#34A853"
      d="M12 11.5l7.77-4.5v9L12 11.5z"
    />
  </svg>
)

export default Icon
