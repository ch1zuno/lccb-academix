import React from "react"
import { cn } from "../../lib/utils"

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ProfileAvatar({
  name = "",
  avatar = "",
  profile_picture_url = "",
  size = "md",
  className,
  showBadge = false,
  badges = [],
}) {
  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-[11px]",
    md: "h-9 w-9 text-[12px]",
    lg: "h-12 w-12 text-[16px]",
    xl: "h-16 w-16 text-[22px]",
  }

  const hasImage = profile_picture_url && /^https?:\/\//i.test(profile_picture_url)

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {hasImage ? (
        <img
          src={profile_picture_url}
          alt={`${name}'s profile`}
          className={cn(
            "rounded-none border-2 border-ink",
            sizeClasses[size],
            "object-cover"
          )}
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            "grid place-items-center border-2 border-ink bg-gold text-ink font-bold leading-none",
            sizeClasses[size]
          )}
        >
          {getInitials(name)}
        </span>
      )}
      {showBadge && badges?.length > 0 && (
        <div className="absolute -bottom-1 -right-1 flex flex-wrap gap-1">
          {badges.slice(0, 3).map((badge) => (
            <span
              key={badge.code || badge.name}
              className="flex h-5 items-center gap-1 rounded-none border border-ink bg-paper px-1.5 text-[10px] font-medium text-ink shadow-[1px_1px_0_#0f2942]"
              title={badge.description || badge.name}
            >
              {badge.icon} {badge.name}
            </span>
          ))}
          {badges.length > 3 && (
            <span className="flex h-5 items-center rounded-none border border-ink bg-ink px-1.5 text-[10px] font-medium text-paper">
              +{badges.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}