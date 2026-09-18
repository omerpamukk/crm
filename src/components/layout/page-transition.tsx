"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

/**
 * Sayfa içeriğine yumuşak giriş animasyonu. Rota değişince yeniden
 * tetiklenir (key={pathname}). prefers-reduced-motion açıksa
 * globals.css süreleri kıstığı için pratikte anında görünür.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
