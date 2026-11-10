import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 px-3 py-1 text-base text-label file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-label md:text-[0.875rem] bg-fill border border-transparent rounded-[var(--radius-ctl)] transition-[background-color,box-shadow,border-color] duration-150 outline-none placeholder:text-label-3 hover:bg-fill-2 focus-visible:bg-surface focus-visible:border-[color:var(--primary)] focus-visible:shadow-[0_0_0_3px_var(--focus)] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-danger aria-invalid:shadow-[0_0_0_3px_var(--danger-soft-2)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
