"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";


export function CleoMascot() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Prevent hydration mismatch by using fallback until mounted
  const isDark = mounted ? theme === 'dark' : true; // Default to dark
  const source = "/cleo_agent_video.mp4";
  
  return (
    <motion.div
      className="flex justify-center"
      style={{ transformOrigin: "bottom center" }}
    >
      <video
        src={source}
        width={180}
        height={180}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="pointer-events-none select-none"
        style={{
          // Make dark backgrounds treat black as transparent (screen),
          // and light backgrounds treat white as transparent (multiply)
          mixBlendMode: isDark ? 'screen' : 'multiply',
          // Feather the edges so it feels composited, not boxed
          WebkitMaskImage: 'radial-gradient(white, transparent 70%)',
          maskImage: 'radial-gradient(white, transparent 70%)',
          // Gentle pop without blowing highlights
          filter: 'contrast(1.15) brightness(1.12) saturate(1.05)',
          backgroundColor: 'transparent'
        }}
      />
    </motion.div>
  );
}
