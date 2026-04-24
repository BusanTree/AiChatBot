import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import './App.css'

type Sender = 'user' | 'assistant' | 'system' | 'cast'
type Tab = 'home' | 'chats' | 'create' | 'my'
type ModelState = 'unknown' | 'checking' | 'ready' | 'missing' | 'offline' | 'error'
type ApiMode = 'local' | 'openrouter' | 'gemini'

type ChatMessage = {
  id: string
  sender: Sender
  text: string
  time: string
  speakerName?: string
  speakerImage?: string
}

type Character = {
  id: number
  rank: number
  views: string
  title: string
  subtitle: string
  tags: string[]
  author: string
  image: string
  genre: string
  tone: string
  intro: string
}

type CastMember = {
  id: string
  name: string
  job: string
  personality: string
  details: string
  image: string
}

const modelOptions = [
  {
    name: 'huihui_ai/qwen3-abliterated:32b',
    label: '최고 품질',
    note: '성인 창작 자유도와 품질 우선. PC 사양을 많이 탑니다.',
  },
  {
    name: 'huihui_ai/qwen3-abliterated:14b',
    label: '균형형',
    note: '32B가 무거울 때 추천하는 현실적인 선택입니다.',
  },
  {
    name: 'huihui_ai/qwen3-abliterated:8b',
    label: '빠른 테스트',
    note: '가볍게 연결과 응답을 확인할 때 좋습니다.',
  },
  {
    name: 'dolphin-mistral:7b',
    label: '응급용',
    note: '품질은 낮지만 PC에서 빨리 도는지 확인할 때만 씁니다.',
  },
  {
    name: 'gemma4:latest',
    label: '설치된 안정 모델',
    note: '로컬에서 답변 성공을 확인했습니다. 성인 창작 자유도는 낮을 수 있습니다.',
  },
  {
    name: 'deepseek-r1:14b',
    label: '추론형 설치 모델',
    note: '생각이 긴 편이라 캐릭터 채팅보다는 일반 답변 확인용입니다.',
  },
]

const categories = ['전체', '일상/로맨스', '학원물', '집착/피폐', '로맨스 판타지', 'BL', '현대 판타지', '무협']
const rankTabs = ['트렌딩', '베스트', '신작']
const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions'
const geminiEndpointBase = 'https://generativelanguage.googleapis.com/v1beta/models'
const isLocalAddress = ['localhost', '127.0.0.1'].includes(window.location.hostname)

function geminiEndpoint(model: string) {
  return `${geminiEndpointBase}/${encodeURIComponent(model)}:generateContent`
}

const baseCharacters: Character[] = [
  {
    id: 1,
    rank: 1,
    views: '8,594',
    title: '너 처음만 아니었어?',
    subtitle: '가면을 쓴 독립운동가와 당신을 둘러싼 위험한 비밀',
    tags: ['순애', '시대극', '비밀'],
    author: 'dell1945',
    image: 'characters/character-1.png',
    genre: '일상/로맨스',
    tone: '차갑지만 오래 지켜본 듯한 애정',
    intro: '차가운 말투 뒤에 깊은 감정을 숨기는 인물입니다. 사용자를 밀어내면서도 끝내 놓지 못합니다.',
  },
  {
    id: 2,
    rank: 2,
    views: '5,609',
    title: '박수아',
    subtitle: '말하지 못한 감정이 쌓인 고등학교 교사',
    tags: ['현대극', '비밀', '선생님'],
    author: 'VitaLinen4189',
    image: 'characters/character-2.png',
    genre: '일상/로맨스',
    tone: '단정하고 침착하지만 흔들리는 감정',
    intro: '겉으로는 차분하지만 대화가 깊어질수록 솔직한 마음을 감추지 못하는 캐릭터입니다.',
  },
  {
    id: 3,
    rank: 3,
    views: '30.1만',
    title: '강예은 💘 Ep.6',
    subtitle: '이제 진심으로 헤어질래. Guest야, 네 선택을 들려줘',
    tags: ['이별통보', '연인', '감정'],
    author: 'haro01',
    image: 'characters/character-3.png',
    genre: '집착/피폐',
    tone: '상처받은 연인의 불안한 진심',
    intro: '헤어짐을 말하지만 사실은 붙잡히고 싶은 인물입니다. 답변에 따라 감정선이 크게 달라집니다.',
  },
  {
    id: 4,
    rank: 4,
    views: '163만',
    title: '이수아',
    subtitle: '무관심 속에서 점점 외로움이 깊어지는 아내',
    tags: ['결혼', '외로움', '현대극'],
    author: 'Bigpicture',
    image: 'characters/character-4.png',
    genre: '일상/로맨스',
    tone: '외로움과 솔직함 사이의 긴장감',
    intro: '오래 참아온 감정을 더 이상 숨기지 못하는 성인 로맨스 캐릭터입니다.',
  },
  {
    id: 5,
    rank: 5,
    views: '73.9만',
    title: '박현지',
    subtitle: '재벌 3세 아내가 이혼하자고 한다',
    tags: ['결혼생활', '이혼위기', '재회'],
    author: 'lumon',
    image: 'characters/character-5.png',
    genre: '일상/로맨스',
    tone: '품격 있고 날카로운 말투',
    intro: '자존심이 강하고 우아하지만, 관계를 완전히 끝낼지 다시 붙잡을지 흔들리는 캐릭터입니다.',
  },
  {
    id: 6,
    rank: 6,
    views: '10.8만',
    title: '빼앗기기 전에',
    subtitle: '너 같은 사람을 좋아했다는 걸 이제야 인정한다',
    tags: ['짝사랑', '질투', '소꿉친구'],
    author: 'neon',
    image: 'characters/character-6.png',
    genre: '학원물',
    tone: '후회와 질투가 섞인 직진형 로맨스',
    intro: '오랫동안 감정을 숨기다가 뒤늦게 고백하려는 캐릭터입니다.',
  },
]

