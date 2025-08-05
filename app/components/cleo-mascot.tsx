"use client";

import { motion } from "motion/react";
import Image from "next/image";

export function CleoMascot() {
  return (
    <motion.div
      className="flex justify-center"
      animate={{ rotate: [-8, 8, -8] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <Image
        src="/cleo-logo.svg"
        alt="Cleo logo"
        width={120}
        height={120}
        priority
      />
    </motion.div>
  );
}
