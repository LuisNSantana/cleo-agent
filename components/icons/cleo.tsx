import * as React from "react"
import type { SVGProps } from "react"
import Image from "next/image"

interface CleoIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  width?: number;
  height?: number;
  size?: number;
}

export function CleoIcon({ width, height, size = 24, className = "" }: CleoIconProps) {
  const iconWidth = width ?? size;
  const iconHeight = height ?? size;
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ 
        width: `${iconWidth}px`, 
        height: `${iconHeight}px`,
        minWidth: `${iconWidth}px`,
        minHeight: `${iconHeight}px`
      }}
    >
      <Image
        src="/logocleo.png"
        alt="Cleo"
        width={iconWidth}
        height={iconHeight}
        className="object-contain"
        priority
        unoptimized={false}
      />
    </div>
  )
}
