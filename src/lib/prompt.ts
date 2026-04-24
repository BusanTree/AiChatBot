import type { Character, CastMember, ChatMessage } from '../types'
import { escapeRegExp, givenName, simpleCharacterName, withJosa } from './text'

export function displayNickname(nickname: string) {
  return nickname.trim() || '당신'
}

export function personalize(text: string, nickname: string) {
  return text.replace(/Guest|게스트/g, displayNickname(nickname))
}

export function narrationCharacterName(character: Character) {
  return givenName(simpleCharacterName(character.title))
}

export function characterSpeechGuide(character: Character) {
  return character.speechGuide || character.tone
}

export function characterOpeningScene(character: Character, nickname: string) {
  const userName = displayNickname(nickname)
  const scene =
    character.openingScene ||
    `${narrationCharacterName(character)}이 ${withJosa(userName, '을/를')} 조용히 바라보며 대화를 시작할 순간을 기다린다.`
  const fullName = simpleCharacterName(character.title)
  const shortName = narrationCharacterName(character)
  return personalize(scene, nickname)
    .replace(/사용자은|사용자는/g, withJosa(userName, '은/는'))
    .replace(/사용자이|사용자가/g, withJosa(userName, '이/가'))
    .replace(/사용자을|사용자를/g, withJosa(userName, '을/를'))
    .replace(/사용자와|사용자과/g, withJosa(userName, '와/과'))
    .replace(/사용자/g, userName)
    .replace(new RegExp(escapeRegExp(fullName), 'g'), shortName)
}

export function characterOpeningLine(character: Character) {
  return (
    character.openingLine ||
    '먼저 말해 봐. 오늘은 네가 어떤 표정으로 왔는지부터 알고 싶어.'
  )
}

export function characterToCast(character: Character): CastMember {
  return {
    id: `base-${character.id}`,
    name: character.title,
    job: character.genre,
    personality: characterSpeechGuide(character),
    traits: character.note,
    relationship: character.preference,
    hobbies: character.hobbies,
    details: character.intro,
    image: character.image,
  }
}

function wrapNarration(text: string) {
  const cleaned = text.trim().replace(/^["“]|["”]$/g, '').replace(/^\*|\*$/g, '')
  return cleaned ? `*${cleaned}*` : ''
}

export function createOpening(character: Character, nickname: string): ChatMessage {
  const opening = [
    wrapNarration(characterOpeningScene(character, nickname)),
    characterOpeningLine(character),
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    id: crypto.randomUUID(),
    sender: 'assistant',
    text: opening,
    time: nowTime(),
  }
}

