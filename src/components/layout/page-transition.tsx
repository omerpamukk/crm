"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { spring } from "@/lib/motion";

// İlk yüklemede içerik gizli başlamasın (sunucu çıktısı hemen görünür);
// yalnızca uygulama içi gezintide yumuşak giriş olur.
let hydrated = false;

/**
 * Sayfa içeriğine yumuşak giriş (rota değişince). Hareket azaltma açıksa
 * MotionConfig kaymayı kapatır, yalnızca opaklık kalır.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <Enter key={pathname}>{children}</Enter>;
}

function Enter({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => hydrated);
  useEffect(() => {
    hydrated = true;
  }, []);
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.default}
    >
      {children}
    </motion.div>
  );
}
