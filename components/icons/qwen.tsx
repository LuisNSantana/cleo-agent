import * as React from "react"
import type { SVGProps } from "react"

// Aproximación del logo de Qwen AI (estilizado como una Q con swoosh)
const QwenIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g>
      <path
        d="M28 12c4.418 0 8 3.582 8 8 0 1.657-.504 3.2-1.367 4.467-.867.867-2.133 2.533-3.633 4.033-2.5 2.5-5 4-8 4-6.627 0-12-5.373-12-12s5.373-12 12-12c1.657 0 3.2.504 4.467 1.367l-4.467 4.467c-.867-.867-2.133-2.533-3.633-4.033-2.5-2.5-5-4-8-4"
        fill="#1A73E8"
      />
    </g>
  </svg>
)
export default QwenIcon