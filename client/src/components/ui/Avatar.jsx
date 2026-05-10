function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

function initials(username) {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export default function Avatar({ src, username, alt, size = 'md', className, online }) {
  const dims =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
        ? 'h-14 w-14 text-lg'
        : 'h-10 w-10 text-sm';

  return (
    <div className={cx('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt || username || ''}
          className={cx(dims, 'rounded-full border border-border object-cover bg-surface-card')}
        />
      ) : (
        <div
          className={cx(
            dims,
            'flex items-center justify-center rounded-full border border-border bg-surface-card font-medium text-ink-soft'
          )}
          aria-hidden
        >
          {initials(username)}
        </div>
      )}
      {online ? (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface-panel bg-emerald-500"
          title="Online"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
