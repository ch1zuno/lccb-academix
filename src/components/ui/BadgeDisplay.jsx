import React from "react"
import { cn } from "../../lib/utils"

export function BadgeDisplay({
  badges = [],
  maxVisible = 5,
  variant = "default",
  className,
  showTooltips = true,
}) {
  if (!badges?.length) return null

  const visibleBadges = badges.slice(0, maxVisible)
  const remaining = badges.length - maxVisible

  const variantStyles = {
    default: "bg-paper border-ink text-ink",
    compact: "bg-surface-quiet border-gold text-ink",
    outline: "bg-transparent border-ink text-ink",
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleBadges.map((badge) => (
        <span
          key={badge.code || badge.name}
          className={cn(
            "inline-flex items-center gap-1 rounded-none border-2 px-2 py-0.5 text-[11px] font-semibold leading-none transition-colors",
            variantStyles[variant]
          )}
          title={showTooltips ? badge.description || badge.name : undefined}
        >
          <span className="text-[12px]">{badge.icon}</span>
          <span className="hidden sm:inline">{badge.name}</span>
        </span>
      ))}
      {remaining > 0 && (
        <span className={cn("inline-flex items-center rounded-none border-2 px-2 py-0.5 text-[11px] font-semibold", variantStyles[variant])}>
          +{remaining} more
        </span>
      )}
    </div>
  )
}

export function BadgeList({ badges = [], className }) {
  if (!badges?.length) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No badges earned yet
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {badges.map((badge) => (
        <div
          key={badge.code || badge.name}
          className="flex items-center gap-3 rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
        >
          <span className="grid h-8 w-8 place-items-center border-2 border-ink bg-gold text-lg">{badge.icon}</span>
          <div>
            <p className="font-semibold text-ink">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}