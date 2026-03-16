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
    sm: { mark: 28, text: 'text-lg', sub: 'text-[10px]' },
    md: { mark: 32, text: 'text-xl', sub: 'text-xs' },
    lg: { mark: 40, text: 'text-3xl', sub: 'text-sm' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2">
      {/* Mark — price tag */}
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#0A9E78" />
        <path
          d="M8 11.5C8 10.12 9.12 9 10.5 9H16.17C16.7 9 17.21 9.21 17.59 9.59L23.41 15.41C24.2 16.2 24.2 17.47 23.41 18.26L18.26 23.41C17.47 24.2 16.2 24.2 15.41 23.41L9.59 17.59C9.21 17.21 9 16.7 9 16.17V11.5C9 10.67 9.67 10 10.5 10Z"
          fill="white"
          fillOpacity="0"
        />
        <path
          d="M9 11.5C9 10.12 10.12 9 11.5 9H16.17C16.7 9 17.21 9.21 17.59 9.59L23.41 15.41C24.2 16.2 24.2 17.47 23.41 18.26L18.26 23.41C17.47 24.2 16.2 24.2 15.41 23.41L9.59 17.59C9.21 17.21 9 16.7 9 16.17V11.5Z"
          fill="white"
        />
        <circle cx="13" cy="13" r="1.5" fill="#0A9E78" />
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
