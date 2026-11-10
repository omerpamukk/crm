/**
 * Hareket ön ayarları — E+F tasarım dili.
 *
 * Kural: her hareket bir yaydır; anlık değerden ve hızdan devam eder, her an
 * kesilip tersine çevrilebilir. Süre yerine yayın görsel süresi verilir.
 *
 * - `spring.default`  kritik sönümlü, sıçramasız (~0.35 sn). Açılır öğe,
 *   sayfa, kenar çubuğu, başparmak — varsayılan budur.
 * - `spring.momentum` fırlatma/sürükle-bırak sonrası; hafif sıçrama.
 * - `spring.snappy`   küçük öğe (rozet, mercek, onay işareti).
 * - `spring.exit`     kapanış biraz daha çabuk.
 * - Hareket azaltma açıksa `useMotionPreset` hepsini kısa yumuşak geçişe
 *   (`fade`) çevirir; kayma ve ölçek yerine yalnızca opaklık değişir.
 *
 * CSS tarafındaki karşılığı: globals.css → `--ease-spring`, `--dur-spring`,
 * `.pressable`, `.pop-anim`.
 */
import { useMemo } from "react";
import { useReducedMotion, type Transition } from "motion/react";

export const spring = {
  default: { type: "spring", visualDuration: 0.35, bounce: 0 },
  momentum: { type: "spring", visualDuration: 0.4, bounce: 0.18 },
  snappy: { type: "spring", visualDuration: 0.25, bounce: 0 },
  exit: { type: "spring", visualDuration: 0.28, bounce: 0 },
} as const satisfies Record<string, Transition>;

export type SpringPreset = keyof typeof spring;

/** Hareket azaltma açıkken kullanılan kısa yumuşak geçiş. */
export const fade: Transition = { duration: 0.16, ease: "easeOut" };

/**
 * Ön ayarı kullanıcının hareket tercihine göre döndürür.
 * `velocity` verilirse (sürükleme bırakıldığında) yay o hızdan devam eder.
 */
export function useMotionPreset() {
  const reduce = useReducedMotion() ?? false;
  return useMemo(
    () => ({
      reduce,
      transition(kind: SpringPreset = "default", velocity?: number): Transition {
        if (reduce) return fade;
        return velocity === undefined ? spring[kind] : { ...spring[kind], velocity };
      },
    }),
    [reduce]
  );
}

/** Bırakılan bir hareketin varacağı nokta (ivme yansıtması, UIScrollView ile aynı). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Sınır ötesine çekişte lastik bant direnci. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Listedeki en yakın değer (yakalama noktası seçimi). */
export function nearest(values: readonly number[], target: number): number {
  return values.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
}

/** Dokunmatik cihazda kısa titreşim (destekleniyorsa, kullanıcı etkileşiminden sonra). */
export function haptic(ms = 10): void {
  try {
    if (
      typeof navigator !== "undefined" &&
      "vibrate" in navigator &&
      (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
        ?.hasBeenActive
    ) {
      navigator.vibrate(ms);
    }
  } catch {
    // yok say
  }
}
