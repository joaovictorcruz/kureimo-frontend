export default function Logo({ size = 40, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Ice cream cone */}
        <g transform="translate(14, 4)">
          {/* Cone */}
          <path
            d="M10 46 L26 78 L42 46 Z"
            fill="url(#cone-grad)"
            opacity="0.95"
          />
          {/* Cone pattern lines */}
          <path d="M18 52 L28 74 M22 50 L34 70 M14 54 L24 76" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
          {/* Scoop */}
          <ellipse cx="26" cy="42" rx="18" ry="8" fill="url(#scoop-shadow)" />
          <circle cx="26" cy="34" r="18" fill="url(#scoop-grad)" />
          {/* Sprinkles */}
          <rect x="14" y="26" width="5" height="2" rx="1" fill="#FFB5D8" transform="rotate(-30 14 26)" />
          <rect x="30" y="22" width="5" height="2" rx="1" fill="#A8DFFF" transform="rotate(15 30 22)" />
          <rect x="20" y="18" width="4" height="2" rx="1" fill="#9CF5D8" transform="rotate(-10 20 18)" />
          <rect x="34" y="32" width="4" height="2" rx="1" fill="#FFD6A5" transform="rotate(40 34 32)" />
        </g>

        {/* Photocard sticking out at ~65° left lean */}
        <g transform="translate(32, 2) rotate(-25, 20, 40)">
          <rect x="6" y="4" width="28" height="38" rx="4" fill="white" stroke="rgba(201,169,245,0.6)" strokeWidth="1.5" filter="url(#card-shadow)" />
          {/* Card image area */}
          <rect x="9" y="7" width="22" height="22" rx="2" fill="url(#card-img)" />
          {/* Card text lines */}
          <rect x="9" y="32" width="14" height="2.5" rx="1.25" fill="#E8E0F4" />
          <rect x="9" y="36" width="10" height="2" rx="1" fill="#F0EAF8" />
          {/* Star on card */}
          <text x="20" y="20" fontSize="10" textAnchor="middle" fill="white" opacity="0.9">★</text>
        </g>

        <defs>
          <linearGradient id="cone-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1CCA6" />
            <stop offset="100%" stopColor="#F2BFB4" />
          </linearGradient>
          <linearGradient id="scoop-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2BFB4" />
            <stop offset="50%" stopColor="#F28695" />
            <stop offset="100%" stopColor="#F2E6B5" />
          </linearGradient>
          <linearGradient id="scoop-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(242,134,149,0.2)" />
            <stop offset="100%" stopColor="rgba(242,134,149,0)" />
          </linearGradient>
          <linearGradient id="card-img" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2BFB4" />
            <stop offset="50%" stopColor="#F28695" />
            <stop offset="100%" stopColor="#F1CCA6" />
          </linearGradient>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="rgba(242,134,149,0.35)" />
          </filter>
        </defs>
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: size * 0.6,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #F28695, #d96475)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          kureimo
        </span>
      )}
    </div>
  );
}
