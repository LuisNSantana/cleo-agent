import { useEffect, useState } from 'react'

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    supportsPencil: false,
    supportsTouch: false,
    isIOS: false,
    isMobile: false
  })

  useEffect(() => {
    // Detectar capacidades del dispositivo
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isMobile = window.innerWidth <= 768 || hasTouch
    
    // Apple Pencil detection (aproximada)
    const supportsPencil = isIOS && hasTouch && window.PointerEvent !== undefined
    
    setCapabilities({
      supportsPencil,
      supportsTouch: hasTouch,
      isIOS,
      isMobile
    })

    console.log('[DeviceCapabilities]', {
      supportsPencil,
      supportsTouch: hasTouch,
      isIOS,
      isMobile
    })
  }, [])

  return capabilities
}