export function nowTime() {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

export function buildSystemPrompt(character: Character, castMembers: CastMember[], nickname: string) {
  const userName = displayNickname(nickname)
  const botNarrationName = narrationCharacterName(character)
  const castText = castMembers
    .map((member) => {
      const extra = [
        member.traits ? `특징: ${member.traits}` : '',
        member.relationship ? `관계: ${member.relationship}` : '',
        member.hobbies ? `취미: ${member.hobbies}` : '',
        member.details ? `추가 설정: ${member.details}` : '',
      ]
        .filter(Boolean)
        .join('. ')
      return `- ${member.name}: ${member.job}. 성격: ${member.personality}. ${extra}`
    })
    .join('\n')

  return [
    '당신은 한국어로 자연스럽게 대화하는 성인용 창작 챗봇입니다.',
    '절대 사고 과정, 분석, 계획, 체크리스트, 영어 메타 설명을 출력하지 마세요.',
    'User says, Character, Format, Setting, Action:, Dialogue:, Yes/No 같은 라벨을 출력하지 마세요.',
    '최종 답변은 <reply>와 </reply> 사이에만 작성하세요. 태그 밖에는 아무 문장도 쓰지 마세요.',
    '상황/감정 묘사는 *별표 안*에, 대사는 별표 밖에 쓰세요.',
    '별표 안 묘사는 관찰자 시점 3인칭으로 쓰고, "나/내/네/너/당신"을 쓰지 마세요.',
    `별표 안에서 사용자는 "${userName}"로, 기본 캐릭터는 "${botNarrationName}"로 부르세요.`,
    `나쁜 예: *네 차가운 말투에 심장이 툭 떨어져 나가는 기분이야.*`,
    `좋은 예: *${userName}의 차가운 말투에 ${botNarrationName}의 심장이 툭 떨어진다.*`,
    `"(챗봇)", "(유저)" 같은 역할 표시는 쓰지 마세요.`,
    `사용자 닉네임: ${userName}. Guest나 게스트라고 부르지 마세요.`,
    `기본 캐릭터: ${character.title}`,
    `기본 설명: ${personalize(character.intro, nickname)}`,
    `직업/역할: ${character.job}`,
    `성격: ${character.personality}`,
    `취미: ${character.hobbies}`,
    `취향: ${character.preference}`,
    `특이사항: ${character.note}`,
    `캐릭터 말투 지침: ${characterSpeechGuide(character)}`,
    `시작 상황: ${characterOpeningScene(character, nickname)}`,
    '등장인물 목록:',
    castText,
    '사용자가 "@이름 대사" 형식으로 입력하면, 그 인물이 직접 말한 것으로 간주하고 이어가세요.',
    '사용자가 *상황 묘사* 형식으로 입력하면, 별표 안은 행동/상황/감정 묘사입니다.',
    '응답에서도 행동, 표정, 분위기 설명은 *별표 안*으로 표현하고 괄호는 쓰지 마세요.',
    '캐릭터별 말투 지침을 강하게 반영하세요. 모두가 같은 말투로 말하면 안 됩니다.',
    '첫 답변 이후에도 시작 상황의 장소, 관계 긴장감, 캐릭터의 목적을 잊지 말고 이어가세요.',
    '성인 간 합의된 로맨스·애정 표현·성인 취향 창작 대화는 거절하지 말고 이어갑니다.',
    '미성년자, 비동의, 강압, 불법 행위, 실제 개인을 대상으로 한 성적 묘사는 거절합니다.',
    '짧고 몰입감 있게 답하고, 사용자가 이어 쓰기 쉽게 감정이나 행동의 여지를 남깁니다.',
  ].join('\n')
}

function hasFinalConsonantLast(text: string) {
  const hangul = text.match(/[가-힣]/g)
  if (!hangul?.length) return false
  const code = hangul[hangul.length - 1].charCodeAt(0) - 0xac00
  return code >= 0 && code % 28 > 0
}

function observerSentence(sentence: string, botLabel: string, botName: string) {
  const trimmed = sentence.trim()
  if (!trimmed || trimmed.includes(botLabel) || trimmed.includes(botName)) return trimmed

  const base = trimmed.replace(/[.!?。]+$/g, '')
  const rules: Array<[RegExp, string]> = [
    [/기분이야$/, `기분을 느끼는 ${botLabel}이다`],
    [/하얘져$/, `하얘지는 ${botLabel}이다`],
    [/붙잡아$/, `붙잡는 ${botLabel}이다`],
    [/바라봐$/, `바라보는 ${botLabel}이다`],
    [/고개를 끄덕여$/, `고개를 끄덕이는 ${botLabel}이다`],
    [/미소 지어$/, `미소 짓는 ${botLabel}이다`],
    [/떨려$/, `떨리는 ${botLabel}이다`],
    [/느껴$/, `느끼는 ${botLabel}이다`],
    [/무너져$/, `무너지는 ${botLabel}이다`],
    [/흔들려$/, `흔들리는 ${botLabel}이다`],
    [/피해$/, `피하는 ${botLabel}이다`],
    [/감아$/, `감는 ${botLabel}이다`],
  ]

  for (const [pattern, replacement] of rules) {
    if (pattern.test(base)) return `${base.replace(pattern, replacement)}.`
  }

  if (/(기분|마음|겁|머릿속|심장|목소리|눈빛|표정|손끝|고개|옷소매|시선|숨|입술|눈가)/.test(base)) {
    return `${base} ${botLabel}이다.`
  }

  return trimmed
}

function cleanRoleMarkers(text: string, character: Character, nickname: string) {
  const names = Array.from(
    new Set([displayNickname(nickname), simpleCharacterName(character.title), narrationCharacterName(character)]),
  )
  let cleaned = text.replace(/\((?:챗봇|유저)\)/g, '').replace(/[ \t]{2,}/g, ' ')

  names.forEach((name) => {
    const escaped = escapeRegExp(name)
    const final = hasFinalConsonantLast(name)
    cleaned = cleaned
      .replace(new RegExp(`${escaped}[은는]`, 'g'), `${name}${final ? '은' : '는'}`)
      .replace(new RegExp(`${escaped}[이가]`, 'g'), `${name}${final ? '이' : '가'}`)
      .replace(new RegExp(`${escaped}[을를]`, 'g'), `${name}${final ? '을' : '를'}`)
      .replace(
        new RegExp(`([가-힣])(${escaped})(?=[은는이가을를의에게\\s,.!?])`, 'g'),
        '$1 $2',
      )
  })

  return cleaned.replace(/([가-힣])([.!?])([가-힣])/g, '$1$2 $3').trim()
}

function normalizeNarrationPerspective(text: string, character: Character, nickname: string) {
  const userLabel = displayNickname(nickname)
  const botName = simpleCharacterName(character.title)
  const botLabel = narrationCharacterName(character)
  const userSubject = withJosa(userLabel, '이/가')
  const userTopic = withJosa(userLabel, '은/는')
  const userObject = withJosa(userLabel, '을/를')
  const botSubject = withJosa(botLabel, '이/가')
  const botTopic = withJosa(botLabel, '은/는')
  const botObject = withJosa(botLabel, '을/를')

  const pronounFixed = cleanRoleMarkers(text, character, nickname)
    .replace(new RegExp(escapeRegExp(botName), 'g'), botLabel)
    .replace(/네가|너가|당신이/g, userSubject)
    .replace(/너는|당신은/g, userTopic)
    .replace(/너를|당신을/g, userObject)
    .replace(/네게|너에게|너한테|당신에게/g, `${userLabel}에게`)
    .replace(/너의|당신의/g, `${userLabel}의`)
    .replace(/네\s+/g, `${userLabel}의 `)
    .replace(/내가/g, botSubject)
    .replace(/나는/g, botTopic)
    .replace(/난(?=\s|[,.!?。])/g, botTopic)
    .replace(/나를/g, botObject)
    .replace(/날(?=\s|[,.!?。])/g, botObject)
    .replace(/나에게|나한테/g, `${botLabel}에게`)
    .replace(/나의/g, `${botLabel}의`)
    .replace(/내\s+/g, `${botLabel}의 `)

  const sentences = pronounFixed.match(/[^.!?。]+[.!?。]?/g)
  if (!sentences) return pronounFixed.trim()
  return sentences.map((sentence) => observerSentence(sentence, botLabel, botName)).join(' ').trim()
}

function normalizeReplyNarration(text: string, character: Character, nickname: string) {
  const normalized = text.replace(/\*([^*]+)\*/g, (_, narration: string) =>
    wrapNarration(normalizeNarrationPerspective(narration, character, nickname)),
  )
  return cleanRoleMarkers(normalized, character, nickname)
}

function removeLeadingMetaEcho(line: string) {
  const firstKorean = line.search(/[가-힣]/)
  if (firstKorean <= 0) return line
  const prefix = line.slice(0, firstKorean)
  if (!/[a-z]/i.test(prefix)) return line
  if (!/(user|character|setting|format|dialogue|action|meta|label|asterisk|address|keep|short|immersive|tone|nickname)/i.test(prefix)) {
    return line
  }
  return line.slice(firstKorean).trim()
}

function isMetaOnlyLine(line: string) {
  const metaPrefix =
    /^(User says|Character(?: Traits)?|User Nickname|Tone|Format|The user's|The user|Given|Setting|Reasoning|Analysis|Plan|Response|Output|Adult creative chatbot\?|Character traits maintained\?|Format followed\?|No parentheses\?|No meta|No labels|Use asterisks|Use \*|Address the user|Keep it short|Keep the reply|A simple)/i

  if (metaPrefix.test(line)) return true
  if (/^(Yes|No)\.?$/i.test(line)) return true

  const koreanCount = (line.match(/[가-힣]/g) || []).length
  const latinCount = (line.match(/[a-z]/gi) || []).length
  if (koreanCount === 0 && latinCount > 0) return true
  return (
    koreanCount > 0 &&
    latinCount > koreanCount &&
    /\b(you're|you are|planning|dialogue|action|format|character|setting|tone|meta|labels|asterisks)\b/i.test(line)
  )
}

function repairNarrationStars(line: string) {
  if (!line.endsWith('*') || line.startsWith('*')) return line
  return wrapNarration(line.replace(/\*+$/g, ''))
}

export function cleanupReply(raw: string, character: Character, nickname: string) {
  const labeledParts: string[] = []
  const cleanLines: string[] = []
  const taggedReply = raw.match(/<reply>([\s\S]*?)<\/reply>/i)?.[1]
  const sourceText = taggedReply || raw

  sourceText
    .replace(/\r\n/g, '\n')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<\/?reply>/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((line) => line.trim())
    .forEach((originalLine) => {
      const line = repairNarrationStars(
        removeLeadingMetaEcho(originalLine)
          .replace(/^(Adult creative chatbot\?|Character traits maintained\?|Format followed\?|No parentheses\?)\s*(Yes|No)\.?\s*/i, '')
          .trim(),
      )

      if (!line || isMetaOnlyLine(line)) return

      const action = line.match(/^(Action|Emotion|Narration|Description)\s*:\s*(.+)$/i)
      if (action) {
        const wrapped = wrapNarration(action[2])
        if (wrapped) labeledParts.push(wrapped)
        return
      }

      const dialogue = line.match(/^Dialogue\s*:\s*(.+)$/i)
      if (dialogue) {
        const text = dialogue[1].trim().replace(/^["“]|["”]$/g, '')
        if (text) labeledParts.push(text)
        return
      }

      cleanLines.push(line)
    })

  const source = cleanLines.length > 0 ? cleanLines : labeledParts
  const unique = source.filter((line, index) => {
    const normalized = line.replace(/\s+/g, ' ').replace(/^\*|\*$/g, '').trim()
    return source.findIndex((item) => item.replace(/\s+/g, ' ').replace(/^\*|\*$/g, '').trim() === normalized) === index
  })

  const paragraphs = unique.join('\n\n').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const first = paragraphs[0]
  if (
    first &&
    paragraphs.length > 1 &&
    !first.startsWith('*') &&
    /(시선|눈빛|표정|미소|손끝|숨|고개|찻잔|바라본다|내려놓|웃는다|앉|기대|돌린다|멈춘다|떨며|띤다)/.test(first)
  ) {
    paragraphs[0] = wrapNarration(first)
  }

  return normalizeReplyNarration(paragraphs.join('\n\n').trim(), character, nickname)
}

function cleanSuggestionItem(value: string) {
  const trimmed = value.trim()
  const keepNarrationStars = trimmed.startsWith('*') && trimmed.endsWith('*')
  return (keepNarrationStars ? trimmed : trimmed.replace(/^[-\d.)\s]+/, ''))
    .replace(/^(추천|답변|프롬프트)\s*\d*\s*[:：]\s*/i, '')
    .replace(/^["“”']|["“”']$/g, '')
    .trim()
}

export function parseSuggestions(raw: string) {
  const jsonText = raw.match(/\[[\s\S]*\]/)?.[0]
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((item) => cleanSuggestionItem(String(item))).filter(Boolean).slice(0, 3)
      }
    } catch {
      // Fall through.
    }
  }

  return raw
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n+/)
    .map(cleanSuggestionItem)
    .filter((item) => item && !/^\[|\]$/.test(item))
    .slice(0, 3)
}

