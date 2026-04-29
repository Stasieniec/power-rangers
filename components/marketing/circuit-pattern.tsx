export function CircuitPattern({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1200 600" className={className} fill="none">
      <defs>
        <linearGradient id="cp" x1="0" x2="1">
          <stop offset="0%" stopColor="#1A6E78" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3FCEDB" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M0 200 L300 200 L320 220 L600 220 L620 200 L900 200 L920 180 L1200 180"
        stroke="url(#cp)"
        strokeWidth="1"
      />
      <path
        d="M0 350 L200 350 L220 330 L500 330 L520 350 L800 350 L820 370 L1200 370"
        stroke="url(#cp)"
        strokeWidth="1"
      />
      <circle cx="320" cy="220" r="3" fill="#3FCEDB" fillOpacity="0.4" />
      <circle cx="620" cy="200" r="3" fill="#3FCEDB" fillOpacity="0.4" />
      <circle cx="220" cy="330" r="3" fill="#3FCEDB" fillOpacity="0.4" />
      <circle cx="820" cy="370" r="3" fill="#3FCEDB" fillOpacity="0.4" />
    </svg>
  );
}
