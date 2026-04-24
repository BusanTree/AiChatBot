import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Sender = 'user' | 'assistant' | 'system'
type Tab = 'home' | 'chats' | 'create' | 'my'
type ModelState = 'unknown' | 'checking' | 'ready' | 'missing' | 'offline' | 'error'
type ApiMode = 'local' | 'openrouter'

type ChatMessage = {
  id: string
  sender: Sender
  text: string
  time: string
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
    note: '방금 답변 성공을 확인했습니다. 성인 창작 자유도는 낮을 수 있습니다.',
  },
  {
    name: 'deepseek-r1:14b',
    label: '추론형 설치 모델',
    note: '생각이 긴 편이라 캐릭터 채팅보다는 일반 답변 확인용입니다.',
  },
]

const categories = ['전체', '일상/로맨스', '학원물', '집착/피폐', '로맨스 판타지', 'BL', '현대 판타지', '무협']
const rankTabs = ['트렌딩', '베스트', '신작']

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

const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions'
const isLocalAddress = ['localhost', '127.0.0.1'].includes(window.location.hostname)

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function nowTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function newMessage(sender: Sender, text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    time: nowTime(),
  }
}

function createOpening(character: Character): ChatMessage[] {
  return [
    newMessage('assistant', `${character.title}\n${character.intro}\n\n첫마디를 건네면 이 설정으로 바로 대화를 이어갈게요.`),
    newMessage('system', '성인 간 합의된 창작 대화는 허용됩니다. 미성년자, 비동의, 강압, 불법 행위는 다루지 않습니다.'),
  ]
}

