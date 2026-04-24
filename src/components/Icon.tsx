export type IconName =
  | 'back'
  | 'chat'
  | 'chevronLeft'
  | 'chevronRight'
  | 'heart'
  | 'heartFilled'
  | 'home'
  | 'image'
  | 'logout'
  | 'plus'
  | 'search'
  | 'send'
  | 'settings'
  | 'sparkles'
  | 'trash'
  | 'user'
  | 'x'

type IconProps = {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20 }: IconProps) {
  const common = {
    className: 'ui-icon',
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    'aria-hidden': true,
  } as const

  switch (name) {
    case 'back':
      return (
        <svg {...common}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path d="M5 6.5A4.5 4.5 0 0 1 9.5 2h5A4.5 4.5 0 0 1 19 6.5v4A4.5 4.5 0 0 1 14.5 15H11l-4.5 4v-4.4A4.5 4.5 0 0 1 5 10.5z" />
        </svg>
      )
    case 'chevronLeft':
      return (
        <svg {...common}>
          <path d="m15 6-6 6 6 6" />
        </svg>
      )
    case 'chevronRight':
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path d="M20.2 5.7c-1.8-2.1-5-1.8-6.7.2L12 7.6l-1.5-1.7c-1.7-2-4.9-2.3-6.7-.2-2 2.3-1.4 5.7.8 7.7L12 20l7.4-6.6c2.2-2 2.8-5.4.8-7.7z" />
        </svg>
      )
    case 'heartFilled':
      return (
        <svg {...common} className="ui-icon filled">
          <path d="M20.2 5.7c-1.8-2.1-5-1.8-6.7.2L12 7.6l-1.5-1.7c-1.7-2-4.9-2.3-6.7-.2-2 2.3-1.4 5.7.8 7.7L12 20l7.4-6.6c2.2-2 2.8-5.4.8-7.7z" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 11.2 12 4l8 7.2" />
          <path d="M6.5 10.5V20h11v-9.5" />
        </svg>
      )
    case 'image':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="m7 16 3.2-3.2 2.3 2.3 2.2-2.6L18 16" />
          <path d="M8.5 9.5h.01" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 4H5v16h5" />
          <path d="M14 12h7" />
          <path d="m17 8 4 4-4 4" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      )
    case 'send':
      return (
        <svg {...common}>
          <path d="M20 4 9.5 14.5" />
          <path d="M20 4 14 21l-4.5-6.5L3 10z" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8z" />
          <path d="M18 14l.7 2.2L21 17l-2.3.8L18 20l-.7-2.2L15 17l2.3-.8z" />
          <path d="M5 13l.5 1.5L7 15l-1.5.5L5 17l-.5-1.5L3 15l1.5-.5z" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 14h10l1-14" />
          <path d="M9 7V4h6v3" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'x':
    default:
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      )
  }
}
