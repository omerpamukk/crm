"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";

/**
 * Kök sağlayıcılar.
 * - Tema: varsayılan sistem; kullanıcı menüsünden Açık / Koyu / Sistem.
 *   next-themes ilk boyamadan önce sınıfı yazar (yanıp sönme yok).
 * - Hareket: kullanıcı hareket azaltmayı açtıysa motion kayma/ölçek
 *   animasyonlarını kapatır, opaklık geçişleri kalır.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
