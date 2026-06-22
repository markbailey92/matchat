interface FireworksIconProps {
  size?: number;
  className?: string;
}

export function FireworksIcon({ size = 14, className = "" }: FireworksIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden
    >
      <g stroke="currentColor" strokeLinecap="round">
        <line x1="12" y1="11" x2="12" y2="3.5" strokeWidth="1.6" />
        <line x1="12" y1="11" x2="17.8" y2="5.2" strokeWidth="1.4" />
        <line x1="12" y1="11" x2="20.5" y2="11" strokeWidth="1.4" />
        <line x1="12" y1="11" x2="17.8" y2="16.8" strokeWidth="1.4" />
        <line x1="12" y1="11" x2="6.2" y2="16.8" strokeWidth="1.4" />
        <line x1="12" y1="11" x2="3.5" y2="11" strokeWidth="1.4" />
        <line x1="12" y1="11" x2="6.2" y2="5.2" strokeWidth="1.4" />
        <line x1="12" y1="11" x2="15.5" y2="8.5" strokeWidth="1.1" opacity="0.75" />
        <line x1="12" y1="11" x2="8.5" y2="8.5" strokeWidth="1.1" opacity="0.75" />
        <line x1="7.5" y1="18" x2="7.5" y2="14.5" strokeWidth="1.2" opacity="0.65" />
        <line x1="7.5" y1="18" x2="10.2" y2="15.3" strokeWidth="1" opacity="0.55" />
        <line x1="7.5" y1="18" x2="4.8" y2="15.3" strokeWidth="1" opacity="0.55" />
      </g>
      <circle cx="12" cy="11" r="1.3" fill="currentColor" />
      <circle cx="12" cy="3.5" r="0.9" fill="currentColor" />
      <circle cx="20.5" cy="11" r="0.8" fill="currentColor" opacity="0.9" />
      <circle cx="6.2" cy="5.2" r="0.8" fill="currentColor" opacity="0.9" />
      <circle cx="17.8" cy="16.8" r="0.7" fill="currentColor" opacity="0.85" />
      <circle cx="7.5" cy="18" r="0.9" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