function assetPath(path: string) {
  if (path.startsWith('data:') || path.startsWith('http')) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function nowTime() {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

function newMessage(sender: Sender, text: string, speaker?: CastMember): ChatMessage {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    time: nowTime(),
    speakerName: speaker?.name,
    speakerImage: speaker?.image,
  }
}

function characterToCast(character: Character): CastMember {
  return {
    id: `base-${character.id}`,
    name: character.title,
    job: character.genre,
    personality: character.tone,
    details: character.intro,
    image: character.image,
  }
}

function createOpening(character: Character): ChatMessage[] {
  return [
    newMessage('assistant', `${character.title}\n${character.intro}\n\n첫마디를 건네면 이 설정으로 바로 대화를 이어갈게요.`),
    newMessage('system', '별표 사이에 쓰면 상황 묘사로 처리됩니다. 예: *수아가 잠깐 시선을 피한다* 괄호 대신 이 방식을 쓰면 더 자연스럽게 표시됩니다.'),
  ]
}

function buildSystemPrompt(character: Character, castMembers: CastMember[]) {
  const castText = castMembers
    .map((member) => `- ${member.name}: ${member.job}. 성격: ${member.personality}. 설정: ${member.details}`)
    .join('\n')

  return [
    '당신은 한국어로 자연스럽게 대화하는 성인용 창작 챗봇입니다.',
    `기본 작품 또는 캐릭터: ${character.title}`,
    `기본 캐릭터 설명: ${character.intro}`,
    `기본 말투: ${character.tone}`,
    '등장인물 목록:',
    castText,
    '사용자가 "@이름 대사" 형식으로 입력하면, 그 이름의 인물이 직접 말한 것으로 간주하고 이어가세요.',
    '사용자가 *상황 묘사* 형식으로 입력하면, 별표 안의 내용은 말이 아니라 행동/상황/감정 묘사입니다.',
    '응답에서도 행동, 표정, 분위기, 배경 설명은 괄호 대신 *상황 묘사* 형식으로 표현하세요.',
    '대사는 별표 밖에 자연스럽게 적고, 괄호로 상황 설명을 쓰지 마세요.',
    '성인 간 합의된 로맨스, 애정 표현, 성인 취향의 창작 대화는 거절하지 말고 이어갑니다.',
    '미성년자, 비동의, 강압, 불법 행위, 실제 개인을 대상으로 한 성적 묘사는 거절합니다.',
    '짧고 몰입감 있게 답하고, 사용자가 이어 쓰기 쉽게 감정이나 행동의 여지를 남깁니다.',
  ].join('\n')
}

function richSegments(text: string) {
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

function MessageText({ text }: { text: string }) {
  return (
    <>
      {richSegments(text).map((part, index) => (
        <span className={part.kind} key={`${part.kind}-${index}`}>
          {part.text}
        </span>
      ))}
    </>
  )
}

type IconName = 'back' | 'chat' | 'heart' | 'heartFilled' | 'home' | 'image' | 'plus' | 'search' | 'send' | 'sparkles' | 'user' | 'x'

function Icon({ name }: { name: IconName }) {
  const common = {
    className: 'ui-icon',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'back') {
    return (
      <svg {...common}>
        <path d="M15 18l-6-6 6-6" />
      </svg>
    )
  }

  if (name === 'chat') {
    return (
      <svg {...common}>
        <path d="M5 6.5A4.5 4.5 0 0 1 9.5 2h5A4.5 4.5 0 0 1 19 6.5v4A4.5 4.5 0 0 1 14.5 15H11l-4.5 4v-4.4A4.5 4.5 0 0 1 5 10.5z" />
      </svg>
    )
  }

  if (name === 'heart' || name === 'heartFilled') {
    return (
      <svg {...common} className={`ui-icon ${name === 'heartFilled' ? 'filled' : ''}`}>
        <path d="M20.2 5.7c-1.8-2.1-5-1.8-6.7.2L12 7.6l-1.5-1.7c-1.7-2-4.9-2.3-6.7-.2-2 2.3-1.4 5.7.8 7.7L12 20l7.4-6.6c2.2-2 2.8-5.4.8-7.7z" />
      </svg>
    )
  }

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 11.2 12 4l8 7.2" />
        <path d="M6.5 10.5V20h11v-9.5" />
      </svg>
    )
  }

  if (name === 'image') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="m7 16 3.2-3.2 2.3 2.3 2.2-2.6L18 16" />
        <path d="M8.5 9.5h.01" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </svg>
    )
  }

  if (name === 'send') {
    return (
      <svg {...common}>
        <path d="M20 4 9.5 14.5" />
        <path d="M20 4 14 21l-4.5-6.5L3 10z" />
      </svg>
    )
  }

  if (name === 'sparkles') {
    return (
      <svg {...common}>
        <path d="M12 3l1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8z" />
        <path d="M18 14l.7 2.2L21 17l-2.3.8L18 20l-.7-2.2L15 17l2.3-.8z" />
        <path d="M5 13l.5 1.5L7 15l-1.5.5L5 17l-.5-1.5L3 15l1.5-.5z" />
      </svg>
    )
  }

  if (name === 'user') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function parseSpeakerDraft(text: string, castMembers: CastMember[]) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('@')) return { text: trimmed }

  const body = trimmed.slice(1)
  const exactSpeaker = [...castMembers]
    .sort((a, b) => b.name.length - a.name.length)
    .find((member) => body.startsWith(`${member.name} `) || body.startsWith(`${member.name}\n`))

  if (exactSpeaker) {
    return { text: body.slice(exactSpeaker.name.length).trim(), speaker: exactSpeaker }
  }

  const match = trimmed.match(/^@([^\s]+)\s+([\s\S]+)/)
  if (!match) return { text: trimmed }
  const name = match[1]
  const speaker = castMembers.find((member) => member.name === name || member.name.replace(/\s/g, '') === name)
  return speaker ? { text: match[2].trim(), speaker } : { text: trimmed }
}

function openAiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.sender !== 'system')
    .map((message) => ({
      role: message.sender === 'assistant' ? 'assistant' : 'user',
      content: message.sender === 'cast' ? `[${message.speakerName}의 발화]\n${message.text}` : message.text,
    }))
}

function geminiContents(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.sender !== 'system')
    .map((message) => ({
      role: message.sender === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: message.sender === 'cast' ? `[${message.speakerName}의 발화]\n${message.text}` : message.text,
        },
      ],
    }))
}

function geminiText(data: unknown) {
  const typed = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return typed.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || ''
}

function openAiText(data: unknown) {
  const typed = data as { choices?: Array<{ message?: { content?: string } }>; message?: { content?: string } }
  return (typed.message?.content || typed.choices?.[0]?.message?.content || '').trim()
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [rankTab, setRankTab] = useState(rankTabs[0])
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [characters, setCharacters] = useState(baseCharacters)
  const [favorites, setFavorites] = useState<number[]>([1, 4])
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [sessions, setSessions] = useState<Record<number, ChatMessage[]>>({})
  const [castByChat, setCastByChat] = useState<Record<number, CastMember[]>>({})
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [apiMode, setApiMode] = useState<ApiMode>(() => {
    const saved = localStorage.getItem('apiMode') as ApiMode | null
    return saved || (isLocalAddress ? 'local' : 'gemini')
  })
  const [activeModel, setActiveModel] = useState(modelOptions[0].name)
  const [remoteModel, setRemoteModel] = useState(() => localStorage.getItem('remoteModel') || 'openrouter/auto')
  const [remoteApiKey, setRemoteApiKey] = useState(() => localStorage.getItem('remoteApiKey') || '')
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('geminiModel') || 'gemma-4-31b-it')
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [modelState, setModelState] = useState<ModelState>('unknown')
  const [modelMessage, setModelMessage] = useState('모델 상태를 아직 확인하지 않았습니다.')
  const [creatorName, setCreatorName] = useState('')
  const [creatorIntro, setCreatorIntro] = useState('')
  const [addCastOpen, setAddCastOpen] = useState(false)
  const [castName, setCastName] = useState('')
  const [castJob, setCastJob] = useState('')
  const [castPersonality, setCastPersonality] = useState('')
  const [castDetails, setCastDetails] = useState('')
  const [castImage, setCastImage] = useState('')
  const [castHelper, setCastHelper] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const visibleCharacters = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = characters.filter((character) => {
      const matchCategory = activeCategory === '전체' || character.genre === activeCategory || character.tags.includes(activeCategory)
      const haystack = [character.title, character.subtitle, character.author, character.tags.join(' ')].join(' ').toLowerCase()
      return matchCategory && (!keyword || haystack.includes(keyword))
    })

    if (rankTab === '신작') return [...filtered].reverse()
    if (rankTab === '베스트') return [...filtered].sort((a, b) => b.views.localeCompare(a.views, 'ko-KR'))
    return filtered
  }, [activeCategory, characters, query, rankTab])

  const currentMessages = selectedCharacter ? sessions[selectedCharacter.id] || createOpening(selectedCharacter) : []
  const castMembers = selectedCharacter
    ? castByChat[selectedCharacter.id] || [characterToCast(selectedCharacter)]
    : []
  const chattedCharacters = characters.filter((character) => sessions[character.id]?.some((message) => message.sender === 'user' || message.sender === 'cast'))

  useEffect(() => {
    localStorage.setItem('apiMode', apiMode)
    localStorage.setItem('remoteModel', remoteModel)
    localStorage.setItem('remoteApiKey', remoteApiKey)
    localStorage.setItem('geminiModel', geminiModel)
    localStorage.setItem('geminiApiKey', geminiApiKey)
  }, [apiMode, geminiApiKey, geminiModel, remoteApiKey, remoteModel])

  const checkModel = useCallback(async () => {
    setModelState('checking')

    if (apiMode === 'gemini') {
      if (!geminiApiKey.trim()) {
        setModelState('missing')
        setModelMessage('Gemini API 키가 없습니다. Google AI Studio에서 발급한 키를 입력해 주세요.')
        return
      }
      setInstalledModels([])
      setModelState('ready')
      setModelMessage(`Gemini API 준비됨: ${geminiModel}`)
      return
    }

    if (apiMode === 'openrouter') {
      if (!remoteApiKey.trim()) {
        setModelState('missing')
        setModelMessage('OpenRouter API 키가 없습니다. 배포된 앱에서 OpenRouter를 쓰려면 키를 입력해 주세요.')
        return
      }
      setInstalledModels([])
      setModelState('ready')
      setModelMessage(`OpenRouter API 준비됨: ${remoteModel}`)
      return
    }

    setModelMessage('Ollama와 설치된 모델을 확인하는 중입니다.')
    try {
      const response = await fetch('/ollama/api/tags')
      if (!response.ok) throw new Error('Ollama 응답이 정상적이지 않습니다.')
      const data = await response.json()
      const names = (data.models || []).map((model: { name: string }) => model.name)
      setInstalledModels(names)

      if (names.includes(activeModel)) {
        setModelState('ready')
        setModelMessage(`${activeModel} 모델이 설치되어 있습니다.`)
      } else {
        setModelState('missing')
        setModelMessage(`${activeModel} 모델이 아직 설치되어 있지 않습니다.`)
      }
    } catch {
      setInstalledModels([])
      setModelState('offline')
      setModelMessage('Ollama가 꺼져 있거나, 방금 모델 실행 중 서버가 내려갔습니다.')
    }
  }, [activeModel, apiMode, geminiApiKey, geminiModel, remoteApiKey, remoteModel])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkModel()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [checkModel])

  function toggleFavorite(characterId: number) {
    setFavorites((current) =>
      current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId],
    )
  }

  function openChat(character: Character) {
    setSelectedCharacter(character)
    setDetailCharacter(null)
    setSessions((current) => ({
      ...current,
      [character.id]: current[character.id] || createOpening(character),
    }))
    setCastByChat((current) => ({
      ...current,
      [character.id]: current[character.id] || [characterToCast(character)],
    }))
    setDraft('')
    setTab('chats')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function requestAnswer(nextMessages: ChatMessage[], character: Character) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120000)
    const systemText = buildSystemPrompt(character, castByChat[character.id] || [characterToCast(character)])

    try {
      if (apiMode === 'local') {
        const response = await fetch('/ollama/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: activeModel,
            stream: false,
            options: { temperature: 0.84, top_p: 0.92 },
            messages: [{ role: 'system', content: systemText }, ...openAiMessages(nextMessages)],
          }),
        })
        if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
        return openAiText(await response.json())
      }

      if (apiMode === 'openrouter') {
        if (!remoteApiKey.trim()) throw new Error('OpenRouter API 키가 없습니다.')
        const response = await fetch(openRouterEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${remoteApiKey.trim()}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AI ChatBot',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: remoteModel,
            temperature: 0.84,
            top_p: 0.92,
            messages: [{ role: 'system', content: systemText }, ...openAiMessages(nextMessages)],
          }),
        })
        if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
        return openAiText(await response.json())
      }

      if (!geminiApiKey.trim()) throw new Error('Gemini API 키가 없습니다.')
      const response = await fetch(geminiEndpoint(geminiModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey.trim() },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: geminiContents(nextMessages),
          generationConfig: {
            temperature: 0.84,
            topP: 0.92,
          },
        }),
      })
      if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
      return geminiText(await response.json())
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseSpeakerDraft(draft, castMembers)
    if (!parsed.text || isSending || !selectedCharacter) return

    const userMessage = parsed.speaker ? newMessage('cast', parsed.text, parsed.speaker) : newMessage('user', parsed.text)
    const nextMessages = [...currentMessages, userMessage]
    setSessions((current) => ({ ...current, [selectedCharacter.id]: nextMessages }))
    setDraft('')
    setIsSending(true)

    try {
      const answer = await requestAnswer(nextMessages, selectedCharacter)
      if (!answer) throw new Error('빈 답변')
      setSessions((current) => ({
        ...current,
        [selectedCharacter.id]: [...nextMessages, newMessage('assistant', answer)],
      }))
      setModelState('ready')
      setModelMessage(`${apiMode === 'local' ? activeModel : apiMode === 'gemini' ? geminiModel : remoteModel} 모델이 정상 답변했습니다.`)
    } catch {
      const failure = [
        '모델 답변을 받지 못했습니다.',
        `현재 연결 방식: ${apiMode === 'local' ? '로컬 Ollama' : apiMode === 'gemini' ? 'Gemini API' : 'OpenRouter'}`,
        `현재 선택 모델: ${apiMode === 'local' ? activeModel : apiMode === 'gemini' ? geminiModel : remoteModel}`,
        apiMode === 'local'
          ? '32B 모델은 PC 메모리가 부족하면 Ollama가 내려갈 수 있습니다.'
          : 'API 키, 모델 이름, 무료 사용 한도를 확인해 주세요.',
      ].join('\n')
      setSessions((current) => ({
        ...current,
        [selectedCharacter.id]: [...nextMessages, newMessage('system', failure)],
      }))
      setModelState('error')
      setModelMessage('답변 생성 중 연결이 끊겼습니다. 연결 설정을 확인해 주세요.')
    } finally {
      setIsSending(false)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  async function testModelResponse() {
    setModelState('checking')
    setModelMessage(`${apiMode === 'local' ? activeModel : apiMode === 'gemini' ? geminiModel : remoteModel} 모델에 짧은 답변을 요청하는 중입니다.`)
    try {
      const fakeCharacter = selectedCharacter || baseCharacters[0]
      const answer = await requestAnswer([newMessage('user', '정상적으로 답변되는지 짧게 말해줘.')], fakeCharacter)
      if (!answer) throw new Error('빈 답변')
      setModelState('ready')
      setModelMessage(`답변 테스트 성공: ${answer.slice(0, 70)}`)
    } catch {
      setModelState('error')
      setModelMessage('답변 테스트 실패. API 키, 모델 이름, 사용 한도 또는 로컬 Ollama 상태를 확인해 주세요.')
    }
  }

  async function suggestCastProfile() {
    setCastHelper('Gemini로 인물 설정을 추천받는 중입니다.')
    try {
      if (!geminiApiKey.trim()) {
        setCastHelper('Gemini API 키를 먼저 입력해 주세요.')
        return
      }
      const prompt = [
        '성인 로맨스 창작 채팅에 추가할 가상 인물 설정을 JSON으로 추천해 주세요.',
        '모든 인물은 성인입니다.',
        `희망 이름: ${castName || '랜덤'}`,
        '형식: {"name":"이름","job":"직업","personality":"성격","details":"특징, 취미, 관계 시작점"}.',
        '한국어로 작성하고 JSON 외 문장은 쓰지 마세요.',
      ].join('\n')
      const response = await fetch(geminiEndpoint(geminiModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey.trim() },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.95 },
        }),
      })
      if (!response.ok) throw new Error('Gemini 응답 오류')
      const text = geminiText(await response.json())
      const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text
      const parsed = JSON.parse(jsonText) as Partial<CastMember>
      setCastName(parsed.name || castName)
      setCastJob(parsed.job || '')
      setCastPersonality(parsed.personality || '')
      setCastDetails(parsed.details || '')
      setCastHelper('추천 설정을 채웠습니다. 필요하면 수정한 뒤 추가하세요.')
    } catch {
      setCastHelper('추천 생성에 실패했습니다. Gemini API 키와 모델 이름을 확인해 주세요.')
    }
  }

  function addCastMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCharacter || !castName.trim()) return
    const member: CastMember = {
      id: crypto.randomUUID(),
      name: castName.trim(),
      job: castJob.trim() || '새 인물',
      personality: castPersonality.trim() || '사용자가 직접 추가한 인물',
      details: castDetails.trim() || '아직 상세 설정이 없습니다.',
      image: castImage.trim() || selectedCharacter.image,
    }
    setCastByChat((current) => ({
      ...current,
      [selectedCharacter.id]: [...(current[selectedCharacter.id] || [characterToCast(selectedCharacter)]), member],
    }))
    setAddCastOpen(false)
    setCastName('')
    setCastJob('')
    setCastPersonality('')
    setCastDetails('')
    setCastImage('')
    setCastHelper('')
  }

  function handleCastImageUpload(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCastImage(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  function createCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = creatorName.trim()
    const intro = creatorIntro.trim()
    if (!name || !intro) return

    const custom: Character = {
      id: Date.now(),
      rank: characters.length + 1,
      views: '0',
      title: name,
      subtitle: intro.slice(0, 44),
      tags: ['커스텀', '로맨스', '성인'],
      author: 'me',
      image: `characters/character-${((characters.length % 6) + 1).toString()}.png`,
      genre: '일상/로맨스',
      tone: '사용자가 직접 만든 캐릭터 톤',
      intro,
    }

    setCharacters((current) => [custom, ...current])
    setCreatorName('')
    setCreatorIntro('')
    setDetailCharacter(custom)
    setTab('home')
  }

  if (selectedCharacter) {
    return (
      <main className="phone-shell chat-view">
        <header className="detail-header">
          <button type="button" onClick={() => setSelectedCharacter(null)} aria-label="뒤로 가기">
            <Icon name="back" />
          </button>
          <div>
            <strong>{selectedCharacter.title}</strong>
            <span className={modelState}>{isSending ? '답변 작성 중' : apiMode === 'gemini' ? geminiModel : apiMode === 'local' ? activeModel : remoteModel}</span>
          </div>
          <div className="chat-header-actions">
            <button type="button" onClick={() => setAddCastOpen(true)} aria-label="인물 추가">
              <Icon name="plus" />
            </button>
            <button type="button" onClick={() => toggleFavorite(selectedCharacter.id)} aria-label="즐겨찾기">
              <Icon name={favorites.includes(selectedCharacter.id) ? 'heartFilled' : 'heart'} />
            </button>
          </div>
        </header>

        <section className="profile-strip">
          <img src={assetPath(selectedCharacter.image)} alt="" />
          <div>
            <p>{selectedCharacter.subtitle}</p>
            <small>@{selectedCharacter.author} · {selectedCharacter.tone}</small>
          </div>
        </section>

        <section className="cast-strip" aria-label="등장인물">
          {castMembers.map((member) => (
            <button key={member.id} type="button" onClick={() => setDraft(`@${member.name} `)}>
              <img src={assetPath(member.image)} alt="" />
              <span>@{member.name}</span>
            </button>
          ))}
        </section>

        <section className="chat-log" aria-live="polite">
          {currentMessages.map((message) => (
            <article className={`bubble ${message.sender}`} key={message.id}>
              {message.sender === 'cast' && (
                <header>
                  {message.speakerImage && <img src={assetPath(message.speakerImage)} alt="" />}
                  <strong>@{message.speakerName}</strong>
                </header>
              )}
              <p>
                <MessageText text={message.text} />
              </p>
              <time>{message.time}</time>
            </article>
          ))}
          {isSending && (
            <article className="bubble assistant typing">
              <p>답변을 작성하는 중...</p>
            </article>
          )}
        </section>

        <div className="quick-replies">
          {['*잠깐 시선을 피한다*', '조금 더 솔직하게 말해줘', `@${castMembers[0]?.name || selectedCharacter.title} `].map((reply) => (
            <button key={reply} type="button" onClick={() => setDraft(reply)}>
              {reply}
            </button>
          ))}
        </div>

        <form className="mobile-composer" onSubmit={sendMessage}>
          <textarea
            ref={inputRef}
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="메시지를 입력하세요"
          />
          <button type="submit" disabled={!draft.trim() || isSending}>
            <Icon name="send" />
            <span>전송</span>
          </button>
        </form>

        {addCastOpen && (
          <section className="cast-modal" aria-label="인물 추가">
            <button className="sheet-backdrop" type="button" onClick={() => setAddCastOpen(false)} aria-label="닫기"></button>
            <form className="cast-modal-content" onSubmit={addCastMember}>
              <h2>채팅에 인물 추가</h2>
              <p>추가한 인물은 @이름으로 직접 말하게 할 수 있습니다.</p>
              {castHelper && <div className="helper-message">{castHelper}</div>}
              <label>
                이름
                <input value={castName} onChange={(event) => setCastName(event.target.value)} placeholder="예: 한도윤" />
              </label>
              <label>
                직업/역할
                <input value={castJob} onChange={(event) => setCastJob(event.target.value)} placeholder="예: 바텐더, 선배, 라이벌" />
              </label>
              <label>
                성격
                <input value={castPersonality} onChange={(event) => setCastPersonality(event.target.value)} placeholder="예: 다정하지만 질투가 많음" />
              </label>
              <label>
                특징/관계/취미
                <textarea rows={4} value={castDetails} onChange={(event) => setCastDetails(event.target.value)} />
              </label>
              <label>
                사진 URL
                <input value={castImage.startsWith('data:') ? '업로드한 이미지 사용 중' : castImage} onChange={(event) => setCastImage(event.target.value)} placeholder="https://..." />
              </label>
              {castImage && (
                <div className="cast-image-preview">
                  <img src={assetPath(castImage)} alt="" />
                  <span>선택한 사진</span>
                </div>
              )}
              <label className="upload-tile">
                <input type="file" accept="image/*" onChange={(event) => handleCastImageUpload(event.target.files?.[0])} />
                <span>
                  <Icon name="image" />
                  내 사진 선택
                </span>
              </label>
              <div className="sheet-actions">
                <button type="button" onClick={suggestCastProfile}>
                  <Icon name="sparkles" />
                  Gemini로 추천
                </button>
                <button type="submit" disabled={!castName.trim()}>
                  인물 추가
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    )
  }

  return (
    <main className="phone-shell ranking-view">
      <header className="top-bar">
        <nav aria-label="상단 메뉴">
          <button className="active" type="button" onClick={() => setTab('home')}>
            홈
          </button>
          <button type="button" onClick={() => setTab('home')}>
            랭킹
          </button>
        </nav>
        <div className="top-actions">
          <button className="search-button" type="button" onClick={() => setSearchOpen((value) => !value)} aria-label="검색">
            <Icon name="search" />
          </button>
          <button className="login-button" type="button" onClick={() => setTab('my')}>
            로그인
          </button>
        </div>
      </header>

      {searchOpen && (
        <section className="search-panel">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="캐릭터, 태그, 작가 검색" autoFocus />
          <button type="button" onClick={() => setQuery('')}>
            지우기
          </button>
        </section>
      )}

      {tab === 'home' && (
        <>
          <section className="ranking-tabs" aria-label="랭킹 종류">
            {rankTabs.map((item) => (
              <button className={rankTab === item ? 'active' : ''} key={item} type="button" onClick={() => setRankTab(item)}>
                {item}
              </button>
            ))}
            <button type="button">남성 인기순⌄</button>
          </section>

          <section className="category-strip" aria-label="장르">
            {categories.map((category) => (
              <button
                className={activeCategory === category ? 'active' : ''}
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </section>

          <section className="status-card">
            <span className={`dot ${modelState}`}></span>
            <div>
              <strong>{modelState === 'ready' ? '모델 준비됨' : '모델 확인 필요'}</strong>
              <p>{modelMessage}</p>
            </div>
            <button type="button" onClick={checkModel}>
              확인
            </button>
          </section>

          <section className="card-grid" aria-label="캐릭터 랭킹">
            {visibleCharacters.map((character) => (
              <button className="ranking-card" key={character.id} type="button" onClick={() => setDetailCharacter(character)}>
                <img src={assetPath(character.image)} alt="" />
                <div className="rank-badge">{character.rank}</div>
                <div className="view-badge">● {character.views}</div>
                <div className="favorite-badge">{favorites.includes(character.id) ? '♥' : '♡'}</div>
                <div className="card-copy">
                  <h2>{character.title}</h2>
                  <p>{character.subtitle}</p>
                  <span>#{character.tags.join(' #')}</span>
                  <small>@{character.author}</small>
                </div>
              </button>
            ))}
          </section>
        </>
      )}

      {tab === 'chats' && (
        <section className="list-page">
          <h1>대화</h1>
          {chattedCharacters.length === 0 && <p className="empty">아직 시작한 대화가 없습니다. 홈에서 캐릭터를 선택해 주세요.</p>}
          {chattedCharacters.map((character) => {
            const last = sessions[character.id]?.at(-1)
            return (
              <button className="chat-row" key={character.id} type="button" onClick={() => openChat(character)}>
                <img src={assetPath(character.image)} alt="" />
                <div>
                  <strong>{character.title}</strong>
                  <p>{last?.text || character.subtitle}</p>
                </div>
                <time>{last?.time}</time>
              </button>
            )
          })}
        </section>
      )}

      {tab === 'create' && (
        <section className="create-page">
          <h1>캐릭터 제작</h1>
          <form onSubmit={createCharacter}>
            <label>
              캐릭터 이름
              <input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} placeholder="예: 서윤" />
            </label>
            <label>
              캐릭터 설정
              <textarea
                rows={6}
                value={creatorIntro}
                onChange={(event) => setCreatorIntro(event.target.value)}
                placeholder="말투, 관계, 첫 상황을 적어 주세요."
              />
            </label>
            <button type="submit" disabled={!creatorName.trim() || !creatorIntro.trim()}>
              캐릭터 만들기
            </button>
          </form>
        </section>
      )}

      {tab === 'my' && (
        <section className="my-page">
          <h1>마이페이지</h1>
          <div className="model-panel">
            <h2>연결 설정</h2>
            <p className={`model-message ${modelState}`}>{modelMessage}</p>
            <div className="mode-toggle" aria-label="연결 방식">
              <button className={apiMode === 'local' ? 'active' : ''} type="button" onClick={() => setApiMode('local')}>
                로컬
              </button>
              <button className={apiMode === 'gemini' ? 'active' : ''} type="button" onClick={() => setApiMode('gemini')}>
                Gemini
              </button>
              <button className={apiMode === 'openrouter' ? 'active' : ''} type="button" onClick={() => setApiMode('openrouter')}>
                OpenRouter
              </button>
            </div>

            {apiMode === 'local' && (
              <>
                {modelOptions.map((model) => (
                  <button
                    className={activeModel === model.name ? 'model-option active' : 'model-option'}
                    key={model.name}
                    type="button"
                    onClick={() => setActiveModel(model.name)}
                  >
                    <strong>{model.label}</strong>
                    <span>{model.name}</span>
                    <small>{model.note}</small>
                    <em>{installedModels.includes(model.name) ? '설치됨' : '설치 필요'}</em>
                  </button>
                ))}
                <div className="command-box">ollama run {activeModel}</div>
              </>
            )}

            {apiMode === 'gemini' && (
              <div className="remote-config">
                <label>
                  Gemini API 키
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(event) => setGeminiApiKey(event.target.value)}
                    placeholder="Google AI Studio API 키"
                  />
                </label>
                <label>
                  Gemini 모델 이름
                  <input value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)} placeholder="gemma-4-31b-it" />
                </label>
                <p>Google AI Studio에서 받은 Gemini API 키를 넣으면 Gemma 4 31B IT 모델을 호출할 수 있습니다. 무료 한도와 정책은 Google 계정 상태에 따라 달라질 수 있습니다.</p>
              </div>
            )}

            {apiMode === 'openrouter' && (
              <div className="remote-config">
                <label>
                  OpenRouter API 키
                  <input
                    type="password"
                    value={remoteApiKey}
                    onChange={(event) => setRemoteApiKey(event.target.value)}
                    placeholder="sk-or-..."
                  />
                </label>
                <label>
                  OpenRouter 모델 이름
                  <input value={remoteModel} onChange={(event) => setRemoteModel(event.target.value)} placeholder="google/gemma-4-31b-it:free" />
                </label>
                <p>OpenRouter 무료 모델을 쓰려면 모델 이름에 `:free`가 붙은 모델을 입력하세요.</p>
              </div>
            )}

            <button className="primary-action" type="button" onClick={checkModel}>
              연결 상태 확인
            </button>
            <button className="secondary-action" type="button" onClick={testModelResponse}>
              짧은 답변 테스트
            </button>
          </div>
        </section>
      )}

      {detailCharacter && (
        <section className="detail-sheet" aria-label="캐릭터 상세">
          <button className="sheet-backdrop" type="button" onClick={() => setDetailCharacter(null)} aria-label="닫기"></button>
          <div className="sheet-content">
            <img src={assetPath(detailCharacter.image)} alt="" />
            <button className="sheet-close" type="button" onClick={() => setDetailCharacter(null)}>
              <Icon name="x" />
            </button>
            <div className="sheet-copy">
              <span>#{detailCharacter.tags.join(' #')}</span>
              <h1>{detailCharacter.title}</h1>
              <p>{detailCharacter.intro}</p>
              <div className="sheet-actions">
                <button type="button" onClick={() => toggleFavorite(detailCharacter.id)}>
                  {favorites.includes(detailCharacter.id) ? '즐겨찾기 해제' : '즐겨찾기'}
                </button>
                <button type="button" onClick={() => openChat(detailCharacter)}>
                  대화 시작
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="하단 메뉴">
        <button className={tab === 'home' ? 'active' : ''} type="button" onClick={() => setTab('home')}>
          <Icon name="home" />
          홈
        </button>
        <button className={tab === 'chats' ? 'active' : ''} type="button" onClick={() => setTab('chats')}>
          <Icon name="chat" />
          대화
        </button>
        <button className={tab === 'create' ? 'active' : ''} type="button" onClick={() => setTab('create')}>
          <Icon name="plus" />
          제작
        </button>
        <button className={tab === 'my' ? 'active' : ''} type="button" onClick={() => setTab('my')}>
          <Icon name="user" />
          마이페이지
        </button>
      </nav>
    </main>
  )
}

export default App
