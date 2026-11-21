/**
 * Hand-drawn style illustration for the welcome page: a tailor's dress form
 * wearing a deep red gown, with a measuring tape, scissors, a thread spool
 * and a few sparkles. Flat colours with a dark outline (like a sticker).
 * Decoration only, so it is hidden from screen readers.
 */
const INK = "#2b211d"; // outline
const CREAM = "#f6f1ea";
const FORM = "#e9dfd2"; // the dress form's fabric
const RED = "#7b1e2c"; // the gown
const RED_DARK = "#5c1420";
const RED_LIGHT = "#9c3344";
const MUSTARD = "#c1872e";
const SAGE = "#8f9a6e";
const SAND = "#e4dcd2";

function Sparkle({ x, y, size = 14, color = MUSTARD }) {
  const s = size;
  return (
    <path
      d={`M ${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`}
      fill={color}
    />
  );
}

export default function DressFormArt({ className }) {
  return (
    <svg
      viewBox="0 0 520 620"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Soft backdrop blob */}
      <path
        d="M 262 70 C 380 62 470 150 470 290 C 470 430 400 560 262 560 C 130 560 52 450 56 300 C 60 160 150 78 262 70 Z"
        fill={SAND}
      />

      {/* Floor */}
      <path d="M 40 592 L 480 592" stroke={INK} strokeWidth="3" />
      <path d="M 70 604 L 92 604 M 400 604 L 440 604" stroke={INK} strokeWidth="2" opacity="0.5" />

      {/* Stand: pole and three feet */}
      <rect x="260" y="500" width="12" height="62" rx="5" fill={CREAM} stroke={INK} strokeWidth="3" />
      <path d="M 266 560 L 212 588 M 266 560 L 320 588 M 266 560 L 266 590" stroke={INK} strokeWidth="4" />
      <circle cx="212" cy="588" r="5" fill={INK} />
      <circle cx="320" cy="588" r="5" fill={INK} />

      {/* Neck and knob */}
      <rect x="250" y="62" width="32" height="44" rx="8" fill={FORM} stroke={INK} strokeWidth="3" />
      <ellipse cx="266" cy="60" rx="18" ry="8" fill={CREAM} stroke={INK} strokeWidth="3" />
      <circle cx="266" cy="50" r="6" fill={MUSTARD} stroke={INK} strokeWidth="3" />

      {/* Shoulders of the form (above the strapless gown) */}
      <path
        d="M 190 146 C 186 118 216 100 266 98 C 316 100 346 118 342 146 Z"
        fill={FORM}
        stroke={INK}
        strokeWidth="3"
      />

      {/* Skirt: flares from the waist to a soft wavy hem */}
      <path
        d="M 222 262 C 196 340 150 440 108 528 Q 146 548 186 534 Q 226 554 266 538 Q 306 554 346 534 Q 386 548 424 528 C 382 440 336 340 310 262 Z"
        fill={RED}
        stroke={INK}
        strokeWidth="3"
      />
      {/* Light on the left of the skirt */}
      <path d="M 226 280 C 208 350 176 430 146 512 Q 162 520 178 516 C 200 440 222 360 236 284 Z" fill={RED_LIGHT} opacity="0.7" />
      {/* Folds */}
      <path d="M 252 272 Q 236 400 204 528" stroke={RED_DARK} strokeWidth="3" />
      <path d="M 280 272 Q 298 400 330 528" stroke={RED_DARK} strokeWidth="3" />
      <path d="M 266 276 L 266 532" stroke={RED_DARK} strokeWidth="2.5" opacity="0.7" />
      <path d="M 238 300 Q 216 420 168 520" stroke={RED_DARK} strokeWidth="2" opacity="0.5" />
      <path d="M 294 300 Q 316 420 364 520" stroke={RED_DARK} strokeWidth="2" opacity="0.5" />

      {/* Bodice: sweetheart neckline, fitted to the waist */}
      <path
        d="M 194 144 C 210 128 244 130 266 154 C 288 130 322 128 338 144 C 336 180 326 222 312 262 L 220 262 C 206 222 196 180 194 144 Z"
        fill={RED}
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M 212 160 C 220 196 228 228 236 256" stroke={RED_DARK} strokeWidth="2.5" opacity="0.8" />
      <path d="M 320 160 C 312 196 304 228 296 256" stroke={RED_DARK} strokeWidth="2.5" opacity="0.8" />
      {/* Small embroidery dots along the neckline */}
      {[[214, 146], [232, 140], [250, 146], [282, 146], [300, 140], [318, 146]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y + 8} r="2.6" fill={MUSTARD} />
      ))}

      {/* Waist sash with a bow */}
      <path d="M 216 254 L 316 254 L 314 272 L 218 272 Z" fill={MUSTARD} stroke={INK} strokeWidth="3" />
      <path d="M 296 262 C 318 244 338 250 330 266 C 322 280 304 272 296 262 Z" fill={MUSTARD} stroke={INK} strokeWidth="3" />
      <path d="M 296 262 L 318 300 M 296 262 L 304 304" stroke={INK} strokeWidth="3" />
      <circle cx="296" cy="263" r="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />

      {/* Measuring tape draped round the neck */}
      <path d="M 248 100 C 238 140 232 190 238 236" stroke={INK} strokeWidth="15" />
      <path d="M 248 100 C 238 140 232 190 238 236" stroke={MUSTARD} strokeWidth="10" />
      <path d="M 248 100 C 238 140 232 190 238 236" stroke={INK} strokeWidth="5" strokeDasharray="1.5 7" strokeLinecap="butt" />
      <path d="M 284 100 C 300 136 308 176 300 214" stroke={INK} strokeWidth="15" />
      <path d="M 284 100 C 300 136 308 176 300 214" stroke={MUSTARD} strokeWidth="10" />
      <path d="M 284 100 C 300 136 308 176 300 214" stroke={INK} strokeWidth="5" strokeDasharray="1.5 7" strokeLinecap="butt" />
      <path d="M 248 100 Q 266 112 284 100" stroke={INK} strokeWidth="15" />
      <path d="M 248 100 Q 266 112 284 100" stroke={MUSTARD} strokeWidth="10" />
      <rect x="292" y="210" width="16" height="12" rx="2" fill={CREAM} stroke={INK} strokeWidth="2.5" transform="rotate(-12 300 216)" />

      {/* Scissors (floating on the left, like a doodle) */}
      <g transform="translate(66 432) rotate(-48)">
        <path d="M 0 0 L 64 -10 L 66 -4 L 6 6 Z" fill={CREAM} stroke={INK} strokeWidth="3" />
        <path d="M 0 0 L 62 14 L 60 20 L 4 8 Z" fill={CREAM} stroke={INK} strokeWidth="3" />
        <circle cx="-14" cy="-10" r="11" fill={SAGE} stroke={INK} strokeWidth="3" />
        <circle cx="-14" cy="-10" r="4.5" fill={CREAM} stroke={INK} strokeWidth="2" />
        <circle cx="-12" cy="16" r="11" fill={SAGE} stroke={INK} strokeWidth="3" />
        <circle cx="-12" cy="16" r="4.5" fill={CREAM} stroke={INK} strokeWidth="2" />
        <circle cx="6" cy="3" r="3" fill={INK} />
      </g>

      {/* Thread spool with a needle (bottom right) */}
      <g transform="translate(408 520)">
        <rect x="0" y="0" width="54" height="10" rx="3" fill={CREAM} stroke={INK} strokeWidth="3" />
        <rect x="6" y="10" width="42" height="44" rx="4" fill={RED} stroke={INK} strokeWidth="3" />
        <path d="M 8 20 L 46 20 M 8 30 L 46 30 M 8 40 L 46 40" stroke={RED_DARK} strokeWidth="2.5" />
        <rect x="0" y="54" width="54" height="10" rx="3" fill={CREAM} stroke={INK} strokeWidth="3" />
        <path d="M 46 34 C 74 30 74 -20 40 -34 C 18 -42 0 -30 4 -52" stroke={RED} strokeWidth="2.5" />
        <path d="M -6 -40 L 22 -70" stroke={INK} strokeWidth="3.5" />
        <ellipse cx="19" cy="-66" rx="2.2" ry="4.5" transform="rotate(42 19 -66)" fill={CREAM} stroke={INK} strokeWidth="1.5" />
      </g>

      {/* Pin cushion on the floor (left) */}
      <g transform="translate(118 570)">
        <ellipse cx="0" cy="12" rx="30" ry="10" fill={MUSTARD} stroke={INK} strokeWidth="3" />
        <path d="M -26 10 C -26 -18 26 -18 26 10 Z" fill={SAGE} stroke={INK} strokeWidth="3" />
        <path d="M -8 -6 L -16 -24 M 6 -8 L 10 -28 M 16 -2 L 28 -16" stroke={INK} strokeWidth="2.5" />
        <circle cx="-16" cy="-25" r="4" fill={RED} stroke={INK} strokeWidth="2" />
        <circle cx="10" cy="-29" r="4" fill={CREAM} stroke={INK} strokeWidth="2" />
        <circle cx="28" cy="-17" r="4" fill={MUSTARD} stroke={INK} strokeWidth="2" />
      </g>

      {/* Sparkles */}
      <Sparkle x={122} y={150} size={16} />
      <Sparkle x={418} y={118} size={12} color={RED} />
      <Sparkle x={444} y={330} size={18} />
      <Sparkle x={104} y={330} size={10} color={SAGE} />
      <circle cx="160" cy="98" r="5" fill={SAGE} />
      <circle cx="396" cy="440" r="4" fill={RED} />
      <circle cx="430" cy="176" r="4" fill={SAGE} />
    </svg>
  );
}
