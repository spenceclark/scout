export function ScoutMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M16 7c-3.6 0-6.5 2.8-6.5 6.4 0 4.6 6.5 11.6 6.5 11.6s6.5-7 6.5-11.6C22.5 9.8 19.6 7 16 7Z"
        className="fill-primary-foreground"
      />
      <circle cx="16" cy="13.4" r="2.4" className="fill-primary" />
    </svg>
  );
}
