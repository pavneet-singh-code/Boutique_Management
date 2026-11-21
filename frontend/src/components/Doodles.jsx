/**
 * Small hand-drawn sewing doodles (same style as the welcome page's dress
 * form): flat colours with a dark outline. Decoration only, so every one is
 * hidden from screen readers and never catches taps.
 *
 * Each takes `className` (size / position / rotation) and `tone`:
 *   "color" - the normal colours, "cream" - light, for dark cocoa cards.
 */
const COLORS = {
  color: { ink: "#2b211d", cream: "#f6f1ea", red: "#7b1e2c", redDark: "#5c1420", mustard: "#c1872e", sage: "#8f9a6e" },
  cream: { ink: "#f6f1ea", cream: "transparent", red: "#f6f1ea", redDark: "#f6f1ea", mustard: "#f6f1ea", sage: "transparent" },
};

function Svg({ viewBox, className, children }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function ScissorsDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 110 70" className={className}>
      <g transform="translate(26 36)">
        <path d="M 0 0 L 74 -12 L 76 -5 L 6 6 Z" fill={c.cream} stroke={c.ink} strokeWidth="3" />
        <path d="M 0 0 L 72 16 L 70 23 L 4 8 Z" fill={c.cream} stroke={c.ink} strokeWidth="3" />
        <circle cx="-12" cy="-12" r="11" fill={c.sage} stroke={c.ink} strokeWidth="3" />
        <circle cx="-12" cy="-12" r="4.5" fill={c.cream} stroke={c.ink} strokeWidth="2" />
        <circle cx="-10" cy="16" r="11" fill={c.sage} stroke={c.ink} strokeWidth="3" />
        <circle cx="-10" cy="16" r="4.5" fill={c.cream} stroke={c.ink} strokeWidth="2" />
        <circle cx="6" cy="3" r="3" fill={c.ink} />
      </g>
    </Svg>
  );
}

export function SpoolDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 90 90" className={className}>
      <g transform="translate(12 18)">
        <rect x="0" y="0" width="46" height="9" rx="3" fill={c.cream} stroke={c.ink} strokeWidth="3" />
        <rect x="5" y="9" width="36" height="38" rx="4" fill={c.red} stroke={c.ink} strokeWidth="3" />
        <path d="M 7 18 L 39 18 M 7 27 L 39 27 M 7 36 L 39 36" stroke={c.redDark} strokeWidth="2.5" opacity="0.8" />
        <rect x="0" y="47" width="46" height="9" rx="3" fill={c.cream} stroke={c.ink} strokeWidth="3" />
        <path d="M 40 30 C 66 26 70 -6 48 -12" stroke={c.red} strokeWidth="2.5" />
      </g>
    </Svg>
  );
}

export function NeedleDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 90 90" className={className}>
      <path d="M 18 72 L 70 20" stroke={c.ink} strokeWidth="3.5" />
      <ellipse cx="66" cy="24" rx="2.4" ry="5" transform="rotate(45 66 24)" fill={c.cream} stroke={c.ink} strokeWidth="1.6" />
      <path d="M 66 24 C 84 10 86 40 64 46 C 46 52 40 72 56 82" stroke={c.red} strokeWidth="2.5" />
    </Svg>
  );
}

export function TapeDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  const d = "M 8 40 C 30 10 52 64 76 34 C 92 16 104 22 112 30";
  return (
    <Svg viewBox="0 0 120 70" className={className}>
      <path d={d} stroke={c.ink} strokeWidth="15" />
      <path d={d} stroke={c.mustard} strokeWidth="10" />
      <path d={d} stroke={c.ink} strokeWidth="5" strokeDasharray="1.5 7" strokeLinecap="butt" />
    </Svg>
  );
}

export function ButtonDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 50 50" className={className}>
      <circle cx="25" cy="25" r="20" fill={c.mustard} stroke={c.ink} strokeWidth="3" />
      <circle cx="25" cy="25" r="13" stroke={c.ink} strokeWidth="2" opacity="0.6" />
      {[
        [21, 21],
        [29, 21],
        [21, 29],
        [29, 29],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={c.ink} />
      ))}
    </Svg>
  );
}

export function HangerDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 110 70" className={className}>
      <path d="M 55 26 C 55 18 64 18 64 11 C 64 4 54 2 50 8" stroke={c.ink} strokeWidth="3" />
      <path d="M 55 26 L 10 56 Q 6 60 12 61 L 98 61 Q 104 60 100 56 Z" fill={c.cream} stroke={c.ink} strokeWidth="3" />
    </Svg>
  );
}

