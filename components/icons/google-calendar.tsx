import React from 'react'

interface GoogleCalendarIconProps {
  className?: string
  size?: number
}

export function GoogleCalendarIcon({ className = '', size = 24 }: GoogleCalendarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calendar base */}
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        ry="2"
        fill="#4285f4"
        stroke="#1a73e8"
        strokeWidth="0.5"
      />
      
      {/* Calendar header */}
      <rect
        x="3"
        y="4"
        width="18"
        height="5"
        rx="2"
        ry="2"
        fill="#1a73e8"
      />
      
      {/* Spiral binding holes */}
      <circle cx="7" cy="2" r="1" fill="#9aa0a6" />
      <circle cx="17" cy="2" r="1" fill="#9aa0a6" />
      
      {/* Spiral binding */}
      <rect x="6.5" y="2" width="1" height="3" fill="#9aa0a6" />
      <rect x="16.5" y="2" width="1" height="3" fill="#9aa0a6" />
      
      {/* Calendar grid lines */}
      <line x1="6" y1="11" x2="18" y2="11" stroke="#e8eaed" strokeWidth="0.5" />
      <line x1="6" y1="14" x2="18" y2="14" stroke="#e8eaed" strokeWidth="0.5" />
      <line x1="6" y1="17" x2="18" y2="17" stroke="#e8eaed" strokeWidth="0.5" />
      <line x1="9" y1="9" x2="9" y2="20" stroke="#e8eaed" strokeWidth="0.5" />
      <line x1="12" y1="9" x2="12" y2="20" stroke="#e8eaed" strokeWidth="0.5" />
      <line x1="15" y1="9" x2="15" y2="20" stroke="#e8eaed" strokeWidth="0.5" />
      
      {/* Date number */}
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="6"
        fill="white"
        fontWeight="bold"
        fontFamily="system-ui"
      >
        15
      </text>
    </svg>
  )
}

export default GoogleCalendarIcon
