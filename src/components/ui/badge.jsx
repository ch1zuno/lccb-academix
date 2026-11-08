import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-ink text-paper",
    secondary: "bg-gold text-ink",
    destructive: "bg-surface-alert text-crimson",
    outline: "bg-paper text-ink",
    emerald: "bg-surface-highlight text-emerald",
    amber: "bg-surface-quiet text-amber",
  }

  return (
    <div
      className={cn(
        "inline-flex h-6 items-center rounded-none border-2 border-ink px-2 text-[13px] font-semibold leading-none transition-colors focus:outline-none",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