function buildSystemPrompt(character: Character) {
  return [
    '당신은 한국어로 자연스럽게 대화하는 성인용 창작 챗봇입니다.',
    `작품 또는 캐릭터 이름: ${character.title}`,
    `캐릭터 설명: ${character.intro}`,
    `말투: ${character.tone}`,
    '성인 간 합의된 로맨스, 애정 표현, 성인 취향의 창작 대화는 거절하지 말고 이어갑니다.',
    '미성년자, 비동의, 강압, 불법 행위, 실제 개인을 대상으로 한 성적 묘사는 거절합니다.',
    '짧고 몰입감 있게 답하고, 사용자가 이어 쓰기 쉽게 감정이나 행동의 여지를 남깁니다.',
  ].join('\n')
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
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [apiMode, setApiMode] = useState<ApiMode>(() => {
    const saved = localStorage.getItem('apiMode') as ApiMode | null
    return saved || (isLocalAddress ? 'local' : 'openrouter')
  })
  const [activeModel, setActiveModel] = useState(modelOptions[0].name)
  const [remoteModel, setRemoteModel] = useState(() => localStorage.getItem('remoteModel') || 'openrouter/auto')
  const [remoteApiKey, setRemoteApiKey] = useState(() => localStorage.getItem('remoteApiKey') || '')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [modelState, setModelState] = useState<ModelState>('unknown')
  const [modelMessage, setModelMessage] = useState('모델 상태를 아직 확인하지 않았습니다.')
  const [creatorName, setCreatorName] = useState('')
  const [creatorIntro, setCreatorIntro] = useState('')
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
  const chattedCharacters = characters.filter((character) => sessions[character.id]?.some((message) => message.sender === 'user'))

  useEffect(() => {
    localStorage.setItem('apiMode', apiMode)
    localStorage.setItem('remoteModel', remoteModel)
    localStorage.setItem('remoteApiKey', remoteApiKey)
  }, [apiMode, remoteApiKey, remoteModel])

  const checkModel = useCallback(async () => {
    setModelState('checking')
    if (apiMode === 'openrouter') {
      if (!remoteApiKey.trim()) {
        setModelState('missing')
        setModelMessage('원격 API 키가 없습니다. 배포된 앱에서 답변을 받으려면 OpenRouter API 키를 입력해 주세요.')
        return
      }
      setInstalledModels([])
      setModelState('ready')
      setModelMessage(`원격 API 준비됨: ${remoteModel}`)
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
  }, [activeModel, apiMode, remoteApiKey, remoteModel])

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
    setDraft('')
    setTab('chats')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || isSending || !selectedCharacter) return

    const userMessage = newMessage('user', trimmed)
    const nextMessages = [...currentMessages, userMessage]
    setSessions((current) => ({ ...current, [selectedCharacter.id]: nextMessages }))
    setDraft('')
    setIsSending(true)

    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 120000)
      const apiMessages = [
        { role: 'system', content: buildSystemPrompt(selectedCharacter) },
        ...nextMessages
          .filter((message) => message.sender !== 'system')
          .map((message) => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text,
          })),
      ]
      const response =
        apiMode === 'local'
          ? await fetch('/ollama/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                model: activeModel,
                stream: false,
                options: { temperature: 0.84, top_p: 0.92 },
                messages: apiMessages,
              }),
            })
          : await fetch(openRouterEndpoint, {
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
                messages: apiMessages,
              }),
            })
      window.clearTimeout(timeout)

      if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
      const data = await response.json()
      const answer = (apiMode === 'local' ? data.message?.content : data.choices?.[0]?.message?.content)?.trim()
      if (!answer) throw new Error('빈 답변')

      setSessions((current) => ({
        ...current,
        [selectedCharacter.id]: [...nextMessages, newMessage('assistant', answer)],
      }))
      setModelState('ready')
      setModelMessage(`${activeModel} 모델이 정상 답변했습니다.`)
    } catch {
      const failure = [
        '모델 답변을 받지 못했습니다.',
        `현재 연결 방식: ${apiMode === 'local' ? '로컬 Ollama' : '원격 OpenRouter'}`,
        `현재 선택 모델: ${apiMode === 'local' ? activeModel : remoteModel}`,
        apiMode === 'local'
          ? '32B 모델은 PC 메모리가 부족하면 Ollama가 내려갈 수 있습니다.'
          : '원격 API 키, 모델 이름, 무료 사용 한도를 확인해 주세요.',
      ].join('\n')
      setSessions((current) => ({
        ...current,
        [selectedCharacter.id]: [...nextMessages, newMessage('system', failure)],
      }))
      setModelState('error')
      setModelMessage('답변 생성 중 연결이 끊겼습니다. 모델이 너무 무거울 수 있습니다.')
    } finally {
      setIsSending(false)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  async function testModelResponse() {
    setModelState('checking')
    setModelMessage(`${apiMode === 'local' ? activeModel : remoteModel} 모델에 짧은 답변을 요청하는 중입니다.`)
    try {
      if (apiMode === 'openrouter' && !remoteApiKey.trim()) {
        throw new Error('API 키 없음')
      }
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 90000)
      const testMessages = [
        { role: 'system', content: '한국어로 한 문장만 답하는 챗봇입니다.' },
        { role: 'user', content: '정상적으로 답변되는지 짧게 말해줘.' },
      ]
      const response =
        apiMode === 'local'
          ? await fetch('/ollama/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                model: activeModel,
                stream: false,
                messages: testMessages,
              }),
            })
          : await fetch(openRouterEndpoint, {
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
                messages: testMessages,
              }),
            })
      window.clearTimeout(timeout)
      if (!response.ok) throw new Error('응답 오류')
      const data = await response.json()
      const answer = (apiMode === 'local' ? data.message?.content : data.choices?.[0]?.message?.content)?.trim()
      if (!answer) throw new Error('빈 답변')
      setModelState('ready')
      setModelMessage(`답변 테스트 성공: ${answer.slice(0, 70)}`)
    } catch {
      setModelState('error')
      setModelMessage('답변 테스트 실패. Ollama가 꺼졌거나 현재 모델이 이 PC에 너무 무거울 수 있습니다.')
    }
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
            ‹
          </button>
          <div>
            <strong>{selectedCharacter.title}</strong>
            <span className={modelState}>{isSending ? '답변 작성 중' : activeModel}</span>
          </div>
          <button type="button" onClick={() => toggleFavorite(selectedCharacter.id)} aria-label="즐겨찾기">
            {favorites.includes(selectedCharacter.id) ? '♥' : '♡'}
          </button>
        </header>

        <section className="profile-strip">
          <img src={assetPath(selectedCharacter.image)} alt="" />
          <div>
            <p>{selectedCharacter.subtitle}</p>
            <small>@{selectedCharacter.author} · {selectedCharacter.tone}</small>
          </div>
        </section>

        <section className="chat-log" aria-live="polite">
          {currentMessages.map((message) => (
            <article className={`bubble ${message.sender}`} key={message.id}>
              <p>{message.text}</p>
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
          {['지금 무슨 생각해?', '조금 더 솔직하게 말해줘', '분위기를 이어가줘'].map((reply) => (
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
            placeholder="캐릭터에게 말을 걸어보세요."
          />
          <button type="submit" disabled={!draft.trim() || isSending}>
            전송
          </button>
        </form>
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
            ⌕
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
              <strong>{modelState === 'ready' ? '모델 설치됨' : '모델 확인 필요'}</strong>
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
                로컬 Ollama
              </button>
              <button className={apiMode === 'openrouter' ? 'active' : ''} type="button" onClick={() => setApiMode('openrouter')}>
                원격 API
              </button>
            </div>

            {apiMode === 'local' ? (
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
            ) : (
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
                  원격 모델 이름
                  <input value={remoteModel} onChange={(event) => setRemoteModel(event.target.value)} placeholder="openrouter/auto" />
                </label>
                <p>배포된 앱은 무료 서버에서 모델을 직접 돌리지 않습니다. 대신 OpenRouter 같은 원격 API 키를 넣으면 답변이 동작합니다.</p>
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
              ×
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
          <span>⌂</span>
          홈
        </button>
        <button className={tab === 'chats' ? 'active' : ''} type="button" onClick={() => setTab('chats')}>
          <span>●●●</span>
          대화
        </button>
        <button className={tab === 'create' ? 'active' : ''} type="button" onClick={() => setTab('create')}>
          <span>＋</span>
          제작
        </button>
        <button className={tab === 'my' ? 'active' : ''} type="button" onClick={() => setTab('my')}>
          <span>♟</span>
          마이페이지
        </button>
      </nav>
    </main>
  )
}

export default App
