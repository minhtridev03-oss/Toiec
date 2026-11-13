import { useMemo } from 'react';
import { getAvatarFrameById } from '../../lib/avatarFrames';
import { useAvatarFrames } from '../../contexts/AvatarFramesContext';

const SIZES = {
  xs: {
    container: 'h-7 w-7',
    avatar: 'h-7 w-7 text-[11px]',
    ringPadding: 'p-[2px]',
    badge: 'h-3.5 w-3.5 text-[8px] -bottom-0.5 -right-0.5',
    borderWidth: '2px',
  },
  sm: {
    container: 'h-8 w-8',
    avatar: 'h-8 w-8 text-xs',
    ringPadding: 'p-[2px]',
    badge: 'h-4 w-4 text-[9px] -bottom-0.5 -right-0.5',
    borderWidth: '2px',
  },
  md: {
    container: 'h-10 w-10',
    avatar: 'h-10 w-10 text-sm',
    ringPadding: 'p-[2.5px]',
    badge: 'h-4.5 w-4.5 text-[10px] -bottom-1 -right-1',
    borderWidth: '2.5px',
  },
  lg: {
    container: 'h-14 w-14',
    avatar: 'h-14 w-14 text-lg',
    ringPadding: 'p-[3px]',
    badge: 'h-5 w-5 text-xs -bottom-1 -right-1',
    borderWidth: '3px',
  },
  xl: {
    container: 'h-20 w-20',
    avatar: 'h-20 w-20 text-2xl',
    ringPadding: 'p-[3.5px]',
    badge: 'h-6 w-6 text-sm -bottom-1.5 -right-1.5',
    borderWidth: '3.5px',
  },
  '2xl': {
    container: 'h-24 w-24',
    avatar: 'h-24 w-24 text-3xl',
    ringPadding: 'p-[4px]',
    badge: 'h-7 w-7 text-base -bottom-2 -right-2',
    borderWidth: '4px',
  },
  '3xl': {
    container: 'h-28 w-28',
    avatar: 'h-28 w-28 text-4xl',
    ringPadding: 'p-[4.5px]',
    badge: 'h-8 w-8 text-lg -bottom-2.5 -right-2.5',
    borderWidth: '4.5px',
  },
};

export default function UserAvatar({
  src,
  frameId = 'none',
  frame: directFrame,
  size = 'md',
  fallbackText = 'U',
  className = '',
  showBadge = false,
  alt = 'Avatar',
  children,
}) {
  const { getFrameById } = useAvatarFrames();

  const frame = useMemo(() => {
    if (directFrame) return directFrame;
    if (getFrameById) return getFrameById(frameId);
    return getAvatarFrameById(frameId);
  }, [directFrame, frameId, getFrameById]);

  const sizeConfig = SIZES[size] || SIZES.md;
  const initial = (fallbackText || 'U').trim().charAt(0).toUpperCase();
  const hasCustomFrame = frame && frame.id !== 'none';

  // Dynamic Scale and Offset for Image/GIF Frames
  const frameScale = Number(frame?.frameScale ?? frame?.frame_scale ?? (frame?.frameUrl ? 1.6 : 1.28));
  const frameOffsetX = Number(frame?.offsetX ?? frame?.offset_x ?? 0);
  const frameOffsetY = Number(frame?.offsetY ?? frame?.offset_y ?? 0);
  const insetPercent = -((frameScale - 1) / 2) * 100;

  // Animation class mapped from frame data
  const animationClass = useMemo(() => {
    if (!hasCustomFrame) return '';
    if (frame.animation === 'spin-slow') return 'animate-frame-spin';
    if (frame.animation === 'pulse-slow') return 'animate-frame-pulse';
    if (frame.animation === 'shimmer') return 'animate-frame-shimmer';
    return '';
  }, [hasCustomFrame, frame]);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeConfig.container} ${className}`}>
      {/* 1. Gradient CSS Frame (Outer Glowing Ring) */}
      {hasCustomFrame && !frame.frameUrl && (
        <div
          className={`absolute -inset-1 rounded-full bg-gradient-to-tr ${frame.gradient} ${animationClass} pointer-events-none transition-all duration-300`}
          style={{
            boxShadow: frame.glowColor ? `0 0 14px ${frame.glowColor}` : 'none',
          }}
          aria-hidden="true"
        />
      )}

      {/* 2. Inner Avatar Mask & Image */}
      <div
        className={`relative z-1 rounded-full overflow-hidden flex items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 ${
          hasCustomFrame
            ? frame.frameUrl
              ? 'shadow-xs'
              : 'ring-2 ring-white/90 dark:ring-slate-900/90 shadow-xs'
            : 'ring-2 ring-slate-200/80 dark:ring-white/10 shadow-xs'
        }`}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              // Fallback to text initial if image load fails
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div
          className={`w-full h-full items-center justify-center font-black bg-gradient-to-tr from-indigo-500 to-purple-600 text-white ${
            src ? 'hidden' : 'flex'
          }`}
        >
          {initial}
        </div>

        {/* Children (e.g. camera hover overlay or custom badges) */}
        {children}
      </div>

      {/* 3. Image/GIF Overlay Frame (When user specifies a PNG/GIF frameUrl) */}
      {hasCustomFrame && frame.frameUrl && (
        <img
          src={frame.frameUrl}
          alt=""
          className="absolute max-w-none object-contain pointer-events-none select-none z-10 drop-shadow-md transition-all duration-200"
          style={{
            width: `${frameScale * 100}%`,
            height: `${frameScale * 100}%`,
            left: `${insetPercent + frameOffsetX}%`,
            top: `${insetPercent + frameOffsetY}%`,
          }}
          aria-hidden="true"
        />
      )}

      {/* 4. Optional Corner Badge Icon */}
      {showBadge && hasCustomFrame && frame.badgeIcon && (
        <span
          className={`absolute z-20 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md ring-1 ring-white/60 dark:ring-white/20 select-none ${sizeConfig.badge}`}
          title={frame.name}
        >
          {frame.badgeIcon}
        </span>
      )}
    </div>
  );
}
