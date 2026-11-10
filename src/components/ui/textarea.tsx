import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full px-3 py-2 text-base text-label md:text-[0.875rem] bg-fill border border-transparent rounded-[var(--radius-ctl)] transition-[background-color,box-shadow,border-color] duration-150 outline-none placeholder:text-label-3 hover:bg-fill-2 focus-visible:bg-surface focus-visible:border-[color:var(--primary)] focus-visible:shadow-[0_0_0_3px_var(--focus)] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-danger aria-invalid:shadow-[0_0_0_3px_var(--danger-soft-2)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
