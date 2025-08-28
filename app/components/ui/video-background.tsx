"use client"

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface VideoBackgroundProps {
  src: string
  className?: string
  overlayOpacity?: number
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
}

export function VideoBackground({
  src,
  className,
  overlayOpacity = 0.6,
  autoPlay = true,
  muted = true,
  loop = true,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    console.log('🎬 VideoBackground: Loading video from:', src)

    const handleLoadedData = () => {
      console.log('✅ Video loaded successfully')
      setVideoLoaded(true)
      setVideoError(false)
    }

    const handleError = (e: Event) => {
      console.error('❌ Video failed to load:', src, e)
      setVideoError(true)
      setVideoLoaded(false)
    }

    const handleCanPlay = () => {
      console.log('🎥 Video can play')
      if (autoPlay) {
        video.play().catch((error) => {
          console.warn('⚠️ Autoplay failed:', error)
        })
      }
    }

    const handleLoadStart = () => {
      console.log('📹 Video load started')
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('error', handleError)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadstart', handleLoadStart)

    // Force load
    video.load()

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('error', handleError)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadstart', handleLoadStart)
    }
  }, [src, autoPlay])

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden z-0",
        className
      )}
      aria-hidden
    >
      {/* Video Background */}
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          "transition-opacity duration-1000",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        disablePictureInPicture
        controls={false}
        preload="auto"
        style={{
          filter: 'brightness(0.6) contrast(1.2) saturate(1.1)',
        }}
      />

      {/* Fallback background if video fails or loading */}
      {(videoError || !videoLoaded) && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800" />
      )}

      {/* Overlay for text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"
        style={{ opacity: overlayOpacity }}
      />

      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
    </div>
  )
}