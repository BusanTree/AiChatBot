export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function hasFinalConsonant(text: string) {
  const hangul = text.match(/[가-힣]/g)
  if (!hangul?.length) return false
  const code = hangul[hangul.length - 1].charCodeAt(0) - 0xac00
  return code >= 0 && code % 28 > 0
}

export function withJosa(text: string, pair: '은/는' | '이/가' | '을/를' | '와/과') {
  const final = hasFinalConsonant(text)
  if (pair === '은/는') return `${text}${final ? '은' : '는'}`
  if (pair === '이/가') return `${text}${final ? '이' : '가'}`
  if (pair === '와/과') return `${text}${final ? '과' : '와'}`
  return `${text}${final ? '을' : '를'}`
}

export function simpleCharacterName(name: string) {
  return name.match(/^[가-힣]+/)?.[0] || name.split(/\s+/)[0] || name
}

export function givenName(name: string) {
  return /^[가-힣]{3}$/.test(name) ? name.slice(1) : name
}
