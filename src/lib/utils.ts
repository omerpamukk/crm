import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge, tasarım sistemindeki özel metin boyutlarını (globals.css →
 * --text-*) tanısın: yoksa `text-headline` bir renk sanılır ve yanındaki
 * `text-label` ile çakışıp silinir.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["large-title", "title-2", "title-3", "headline", "body", "callout", "subhead", "footnote", "caption"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
