type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function base(className = "h-5 w-5") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconHome({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconCart({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 7H6" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </svg>
  );
}

export function IconReceipt({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-3-2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function IconBox({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M20.5 8.5 12 3 3.5 8.5v7L12 21l8.5-5.5v-7Z" />
      <path d="M3.5 8.5 12 14l8.5-5.5M12 14v7" />
    </svg>
  );
}

export function IconChart({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconWallet({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7.5Z" />
      <path d="M3 8h13" />
      <circle cx="17" cy="13.5" r="1.2" />
    </svg>
  );
}

export function IconPlus({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus({ className = "h-5 w-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconTrash({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.2A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.8L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconPencil({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z" />
    </svg>
  );
}

export function IconSearch({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

export function IconArrowLeft({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconX({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconCheck({ className, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function IconTrend({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

export function IconAlert({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </svg>
  );
}

export function IconLogout({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </svg>
  );
}

export function IconUser({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
    </svg>
  );
}

export function IconClock({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconPrinter({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M7 9V4h10v5" />
      <path d="M5 9h14a2 2 0 0 1 2 2v5h-4v4H7v-4H3v-5a2 2 0 0 1 2-2Z" />
      <path d="M7 16h10" />
    </svg>
  );
}

export function IconChevron({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function IconStore({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={strokeWidth}>
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3 9.5 5 4h14l2 5.5a3 3 0 0 1-5.5 1.5A3 3 0 0 1 12 12a3 3 0 0 1-3.5-1 3 3 0 0 1-5.5-1.5Z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}
