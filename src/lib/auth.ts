import { loadJSON, removeKey, saveJSON } from './storage'

export type GoogleProfile = {
  sub: string
  name: string
  email: string
  picture: string
}

type CredentialResponse = { credential?: string }

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    use_fedcm_for_prompt?: boolean
  }) => void
  renderButton: (
    element: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      width?: number
      logo_alignment?: 'left' | 'center'
      locale?: string
    }
  ) => void
  disableAutoSelect: () => void
  prompt: () => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId
      }
    }
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const PROFILE_KEY = 'googleProfile'

let scriptPromise: Promise<void> | null = null

export function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true })
    document.head.appendChild(script)
  })

  return scriptPromise
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeGoogleCredential(token: string): GoogleProfile | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<GoogleProfile>
    if (!parsed.sub) return null
    return {
      sub: parsed.sub,
      name: parsed.name || '',
      email: parsed.email || '',
      picture: parsed.picture || '',
    }
  } catch {
    return null
  }
}

export function getStoredProfile(): GoogleProfile | null {
  return loadJSON<GoogleProfile | null>(PROFILE_KEY, null)
}

export function saveProfile(profile: GoogleProfile) {
  saveJSON(PROFILE_KEY, profile)
}

export function clearProfile() {
  removeKey(PROFILE_KEY)
  window.google?.accounts?.id?.disableAutoSelect()
}

export function getGoogleClientId() {
  const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim()
  if (envId) return envId
  return localStorage.getItem('googleClientId')?.trim() || ''
}

export function saveGoogleClientId(value: string) {
  if (value.trim()) localStorage.setItem('googleClientId', value.trim())
  else localStorage.removeItem('googleClientId')
}