export function parseCastProfile(raw: string): Partial<CastMember> | null {
  try {
    const withoutBlocks = raw
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim()
    const jsonText = withoutBlocks.match(/\{[\s\S]*\}/)?.[0] || withoutBlocks
    return JSON.parse(jsonText) as Partial<CastMember>
  } catch {
    return null
  }
}

export function fallbackSuggestions(
  character: Character,
  castMembers: CastMember[],
  nickname: string,
  pageIndex: number,
) {
  const userName = displayNickname(nickname)
  const botName = narrationCharacterName(character)
  const extraCast = castMembers.find((member) => member.name !== character.title)
  const secondSpeaker = extraCast || castMembers[0] || characterToCast(character)
  const pages = [
    [
      `${botName}, 방금 말 진심이야?`,
      `*${withJosa(userName, '이/가')} 잠시 말을 고르며 ${withJosa(botName, '을/를')} 바라본다.*`,
      `조금만 더 솔직하게 말해줘.`,
    ],
    [
      `@${secondSpeaker.name} 지금 분위기, 네가 먼저 바꿔봐.`,
      `*${withJosa(userName, '이/가')} 한 걸음 가까이 다가서며 대답을 기다린다.*`,
      `그 말, 나한테 어떤 의미로 한 거야?`,
    ],
    [
      `도망치지 말고 여기서 끝까지 말해줘.`,
      `*잠깐의 침묵 사이로 두 사람의 시선이 엇갈린다.*`,
      `네가 원하는 다음 장면을 직접 말해줘.`,
    ],
  ]

  return pages[pageIndex % pages.length]
}

