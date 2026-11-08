import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export function getInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
}

const SIZE_MAP = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-12 w-12 text-[16px]',
  xl: 'h-16 w-16 text-[22px]',
  '2xl': 'h-20 w-20 text-[26px]',
};

/**
 * Universal reusable Avatar component with initials fallback.
 * Strictly renders plain text initials when image is missing or errors.
 */
export function Avatar({
  name = '',
  avatarUrl = null,
  src = null,
  size = 'md',
  className = '',
  showBorder = true,
  alt = '',
}) {
  const resolvedUrl = src || avatarUrl;
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = getInitials(name);

  // If URL changed, reset error state
  const [prevUrl, setPrevUrl] = useState(resolvedUrl);
  if (resolvedUrl !== prevUrl) {
    setPrevUrl(resolvedUrl);
    setImgError(false);
  }

  const isHttpOrData = typeof resolvedUrl === 'string' &&
    (resolvedUrl.startsWith('/') || resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://') || resolvedUrl.startsWith('data:image/'));
  const hasImage = Boolean(isHttpOrData) && !imgError;
  const isEmoji = !hasImage && typeof resolvedUrl === 'string' && resolvedUrl.trim().length > 0;

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-bold leading-none',
        showBorder && 'border-2 border-ink',
        sizeClass,
        className
      )}
    >
      {hasImage ? (
        <img
          src={resolvedUrl}
          alt={alt || `${name || 'User'}'s avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={cn(
            'grid h-full w-full place-items-center bg-gold text-ink',
            isEmoji && 'text-[1.15em] leading-none'
          )}
          aria-hidden="true"
        >
          {isEmoji ? resolvedUrl : initials}
        </span>
      )}
    </div>
  );
}

export default Avatar;

