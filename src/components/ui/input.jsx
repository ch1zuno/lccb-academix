import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-none border-2 border-ink bg-paper px-3 py-2 text-[14px] text-ink shadow-[3px_3px_0_rgba(15,41,66,0.16)] transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-[13px] file:font-semibold placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:shadow-[4px_4px_0_#d4ac0d] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
