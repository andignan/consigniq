// ConsignIQ Logo — SVG mark + wordmark
export default function Logo({
  size = 'md',
  variant = 'light',
  showSubtitle = false,
}: {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  showSubtitle?: boolean
}) {
  const sizes = {
    sm: { markH: 22, text: 'text-lg', sub: 'text-[10px]' },
    md: { markH: 26, text: 'text-xl', sub: 'text-xs' },
    lg: { markH: 40, text: 'text-3xl', sub: 'text-sm' },
  }
  const s = sizes[size]
  const markW = Math.round(s.markH * 56 / 36)

  return (
    <div className="flex items-center gap-2">
      {/* Mark — landscape price tag */}
      <svg
        width={markW}
        height={s.markH}
        viewBox="0 0 56 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M24,0 H47 C51.4,0 55,3.6 55,8 V28 C55,32.4 51.4,36 47,36 H24 L2,18 Z" fill="#0A9E78"/>
        <circle cx="21" cy="18" r="5.5" fill="white"/>
        <circle cx="21" cy="18" r="2.5" fill="#0A9E78"/>
        <line x1="31" y1="13" x2="50" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <line x1="31" y1="18" x2="50" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.25"/>
        <line x1="31" y1="23" x2="44" y2="23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
      </svg>

      {/* Wordmark */}
      <div>
        <span className={`${s.text} font-bold tracking-tight`}>
          <span style={{ color: variant === 'dark' ? '#ffffff' : undefined }} className={variant === 'light' ? 'text-current' : undefined}>Consign</span>
          <span style={{ color: '#0A9E78' }}>IQ</span>
        </span>
        {showSubtitle && (
          <p className={`${s.sub} text-gray-400 -mt-0.5`}>AI-Powered Pricing & Inventory</p>
        )}
      </div>
    </div>
  )
}
