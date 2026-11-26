import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-11 w-full rounded-none border-2 border-ink bg-paper px-3 py-2 text-[14px] text-ink shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_rgba(15,41,66,0.16)] transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-[13px] file:font-semibold placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-gold)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