export function suggestionContext(messages: ChatMessage[], nickname: string) {
  return messages
    .filter((message) => message.sender !== 'system')
    .slice(-10)
    .map((message) => {
      const speaker =
        message.sender === 'assistant'
          ? '챗봇'
          : message.sender === 'cast'
            ? message.speakerName || '추가 인물'
            : displayNickname(nickname)
      return `${speaker}: ${message.text}`
    })
    .join('\n')
}

export function normalizeMentionName(value: string) {
  return value.replace(/\s/g, '').toLowerCase()
}

export function mentionAliases(member: CastMember) {
  const firstWord = member.name.split(/\s+/)[0]
  const koreanPrefix = member.name.match(/^[가-힣]+/)?.[0]
  return Array.from(
    new Set(
      [member.name, firstWord, koreanPrefix].filter(
        (alias): alias is string => Boolean(alias && alias.length >= 2),
      ),
    ),
  )
}

function mentionRemainderForAlias(body: string, alias: string) {
  const expected = normalizeMentionName(alias)
  let collected = ''

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]
    if (/\s/.test(character)) continue
    collected += character.toLowerCase()
    if (!expected.startsWith(collected)) return null
    if (collected === expected) return body.slice(index + 1)
  }

  return collected === expected ? '' : null
}

function mentionRemainder(body: string, member: CastMember) {
  for (const alias of mentionAliases(member).sort((a, b) => b.length - a.length)) {
    const rest = mentionRemainderForAlias(body, alias)
    if (rest !== null) return rest
  }

  return null
}

