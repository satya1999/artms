import { cn } from "@/lib/utils";

const GOLD = "#F2B705";
const RED = "#E23B33";
const FACE = "#141414";

interface MarkProps {
  className?: string;
  /** Show the radiating red lotus petals + gold spikes around the face */
  petals?: boolean;
  /** Render a soft saffron halo behind the mark */
  glow?: boolean;
}

/**
 * Ananda Rath / Lord Jagannath brand mark — a fully scalable SVG so it stays
 * crisp from a 16px favicon up to the login hero, with no binary asset needed.
 */
export function BrandMark({ className, petals = false, glow = false }: MarkProps) {
  return (
    <svg viewBox="0 0 220 220" className={className} role="img" aria-label="Ananda Rath">
      <defs>
        <radialGradient id="ar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="38%" stopColor="#FF7A1A" stopOpacity="0.55" />
          <stop offset="72%" stopColor="#FF4D00" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FF4D00" stopOpacity="0" />
        </radialGradient>
      </defs>

      {glow && <circle cx="110" cy="110" r="110" fill="url(#ar-glow)" />}

      {petals && (
        <g>
          {Array.from({ length: 12 }).map((_, i) => (
            <path
              key={`petal-${i}`}
              d="M110,4 C99,22 99,34 110,42 C121,34 121,22 110,4 Z"
              fill={RED}
              transform={`rotate(${i * 30} 110 110)`}
            />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <path
              key={`spike-${i}`}
              d="M110,14 L106,28 L114,28 Z"
              fill={GOLD}
              transform={`rotate(${i * 30 + 15} 110 110)`}
            />
          ))}
        </g>
      )}

      {/* ── Face ── */}
      <g transform="translate(110 110) scale(1.32)">
        <circle r="50" fill={FACE} />
        <circle r="48" fill="none" stroke={GOLD} strokeWidth="1.6" />
        {/* beaded gold ring */}
        <circle r="43" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeDasharray="0.4 6" />
        <circle r="38.5" fill="none" stroke={GOLD} strokeWidth="1.4" />

        {/* Tilaka (Vaishnava U mark) */}
        <path d="M-8,-34 V-26 a8,8 0 0 0 16,0 V-34" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
        <path d="M0,-26 V-12" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-8.5" r="2.2" fill={GOLD} />

        {/* Eyes */}
        <g>
          <circle cx="-20" cy="-2" r="13" fill={RED} />
          <circle cx="-20" cy="-2" r="10.5" fill="#fff" />
          <circle cx="-20" cy="-2" r="5" fill={FACE} />
          <circle cx="20" cy="-2" r="13" fill={RED} />
          <circle cx="20" cy="-2" r="10.5" fill="#fff" />
          <circle cx="20" cy="-2" r="5" fill={FACE} />
        </g>

        {/* Nose crescent */}
        <path d="M-4.5,7 a4.5,4 0 0 0 9,0" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />

        {/* Cheeks */}
        <g>
          <circle cx="-31" cy="16" r="6" fill={RED} />
          <circle cx="-31" cy="16" r="2.4" fill={GOLD} />
          <circle cx="31" cy="16" r="6" fill={RED} />
          <circle cx="31" cy="16" r="2.4" fill={GOLD} />
        </g>

        {/* Smile */}
        <path d="M-22,21 Q0,42 22,21" fill="none" stroke={RED} strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  size?: "sm" | "md" | "lg";
  /** Use light text for the wordmark on dark backgrounds */
  onDark?: boolean;
  subtitle?: string;
  petals?: boolean;
}

/** Full lockup: Jagannath mark + "Ananda Rath" wordmark (+ optional subtitle). */
export function BrandLogo({
  className,
  markClassName = "h-9 w-9",
  size = "md",
  onDark = false,
  subtitle,
  petals = false,
}: LogoProps) {
  const titleSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={cn("shrink-0", markClassName)} petals={petals} />
      <div className="leading-none">
        <p className={cn("font-extrabold tracking-tight", titleSize)}>
          <span className="text-brand">Ananda</span>{" "}
          <span className={onDark ? "text-white" : "text-brand-dark"}>Rath</span>
        </p>
        {subtitle && (
          <p className={cn("mt-1 text-[11px] font-medium", onDark ? "text-slate-400" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
