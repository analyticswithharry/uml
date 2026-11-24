export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <rect x="6" y="7" width="14" height="10" rx="2" fill="none" stroke="var(--paper)" strokeWidth="2" />
      <path d="M6 12h14" stroke="var(--paper)" strokeWidth="2" />
      <path d="M12 26 26 8" stroke="#FF5A5F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
