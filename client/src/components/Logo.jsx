export default function Logo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--ink)" />

      {/* Architecture connections */}
      <path
        d="M16 9V12M9 16H12M20 16H23M16 20V23"
        stroke="var(--paper)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Central server */}
      <rect
        x="12"
        y="12"
        width="8"
        height="8"
        rx="2"
        fill="#FF5A5F"
      />

      <circle cx="16" cy="16" r="1.5" fill="var(--paper)" />

      {/* Top node */}
      <rect
        x="13"
        y="4"
        width="6"
        height="5"
        rx="1.5"
        stroke="var(--paper)"
        strokeWidth="1.5"
      />

      {/* Left node */}
      <rect
        x="4"
        y="13"
        width="5"
        height="6"
        rx="1.5"
        stroke="var(--paper)"
        strokeWidth="1.5"
      />

      {/* Right node */}
      <rect
        x="23"
        y="13"
        width="5"
        height="6"
        rx="1.5"
        stroke="var(--paper)"
        strokeWidth="1.5"
      />

      {/* Bottom node */}
      <rect
        x="13"
        y="23"
        width="6"
        height="5"
        rx="1.5"
        stroke="var(--paper)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