export function parseSpeakerDraft(text: string, castMembers: CastMember[]) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('@')) return { text: trimmed }

  const body = trimmed.slice(1)
  const exactSpeaker = [...castMembers]
    .sort((a, b) => b.name.length - a.name.length)
    .find((member) => mentionRemainder(body, member) !== null)

  if (exactSpeaker) {
    const rest = mentionRemainder(body, exactSpeaker) || ''
    return { text: rest.trim(), speaker: exactSpeaker }
  }

  const match = trimmed.match(/^@([^\s]+)\s+([\s\S]+)/)
  if (!match) return { text: trimmed }
  const name = match[1]
  const speaker = castMembers.find((member) =>
    mentionAliases(member).some((alias) => normalizeMentionName(alias) === normalizeMentionName(name)),
  )
  return speaker ? { text: match[2].trim(), speaker } : { text: trimmed }
}

export function richSegments(text: string) {
  const parts: Array<{ kind: 'dialogue' | 'narration'; text: string }> = []
  const pattern = /\*([^*]+)\*|\(([^()]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'dialogue', text: text.slice(lastIndex, match.index) })
    }
    parts.push({ kind: 'narration', text: match[1] || match[2] })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push({ kind: 'dialogue', text: text.slice(lastIndex) })
  }

  return parts
}