export function PinCushionDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 80 70" className={className}>
      <g transform="translate(40 44)">
        <ellipse cx="0" cy="12" rx="30" ry="10" fill={c.mustard} stroke={c.ink} strokeWidth="3" />
        <path d="M -26 10 C -26 -18 26 -18 26 10 Z" fill={c.sage} stroke={c.ink} strokeWidth="3" />
        <path d="M -8 -6 L -16 -24 M 6 -8 L 10 -28 M 16 -2 L 28 -16" stroke={c.ink} strokeWidth="2.5" />
        <circle cx="-16" cy="-25" r="4" fill={c.red} stroke={c.ink} strokeWidth="2" />
        <circle cx="10" cy="-29" r="4" fill={c.cream} stroke={c.ink} strokeWidth="2" />
        <circle cx="28" cy="-17" r="4" fill={c.mustard} stroke={c.ink} strokeWidth="2" />
      </g>
    </Svg>
  );
}

/** A tailor's pencil drawing a little stitched line (used for "saved" notifications). */
export function PencilDoodle({ className, tone = "color" }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 110 80" className={className}>
      {/* the line it just drew: a dashed stitch */}
      <path d="M 8 66 C 24 58 34 72 50 64 C 62 58 70 66 80 62" stroke={c.red} strokeWidth="3" strokeDasharray="6 5" />
      <g transform="translate(40 52) rotate(-38)">
        {/* eraser + metal band */}
        <rect x="58" y="-8" width="14" height="16" rx="4" fill={c.red} stroke={c.ink} strokeWidth="3" />
        <rect x="50" y="-8" width="10" height="16" fill={c.cream} stroke={c.ink} strokeWidth="3" />
        {/* body */}
        <rect x="6" y="-8" width="45" height="16" fill={c.mustard} stroke={c.ink} strokeWidth="3" />
        <path d="M 8 0 L 49 0" stroke={c.ink} strokeWidth="1.5" opacity="0.5" />
        {/* sharpened wood and the lead */}
        <path d="M 6 -8 L -10 0 L 6 8 Z" fill={c.cream} stroke={c.ink} strokeWidth="3" />
        <path d="M -4 -3 L -10 0 L -4 3 Z" fill={c.ink} />
      </g>
    </Svg>
  );
}

export function SparkleDoodle({ className, tone = "color", color }) {
  const c = COLORS[tone];
  return (
    <Svg viewBox="0 0 30 30" className={className}>
      <path d="M 15 1 Q 17.5 12.5 29 15 Q 17.5 17.5 15 29 Q 12.5 17.5 1 15 Q 12.5 12.5 15 1 Z" fill={color || c.mustard} />
    </Svg>
  );
}

/**
 * Doodles scattered behind every screen, in their real colours (like the
 * welcome page). Cards sit on top, so they show in the gaps around them.
 */
export function DoodleBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-60">
      <ScissorsDoodle className="absolute -right-3 top-[11%] w-24 rotate-[-18deg] md:right-[1%] md:top-[56%] md:w-32" />
      <SpoolDoodle className="absolute -left-4 bottom-[24%] w-16 rotate-[10deg] md:left-[17.5rem] md:w-20" />
      <TapeDoodle className="absolute -right-6 bottom-[16%] w-36 rotate-[8deg] md:right-[6%] md:w-48" />
      <NeedleDoodle className="absolute left-[46%] top-[2%] hidden w-16 rotate-[20deg] md:block" />
      <ButtonDoodle className="absolute -left-3 top-[30%] w-10 md:left-[17.25rem] md:top-[88%] md:w-12" />
      <ButtonDoodle className="absolute right-[24%] top-[58%] hidden w-9 md:block" />
      <HangerDoodle className="absolute bottom-[42%] right-[1%] hidden w-28 rotate-[-8deg] lg:block" />
      <PinCushionDoodle className="absolute -right-2 top-[44%] w-14 md:right-[2%] md:top-[30%] md:w-16" />
      <SparkleDoodle className="absolute left-[30%] top-[20%] w-5" />
      <SparkleDoodle className="absolute bottom-[34%] right-[20%] w-6" color="#7b1e2c" />
      <SparkleDoodle className="absolute bottom-[10%] left-[32%] w-5" color="#8f9a6e" />
      <SparkleDoodle className="absolute left-[8%] top-[62%] w-4 md:left-[19rem]" color="#7b1e2c" />
    </div>
  );
}

const TITLE_DOODLES = [ScissorsDoodle, SpoolDoodle, NeedleDoodle, ButtonDoodle, PinCushionDoodle, TapeDoodle];

/** A small sewing doodle for a section title; the same title always gets the same one. */
export function TitleDoodle({ title, className }) {
  const text = String(title || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  const Doodle = TITLE_DOODLES[hash % TITLE_DOODLES.length];
  return <Doodle className={className} />;
}

/** A little row of tools at the bottom of every screen. */
export function DoodleFooter() {
  return (
    <div aria-hidden="true" className="pointer-events-none mt-10 flex items-end justify-center gap-5 pb-2 opacity-80">
      <ScissorsDoodle className="w-14 -rotate-12" />
      <SparkleDoodle className="mb-6 w-4" />
      <TapeDoodle className="w-20" />
      <SparkleDoodle className="mb-7 w-3" color="#7b1e2c" />
      <SpoolDoodle className="w-11 rotate-6" />
    </div>
  );
}
