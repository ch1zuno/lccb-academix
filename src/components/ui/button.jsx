import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  const variants = {
    default: "border-ink bg-gold text-ink hover:bg-accent",
    destructive: "border-ink bg-crimson text-destructive-foreground hover:opacity-90",
    outline: "border-ink bg-transparent text-ink hover:bg-paper",
    secondary: "border-ink bg-paper text-ink hover:bg-surface-quiet",
    soft: "border-ink bg-muted text-ink hover:bg-surface-highlight",
    ghost: "border-transparent bg-transparent text-ink shadow-none hover:bg-muted hover:shadow-none",
    link: "h-auto min-h-0 border-transparent bg-transparent p-0 text-ink underline decoration-gold decoration-2 underline-offset-4 shadow-none hover:decoration-ink hover:shadow-none",
  }

  const sizes = {
    default: "min-h-11 px-4 text-[14px] lg:min-h-0 lg:h-10",
    sm: "min-h-11 px-3 text-[13px] lg:min-h-0 lg:h-8",
    lg: "min-h-12 px-6 text-[15px]",
    icon: "min-h-11 min-w-11 p-0 lg:min-h-0 lg:min-w-0 lg:h-9 lg:w-9",
  }

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-2 font-semibold tracking-[-0.01em] shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)] transition-[transform,box-shadow,background-color,color] duration-150 hover:-translate-y-px hover:shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
