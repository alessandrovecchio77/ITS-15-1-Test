export const AVATARS = ['🦊', '🐙', '🦉', '🐺', '🐯', '🦅', '🐍', '🦄', '🐻', '🦈'] as const

export type Avatar = (typeof AVATARS)[number]

const NAME_KEY = 'flip7.name'
const AVATAR_KEY = 'flip7.avatar'

export function loadName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function loadAvatar(): string {
  return localStorage.getItem(AVATAR_KEY) ?? AVATARS[0]
}

export function saveIdentity(name: string, avatar: string) {
  localStorage.setItem(NAME_KEY, name)
  localStorage.setItem(AVATAR_KEY, avatar)
}

const GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#f6d9a4', '#a9762f'],
  ['#a5f3d0', '#0f766e'],
  ['#bfdbfe', '#1d4ed8'],
  ['#fbcfe8', '#9d174d'],
  ['#ddd6fe', '#5b21b6'],
  ['#fde68a', '#b45309'],
  ['#a7f3d0', '#047857'],
  ['#fecaca', '#b91c1c'],
]

export function avatarGradient(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  const [light, dark] = GRADIENTS[hash % GRADIENTS.length]
  return `radial-gradient(circle at 30% 25%, ${light} 0%, ${light}ee 30%, ${dark} 100%)`
}
