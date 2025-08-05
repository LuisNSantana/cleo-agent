"use client";

import { motion } from "motion/react";
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
  
  return (
    <motion.div
      className="flex justify-center" style={{ transformOrigin: "bottom center" }}


    >
      <video
        src={mounted ? (isDark ? "/cleo_test3.mov" : "/cleo_light.mov") : "/cleo_test3.mov"}
        width={120}
        height={120}
        autoPlay
        loop
        muted
        playsInline
        className="mix-blend-darken dark:mix-blend-screen"
        style={{
          filter: 'contrast(1.2) brightness(1.1) hue-rotate(0deg)',
          backgroundColor: 'transparent'
        }}
      />
    </motion.div>
  );
}
