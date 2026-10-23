import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  const variants = {
    default: "border-ink bg-gold text-ink hover:bg-[#e3bb19]",
    destructive: "border-ink bg-[#b43122] text-[#fff9ee] hover:bg-[#9d291c]",
    outline: "border-ink bg-transparent text-ink hover:bg-paper",
    secondary: "border-ink bg-paper text-ink hover:bg-[#f6eedc]",
    soft: "border-ink bg-[#eee5d3] text-ink hover:bg-[#e5dac3]",
    ghost: "border-transparent bg-transparent text-ink shadow-none hover:bg-[#e9e1d1] hover:shadow-none",
    link: "h-auto border-transparent bg-transparent p-0 text-ink underline decoration-gold decoration-2 underline-offset-4 shadow-none hover:decoration-ink hover:shadow-none",
  }

  const sizes = {
    default: "h-10 px-4 text-[14px]",
    sm: "h-8 px-3 text-[13px]",
    lg: "h-12 px-6 text-[15px]",
    icon: "h-9 w-9 p-0",
  }

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-2 font-semibold tracking-[-0.01em] shadow-[3px_3px_0_#0f2942] transition-[transform,box-shadow,background-color,color] duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_#0f2942] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
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
