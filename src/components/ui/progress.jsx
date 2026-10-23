import * as React from "react"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative h-2.5 w-full overflow-hidden rounded-none border-2 border-ink bg-paper", className)}
    {...props}
  >
    <div
      className={cn("h-full w-full flex-1 bg-gold transition-transform duration-500", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
